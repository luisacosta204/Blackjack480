// frontend/src/api/auth.ts
import { api, setToken, clearToken } from './client';

export type MeResponse = {
  id: number | string;
  username?: string;
  email?: string;
};

export async function login(identifier: string, password: string) {
  const { token } = await api<{ token: string; user?: unknown }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setToken(token);
  return token;
}

export async function register(username: string, email: string, password: string) {
  const { token } = await api<{ token: string; user?: unknown }>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  setToken(token);
  return token;
}

export async function me() {
  return api<MeResponse>('/api/me', { method: 'GET' });
}

export function logout() {
  clearToken();
}
