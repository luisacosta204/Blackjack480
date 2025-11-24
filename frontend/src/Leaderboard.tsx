import { useEffect, useMemo, useState } from 'react';
import { api } from './api/client';
import { me } from './api/auth';

type Row = {
  username: string;
  wins: number;
  losses: number;
  score: number;
  last_played: string | null;
};

type Range = 'all' | 'week' | 'day';

export default function Leaderboard() {
  const [range, setRange] = useState<Range>('all');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username?: string } | null>(null);

  async function loadUser() {
    try {
      const u = await me();
      setCurrentUser({ username: u?.username });
    } catch {
      setCurrentUser(null);
    }
  }

  async function load(range: Range) {
    setLoading(true);
    setErr(null);
    try {
      // backend: GET /api/leaderboard?range=all|week|day
      const data = await api(`/api/leaderboard?range=${range}`);
      setRows(data as Row[]);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load leaderboard');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { load(range); }, [range]);

  const myUsername = currentUser?.username;
  const myRowIndex = useMemo(() => {
    if (!rows || !myUsername) return -1;
    return rows.findIndex(r => r.username === myUsername);
  }, [rows, myUsername]);

  return (
    <div style={styles.shell}>
      <div style={styles.headerBar}>
        <div>
          <h2 style={{margin:'0 0 6px'}}>Leaderboard</h2>
          <p style={{margin:0, color:'#a1a1aa'}}>Top players by total score</p>
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <RangeTabs value={range} onChange={(r)=>setRange(r)} />
          <button onClick={()=>load(range)} style={styles.btn}>Refresh</button>
        </div>
      </div>

      {loading && <div style={styles.note}>Loading…</div>}
      {err && <div style={{...styles.note, color:'#ff6b6b'}}>{err}</div>}

      {!!rows && rows.length === 0 && !loading && !err && (
        <div style={styles.note}>No results yet. Play a round to get on the board!</div>
      )}

      {!!rows && rows.length > 0 && (
        <div style={{overflowX:'auto'}}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Player</th>
                <th style={styles.thNum}>Wins</th>
                <th style={styles.thNum}>Losses</th>
                <th style={styles.thNum}>Score</th>
                <th style={styles.th}>Last Played</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isMe = r.username === myUsername;
                return (
                  <tr key={r.username} style={isMe ? styles.trMe : undefined}>
                    <td style={styles.tdNum}>{i+1}</td>
                    <td style={styles.td}>{r.username}{isMe && <span style={styles.mePill}>you</span>}</td>
                    <td style={styles.tdNum}>{r.wins ?? 0}</td>
                    <td style={styles.tdNum}>{r.losses ?? 0}</td>
                    <td style={{...styles.tdNum, fontWeight:700}}>{r.score ?? 0}</td>
                    <td style={styles.td}>{formatWhen(r.last_played)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {myRowIndex === -1 && myUsername && (
        <div style={{...styles.note, marginTop:12}}>
          You’re not in the top 50 {rangeLabel(range)} yet. Keep playing!
        </div>
      )}
    </div>
  );
}

function RangeTabs({ value, onChange }: { value: Range, onChange: (r: Range)=>void }) {
  return (
    <div style={styles.tabs}>
      {(['all','week','day'] as Range[]).map(r => (
        <button
          key={r}
          onClick={()=>onChange(r)}
          style={r===value ? styles.tabActive : styles.tab}
        >
          {r === 'all' ? 'All-time' : r === 'week' ? 'This Week' : 'Today'}
        </button>
      ))}
    </div>
  );
}

function formatWhen(ts: string | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function rangeLabel(r: Range) {
  return r === 'all' ? '(all-time)' : r === 'week' ? '(this week)' : '(today)';
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    maxWidth: 960,
    margin: '24px auto',
    padding: '0 16px',
    fontFamily: 'system-ui, sans-serif',
    color: '#e5e7eb',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems:'center',
    marginBottom: 12,
  },
  btn: {
    padding:'8px 12px',
    borderRadius:8,
    border:'1px solid #2f2f33',
    background:'#1f2937',
    color:'#e5e7eb',
    cursor:'pointer'
  },
  note: {
    background:'#0f172a',
    border:'1px solid #263046',
    padding:'12px 14px',
    borderRadius:10
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    background:'#0b0f14',
    border:'1px solid #1f2837',
    borderRadius:12,
    overflow:'hidden' as const,
  },
  th: {
    textAlign:'left' as const,
    padding:'10px 12px',
    fontWeight:700,
    color:'#9aa4a8',
    borderBottom:'1px solid #1f2837',
    whiteSpace:'nowrap' as const,
  },
  thNum: {
    textAlign:'right' as const,
    padding:'10px 12px',
    fontWeight:700,
    color:'#9aa4a8',
    borderBottom:'1px solid #1f2837',
    whiteSpace:'nowrap' as const,
  },
  td: {
    padding:'10px 12px',
    borderBottom:'1px solid #151b24',
  },
  tdNum: {
    padding:'10px 12px',
    borderBottom:'1px solid #151b24',
    textAlign:'right' as const,
  },
  trMe: {
    background:'linear-gradient(90deg, rgba(34,197,94,0.12), transparent 60%)'
  },
  tabs: {
    display:'flex',
    background:'#0b0f14',
    border:'1px solid #1f2837',
    borderRadius:10,
    overflow:'hidden'
  },
  tab: {
    padding:'6px 10px',
    border:'none',
    background:'transparent',
    color:'#9aa4a8',
    cursor:'pointer'
  },
  tabActive: {
    padding:'6px 10px',
    border:'none',
    background:'#1f2937',
    color:'#e5e7eb',
    cursor:'pointer'
  },
  mePill: {
    marginLeft:8,
    padding:'2px 6px',
    borderRadius:999,
    background:'#22c55e22',
    border:'1px solid #22c55e55',
    color:'#a7f3d0',
    fontSize:12,
    fontWeight:700,
    textTransform:'uppercase' as const,
    letterSpacing:0.3
  }
};
