import { useState, useEffect } from 'react';
import { login, register, me, logout } from './api/auth';
import GameStub from './GameStub';
import Leaderboard from './Leaderboard';

export default function App() {
  const [mode, setMode] = useState<'login' | 'register' | 'game' | 'leaderboard'>('login');
  const [identifier, setIdentifier] = useState(''); // email or username (for login)
  const [username, setUsername] = useState('');     // for register
  const [email, setEmail] = useState('');           // for register
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  async function refreshMe() {
    try {
      const u = await me();
      setUser(u);
      setStatus('');
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Signing in…');
    try {
      await login(identifier, password);
      await refreshMe();
      setStatus('Signed in!');
    } catch {
      setStatus('Login failed');
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Creating account…');
    try {
      await register(username, email, password);
      await refreshMe();
      setStatus('Account created!');
    } catch {
      setStatus('Registration failed');
    }
  }

  // Logged-in screen
  if (user) {
    return (
      <div style={styles.shell}>
        <h1>Welcome 🎉</h1>
        <p>Logged in as <b>{user.username}</b></p>

        <div style={{display:'flex', gap:12, justifyContent:'center', marginTop:8}}>
          <a href="#game" onClick={(e)=>{e.preventDefault(); setMode('game');}}>Game</a>
          <a href="#leaderboard" onClick={(e)=>{e.preventDefault(); setMode('leaderboard');}}>Leaderboard</a>
        </div>

        {(mode === 'game') && <GameStub />}
        {(mode === 'leaderboard') && <Leaderboard />}

        <button style={styles.btn} onClick={() => { logout(); setUser(null); }}>
          Log out
        </button>
      </div>
    );
  }

  // Login/Register screen
  return (
    <div style={styles.shell}>
      <h1>Blackjack 21</h1>
      <div style={{display:'flex', gap:8, marginBottom:12, justifyContent:'center'}}>
        <button style={mode==='login'?styles.btnPrimary:styles.btn} onClick={()=>setMode('login')}>
          Sign In
        </button>
        <button style={mode==='register'?styles.btnPrimary:styles.btn} onClick={()=>setMode('register')}>
          Create Account
        </button>
      </div>

      {mode==='login' ? (
        <form onSubmit={onLogin} style={styles.card}>
          <input
            style={styles.input}
            placeholder="email or username"
            value={identifier}
            onChange={e=>setIdentifier(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
          />
          <button style={styles.btnPrimary} type="submit">
            Sign In
          </button>
        </form>
      ) : (
        <form onSubmit={onRegister} style={styles.card}>
          <input
            style={styles.input}
            placeholder="username"
            value={username}
            onChange={e=>setUsername(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
          />
          <button style={styles.btnPrimary} type="submit">
            Create Account
          </button>
        </form>
      )}

      {!!status && <p>{status}</p>}
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
  card: {
    display:'flex',
    flexDirection:'column',
    gap:10,
    background:'#1e1e1e',
    padding:16,
    borderRadius:12
  },
  input: {
    padding:'10px 12px',
    borderRadius:8,
    border:'1px solid #333',
    background:'#111',
    color:'#eee'
  },
  btn: {
    padding:'10px 12px',
    borderRadius:8,
    border:'1px solid #333',
    background:'#222',
    color:'#eee',
    cursor:'pointer'
  },
  btnPrimary: {
    padding:'10px 12px',
    borderRadius:8,
    border:'none',
    background:'#22c55e',
    color:'#0a0a0a',
    cursor:'pointer',
    fontWeight:700
  }
};
