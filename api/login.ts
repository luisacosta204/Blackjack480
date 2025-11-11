import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool } from "./_lib/db";
import { compare } from "./_lib/hash";
import { signJWT } from "./_lib/jwt";
import { withCors } from "./_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (withCors(res)) return;
    if (req.method !== "POST") return res.status(405).end();

    const { email, password } = req.body || {};
    if (!email || !password)
        return res.status(400).json({ error: "Missing fields" });

    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            "SELECT id, username, password_hash FROM users WHERE email=$1 OR username=$1 LIMIT 1",
            [email]
        );
        if (!rows[0]) return res.status(401).json({ error: "Invalid credentials" });

        const ok = await compare(password, rows[0].password_hash);
        if (!ok) return res.status(401).json({ error: "Invalid credentials" });

        const token = signJWT({ uid: rows[0].id, u: rows[0].username });
        res.setHeader(
            "Set-Cookie",
            `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
        );
        return res
            .status(200)
            .json({ ok: true, user: { id: rows[0].id, username: rows[0].username } });
    } finally {
        client.release();
    }
}
