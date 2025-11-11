import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool } from "./_lib/db";
import { hash } from "./_lib/hash";
import { signJWT } from "./_lib/jwt";
import { withCors } from "./_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (withCors(res)) return;
    if (req.method !== "POST") return res.status(405).end();

    const { username, email, password } = req.body || {};
    if (!username || !email || !password)
        return res.status(400).json({ error: "Missing fields" });

    const client = await pool.connect();
    try {
        const exists = await client.query(
            "SELECT id FROM users WHERE email=$1 OR username=$2",
            [email, username]
        );
        if (exists.rowCount) return res.status(409).json({ error: "User exists" });

        const pwHash = await hash(password);
        const { rows } = await client.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username",
            [username, email, pwHash]
        );

        const token = signJWT({ uid: rows[0].id, u: rows[0].username });
        res.setHeader(
            "Set-Cookie",
            `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
        );
        return res.status(201).json({ ok: true, user: rows[0] });
    } finally {
        client.release();
    }
}
