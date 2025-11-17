import { useEffect, useState } from 'react';
import { me, logout } from './api/auth';
import Leaderboard from './Leaderboard';
import LoginPage from './pages/Login';
import Home from './pages/Home';
import Blackjack from './pages/Blackjack';

type User = {
  id: number | string;
  username?: string;
  email?: string;
};

export default function App() {
  const [checked, setChecked] = useState(false); // have we checked auth yet?
  const [authed, setAuthed] = useState(false);   // logged-in?
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'home' | 'blackjack' | 'leaderboard'>('home');

  async function refreshMe() {
    try {
      const u = await me();
      setUser(u as User);
      setAuthed(true);
      setMode('home'); // land on Home after auth
    } catch {
      setUser(null);
      setAuthed(false);
    } finally {
      setChecked(true);
    }
  }

  useEffect(() => { refreshMe(); }, []);

  function handleLogout() {
    logout();
    setUser(null);
    setAuthed(false);
    setMode('home');
  }

  // While we don't know auth state yet, render nothing (or a spinner if you want)
  if (!checked) return null;

  // Not authenticated -> show the React-ified login page
  if (!authed) {
    return (
      <LoginPage
        onAuthed={async () => {
          await refreshMe();
        }}
      />
    );
  }

  // Authenticated -> show app views
  if (mode === 'home') {
    return (
      <Home
        onPlayBlackjack={() => setMode('blackjack')}
        onViewLeaderboard={() => setMode('leaderboard')}
        onViewProfile={() => { /* optional later */ }}
      />
    );
  }

  if (mode === 'blackjack') {
    return <Blackjack onBack={() => setMode('home')} />;
  }

  // mode === 'leaderboard'
  return (
    <div style={styles.shell}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div>
          <h1 style={{margin:'0 0 6px'}}>Leaderboard</h1>
          <div>Logged in as <b>{user?.username ?? user?.email ?? 'player'}</b></div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button style={styles.btn} onClick={() => setMode('home')}>Back to Home</button>
          <button style={styles.btn} onClick={handleLogout}>Log out</button>
        </div>
      </div>
      <Leaderboard />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    maxWidth: 960,
    margin: '40px auto',
    padding: '0 16px',
    fontFamily: 'system-ui, sans-serif',
    color: '#eee',
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
