import { api } from './client';

export function recordGameResult(won: boolean, delta: number) {
  return api('/api/game/result', {
    method: 'POST',
    body: JSON.stringify({ won, delta }),
  });
}
