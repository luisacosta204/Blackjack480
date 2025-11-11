import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyJWT } from "./_lib/jwt";
import { withCors } from "./_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (withCors(res)) return;

    const cookie = req.headers.cookie || "";
    const m = cookie.match(/(?:^|;\s*)session=([^;]+)/);
    if (!m) return res.status(401).json({ auth: false });

    try {
        const data = verifyJWT(m[1]);
        return res.json({ auth: true, user: data });
    } catch {
        return res.status(401).json({ auth: false });
    }
}
