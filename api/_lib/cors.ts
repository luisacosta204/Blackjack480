const ALLOWED = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

export function withCors(res: any) {
    const origin = res.req.headers.origin;
    if (origin && ALLOWED.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "content-type,authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (res.req.method === "OPTIONS") {
        res.status(204).end();
        return true;
    }
    return false;
}
