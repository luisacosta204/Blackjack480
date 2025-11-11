import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
export const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: true }
        : process.env.PGSSLMODE
            ? false
            : undefined,
});

