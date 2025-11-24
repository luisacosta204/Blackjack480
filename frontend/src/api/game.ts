// frontend/src/api/game.ts
const API = "https://blackjack480.onrender.com"; // your Render backend

function getToken() {
  return localStorage.getItem("bj21.token") || "";
}

export async function reportResult(won: boolean, delta: number) {
  const token = getToken();
  if (!token) {
    console.warn("[reportResult] no token -> guest round not reported");
    return;
  }

  const url = `${API}/api/game/result`;
  const body = { won: !!won, delta: Math.trunc(delta) };

  console.log("[reportResult] POST", url, body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[reportResult] failed", res.status, text);
      return;
    }

    console.log("[reportResult] ok");
  } catch (err) {
    console.error("[reportResult] network error", err);
  }
}

// optional: run manually in DevTools
// window._bjReport = reportResult as any;
