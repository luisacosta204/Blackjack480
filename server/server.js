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
    `);
    console.log('DB schema OK.');
  } catch (e) {
    console.error('Schema init failed:', e);
  }
}

ensureSchema();

// ----- CORS -----
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (curl/Postman) and same-origin
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: ${origin} not allowed`), false);
    },
    credentials: true,
  })
);

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

// DB connectivity health check (useful while configuring Supabase / SSL)
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
    const { identifier, password } = req.body || {}; // identifier can be email OR username
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

// Example protected write route to change credits later if needed
// app.post('/api/credits/set', async (req, res) => { ... })

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
