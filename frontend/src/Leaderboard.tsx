import { useEffect, useState } from 'react';
import { getLeaderboard } from './api/leaderboard';
import type { LBRange } from './api/leaderboard';

export default function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<LBRange>('all');

  useEffect(() => {
    getLeaderboard(range).then(setRows).catch(() => setRows([]));
  }, [range]);

  return (
    <div style={s.shell}>
      <h2>Leaderboard</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['all', 'week', 'day'] as LBRange[]).map((r) => (
          <button
            key={r}
            style={range === r ? s.btnPrimary : s.btn}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th>User</th><th>Wins</th><th>Losses</th><th>Score</th><th>Last Played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.username}</td>
              <td>{r.wins}</td>
              <td>{r.losses}</td>
              <td>{r.score}</td>
              <td>{r.last_played ? new Date(r.last_played).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { maxWidth: 720, margin: '40px auto', color: '#eee', fontFamily: 'system-ui, sans-serif' },
  btn: { padding: '8px 12px', background: '#222', border: '1px solid #444', borderRadius: 8, color: '#eee', cursor: 'pointer' },
  btnPrimary: { padding: '8px 12px', background: '#22c55e', border: 'none', borderRadius: 8, color: '#0a0a0a', cursor: 'pointer', fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', border: '1px solid #333' },
};
