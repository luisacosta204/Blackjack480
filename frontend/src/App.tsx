import { useEffect, useState } from 'react';
import { me, logout } from './api/auth';
import Leaderboard from './Leaderboard';
import LoginPage from './pages/Login';
import Home from './pages/Home';
import Blackjack from './pages/Blackjack';
import Profile from './pages/Profile'; // ⬅ NEW

type User = {
  id: number | string;
  username?: string;
  email?: string;
  credits?: number; // ⬅ helpful for Profile + Home
};

// All the screens we can show
type Mode = 'home' | 'blackjack' | 'leaderboard' | 'profile';

export default function App() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>('home');

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

  useEffect(() => {
    refreshMe();
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
    setAuthed(false);
    setMode('home');
  }

  if (!checked) return null;

  if (!authed) {
    return (
      <LoginPage
        onAuthed={async () => {
          await refreshMe();
        }}
        // optional: you *could* wire guest mode here later with onGuest
      />
    );
  }

  // --------- HOME ----------
  if (mode === 'home') {
    return (
      <Home
        user={user}
        onPlayBlackjack={() => setMode('blackjack')}
        onViewLeaderboard={() => setMode('leaderboard')}
        onViewProfile={() => setMode('profile')}   // ⬅ NOW DOES SOMETHING
      />
    );
  }

  // --------- BLACKJACK ----------
  if (mode === 'blackjack') {
    return <Blackjack user={user} onBack={() => setMode('home')} />;
  }

  // --------- PROFILE ----------
  if (mode === 'profile') {
    return (
      <Profile
        user={user}
        onBackToHome={() => setMode('home')}
      />
    );
  }

  // --------- LEADERBOARD (fallback) ----------
  return (
    <div style={styles.shell}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px' }}>Leaderboard</h1>
          <div>
            Logged in as{' '}
            <b>{user?.username ?? user?.email ?? 'player'}</b>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.btn} onClick={() => setMode('home')}>
            Back to Home
          </button>
          <button style={styles.btn} onClick={handleLogout}>
            Log out
          </button>
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
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    background: '#222',
    color: '#eee',
    cursor: 'pointer',
  },
};
