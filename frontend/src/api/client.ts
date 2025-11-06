const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function getToken() { return localStorage.getItem('token'); }
export function setToken(t: string) { localStorage.setItem('token', t); }
export function clearToken() { localStorage.removeItem('token'); }

export async function api<T = any>(path: string, init: RequestInit = {}) {
  // Use a simple record so we can mutate headers safely
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // Handle 204/empty body gracefully
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new Error(await res.text());

  return res.json() as Promise<T>;
}
