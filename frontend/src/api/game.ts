// frontend/src/api/game.ts
import { api } from "./client";

// Report one round's result (net chip delta). Requires auth token handled by client.ts
export function reportResult(won: boolean, delta: number) {
  // If not logged in, api() will still include no Authorization; server will 401 and we can ignore.
  return api("/api/game/result", {
    method: "POST",
    body: JSON.stringify({ won, delta }),
  }).catch(() => {
    // It's fine if the user plays as guest — just ignore errors.
  });
}
