import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const app = express();

// ---- DB schema bootstrap (runs once on start) ----
async function ensureSchema() {
  try {
    await pool.query(`
      -- Users table with default starting credits (500)
      create table if not exists public.users (
        id serial primary key,
        username text not null unique,
        email text not null unique,
        password_hash text not null,
        credits int not null default 500,
        created_at timestamptz not null default now()
      );

      -- Game results to power leaderboard
      create table if not exists public.game_results (
        id serial primary key,
        user_id int not null references public.users(id) on delete cascade,
        won boolean not null,
        delta int not null,
        created_at timestamptz not null default now()
      );
      create index if not exists idx_game_results_user_created
        on public.game_results(user_id, created_at desc);
    `);
    console.log('DB schema OK.');
  } catch (e) {
    console.error('Schema init failed:', e);
  }
}
ensureSchema();

// ----- CORS (tighten to prod + local dev) -----
const allowedOrigins = [
  'https://blackjack480.vercel.app', // prod frontend
  'http://localhost:5173',           // Vite dev
];

app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin/no-origin (curl, health checks) and the whitelist above
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 204,
}));
app.options('*', cors());

// Parse JSON bodies (required for register/login/result)
app.use(express.json());

// ----- Helpers -----
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
}
async function getUserByIdentifier(identifier) {
  const q = await pool.query(
    `select id, username, email, password_hash, credits
     from users
     where email = $1 or username = $1
     limit 1`,
    [identifier]
  );
  return q.rows[0];
}

// ----- Health Routes -----
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.get('/api/health/db', async (_req, res) => {
  try {
    const r = await pool.query('select 1 as ok');
    res.json({ ok: r.rows[0]?.ok === 1 });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ error: 'db not ok', detail: e.message });
  }
});

// ----- Auth Routes -----
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing username, email, or password' });
    }
    const hash = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `insert into users (username, email, password_hash)
       values ($1, $2, $3)
       returning id, username, credits`,
      [username, email, hash]
    );
    const user = insert.rows[0];
    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await getUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, credits: user.credits } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const q = await pool.query('select id, username, credits from users where id = $1', [payload.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'User not found' });

    res.json(q.rows[0]);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ----- Game / Leaderboard Routes -----
// Record a finished round (won/lose and how much credits changed)
app.post('/api/game/result', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET);
    const { won, delta } = req.body || {};
    if (typeof won !== 'boolean' || typeof delta !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await pool.query(
      `insert into game_results (user_id, won, delta) values ($1, $2, $3)`,
      [userId, won, delta]
    );

    // Update user credits
    await pool.query(`update users set credits = credits + $1 where id = $2`, [delta, userId]);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leaderboard (all-time | week | day)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const range = String(req.query.range || 'all'); // 'all' | 'week' | 'day'
    let where = '';
    if (range === 'week') where = `where gr.created_at >= now() - interval '7 days'`;
    if (range === 'day')  where = `where gr.created_at >= now() - interval '1 day'`;

    const q = await pool.query(
      `
      select
        u.username,
        sum(case when gr.won then 1 else 0 end) as wins,
        sum(case when gr.won then 0 else 1 end) as losses,
        sum(gr.delta) as score,
        max(gr.created_at) as last_played
      from game_results gr
      join users u on u.id = gr.user_id
      ${where}
      group by u.username
      order by score desc nulls last, wins desc
      limit 50
      `
    );
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
