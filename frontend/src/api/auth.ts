import { api, setToken, clearToken } from "./client";

export type MeResponse = {
  id: number | string;
  username?: string;
  email?: string;
  credits?: number; // <-- important
};

/** Login with email OR username + password */
export async function login(identifier: string, password: string) {
  const { token } = await api<{ token: string }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  setToken(token);
  return token;
}

/** Register then auto-login */
export async function register(username: string, email: string, password: string) {
  const { token } = await api<{ token: string }>("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  setToken(token);
  return token;
}

/** Get the current user (uses bearer token from localStorage) */
export async function me() {
  // NOTE: your `api` helper attaches the token automatically
  return api<MeResponse>("/api/me", { method: "GET" });
}

/** Clear the token locally */
export function logout() {
  clearToken();
}
