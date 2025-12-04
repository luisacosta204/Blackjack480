import { useEffect, useState } from 'react';
import { login, register, me } from '../api/auth';
import '../styles/global.css'; // make sure styles apply to this page

type Props = {
  onAuthed: () => void;
  onGuest?: () => void; // optional: where to go on "Continue as Guest"
};

export default function LoginPage({ onAuthed, onGuest }: Props) {
  // login/register toggle
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // form fields
  const [identifier, setIdentifier] = useState(''); // email or username (login)
  const [email, setEmail] = useState('');           // register
  const [username, setUsername] = useState('');     // register
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // UI state
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // If already logged in, bounce straight through
  useEffect(() => {
    (async () => {
      try {
        await me();
        onAuthed();
      } catch {
        /* not logged in */
      }
    })();
  }, [onAuthed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    setBusy(true);
    try {
      if (mode === 'login') {
        if (!identifier || !password) throw new Error('Please fill out all fields.');
        await login(identifier, password);
      } else {
        if (!username || !email || !password) throw new Error('Please fill out all fields.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        await register(username, email, password);
      }
      onAuthed();
    } catch (err: any) {
      setStatus(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleGuest() {
    if (onGuest) onGuest();
    else window.location.href = '/'; // fallback: navigate home
  }

  return (
    <div className="page-shell">
      <div className="page-shell-inner">
        <main
          className="login-shell main-shell"
          aria-labelledby="page-title"
          role="main"
          style={{
            maxWidth: '980px',
            margin: '60px auto',
            alignItems: 'stretch'
          }}
        >
          {/* Brand / Visual side */}
          <section
            className="brand-panel"
            aria-label="Blackjack 21 branding"
            style={{ padding: 24 }}
          >
            <div className="brand-grid" aria-hidden="true"></div>

            <div
              className="logo"
              role="img"
              aria-label="Blackjack 21 logo"
              style={{ marginBottom: 20 }}
            >
              <div className="chip">21</div>
              <div>
                <h1 id="page-title" className="logo-title">
                  Blackjack 21
                </h1>
                <div className="logo-sub">Play smart. Hit the table.</div>
              </div>
            </div>

            <div className="card-fan animate-float" aria-hidden="true">
              <div className="card is-1">
                <div className="corner">
                  <span className="pip">A♠</span>
                </div>
                <div className="center">♠</div>
                <div className="bottom">
                  <span className="pip">A♠</span>
                </div>
              </div>
              <div className="card is-2">
                <div className="corner">
                  <span className="pip red">K♥</span>
                </div>
                <div className="center">♥</div>
                <div className="bottom">
                  <span className="pip red">K♥</span>
                </div>
              </div>
              <div className="card is-3">
                <div className="corner">
                  <span className="pip">J♣</span>
                </div>
                <div className="center">♣</div>
                <div className="bottom">
                  <span className="pip">J♣</span>
                </div>
              </div>
            </div>
          </section>

          {/* Login/Register form side */}
          <section className="panel" aria-label="Login form">
            <h2 className="panel-header">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="panel-subtle">
              {mode === 'login'
                ? 'Sign in to your Blackjack 21 account to continue.'
                : 'Create your Blackjack 21 account.'}
            </p>

            {/* Status / errors */}
            {status && (
              <div
                className="error"
                role="alert"
                aria-live="polite"
                style={{ display: 'block' }}
              >
                {status}
              </div>
            )}

            <form className="form" onSubmit={handleSubmit} noValidate>
              {mode === 'login' ? (
                <>
                  <div className="field">
                    <label htmlFor="identifier">Email or username</label>
                    <div className="input-wrap">
                      <input
                        id="identifier"
                        name="identifier"
                        type="text"
                        inputMode="email"
                        autoComplete="username"
                        placeholder="you@casino.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="username">Username</label>
                    <div className="input-wrap">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="playerOne"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <div className="input-wrap">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@casino.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    aria-required="true"
                  />
                  <button
                    className="icon"
                    type="button"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    title={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="cluster" style={{ justifyContent: 'space-between' }}>
                <label className="checkbox">
                  <input type="checkbox" id="remember" name="remember" />
                  <span>Remember me</span>
                </label>

                <a
                  className="mutelink"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode((m) => (m === 'login' ? 'register' : 'login'));
                  }}
                >
                  {mode === 'login'
                    ? 'Need an account? Register'
                    : 'Have an account? Log in'}
                </a>
              </div>

              <button className="btn" type="submit" disabled={busy}>
                {busy
                  ? mode === 'login'
                    ? 'Signing in…'
                    : 'Creating…'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleGuest}
              >
                Continue as Guest
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
