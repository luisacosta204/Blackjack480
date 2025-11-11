import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET!;
export function signJWT(payload: object) {
    return jwt.sign(payload, secret, { expiresIn: "7d" });
}
export function verifyJWT<T = any>(token: string): T {
    return jwt.verify(token, secret) as T;
}
