// server/db.js
import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL; // render env

export const pool = new Pool({
  connectionString,
  // Required when connecting to Supabase from Render/other hosts
  ssl: { rejectUnauthorized: false },
  // Optional tuning for pooled connections
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Optional: quick startup check (prints to Render logs)
pool.query('select 1').then(() => {
  console.log('DB connection OK');
}).catch(err => {
  console.error('DB connection FAILED:', err.message);
});
