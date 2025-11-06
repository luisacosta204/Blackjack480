import pkg from 'pg';
const { Pool } = pkg;

// Some hosted Postgres (like Supabase) needs SSL in Node.
// This enables SSL automatically if the host looks like Supabase.
const ssl =
  process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl
});
