import { useEffect, useState } from 'react';
import { me, logout } from './api/auth';
import GameStub from './GameStub';
import Leaderboard from './Leaderboard';
import LoginPage from './pages/Login';

type User = {
  id: number | string;
  username?: string;
  email?: string;
};

export default function App() {
  const [checked, setChecked] = useState(false);               // have we checked auth yet?
  const [authed, setAuthed] = useState(false);                 // logged-in?
  const [user, setUser] = useState<User | null>(null);         // current user
  const [mode, setMode] = useState<'game' | 'leaderboard'>('game');

  async function refreshMe() {
    try {
      const u = await me();
      setUser(u as User);
      setAuthed(true);
    } catch {
      setUser(null);
      setAuthed(false);
    } finally {
      setChecked(true);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
    setAuthed(false);
    setMode('game');
  }

  // While we don't know auth state yet, render nothing (or a spinner if you want)
  if (!checked) return null;

  // Not authenticated -> show the React-ified login page
  if (!authed) {
    return (
      <LoginPage
        onAuthed={async () => {
          // After successful login/register, fetch the user and proceed
          await refreshMe();
        }}
      />
    );
  }

  // Authenticated -> show your app views
  return (
    <div style={styles.shell}>
      <h1>Welcome</h1>
      <p>Logged in as <b>{user?.username ?? user?.email ?? 'player'}</b></p>

      <div style={{display:'flex', gap:12, justifyContent:'center', marginTop:8}}>
        <a href="#game" onClick={(e)=>{e.preventDefault(); setMode('game');}}>Game</a>
        <a href="#leaderboard" onClick={(e)=>{e.preventDefault(); setMode('leaderboard');}}>Leaderboard</a>
      </div>

      {mode === 'game' && <GameStub />}
      {mode === 'leaderboard' && <Leaderboard />}

      <button style={styles.btn} onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    maxWidth: 720,
    margin: '64px auto',
    fontFamily: 'system-ui, sans-serif',
    color: '#eee',
    textAlign:'center'
  },
  btn: {
    padding:'10px 12px',
    borderRadius:8,
    border:'1px solid #333',
    background:'#222',
    color:'#eee',
    cursor:'pointer'
  }
};
