// api/game.ts
const API = import.meta.env.VITE_API_BASE_URL;

export async function reportResult(won: boolean, delta: number) {
  // Only report if the player is authenticated (token saved by login/register)
  const token = localStorage.getItem('bj21.token');
  if (!token) return;

  await fetch(`${API}/api/game/result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ won, delta }),
  });
}

// Back-compat for any old imports (e.g., GameStub.tsx)
export const recordGameResult = reportResult;
