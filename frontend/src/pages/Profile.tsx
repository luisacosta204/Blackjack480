// frontend/src/pages/Profile.tsx
import '../styles/global.css';
import '../styles/header-user.css';
import { useEffect, useState } from 'react';

type User = { username?: string; email?: string; credits?: number } | null;

type Props = {
  user: User;
  onBackToHome: () => void;
};

const AVATARS = [
  '/assets/avatars/Flower.png',
  '/assets/avatars/Hot Streak.png',
  '/assets/avatars/robot.png',
  '/assets/avatars/silly_cat.png'
  '/assets/avatars/Dollarydoos.png'
  '/assets/avatars/galaxy_spade.png'
];

export default function Profile({ user, onBackToHome }: Props) {
  const [displayName, setDisplayName] = useState('Guest');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // hydrate from user + localStorage (same keys used elsewhere)
  useEffect(() => {
    const storedName = localStorage.getItem('bj21.username');
    const initialName = user?.username || storedName || 'Guest';
    setDisplayName(initialName);

    const storedEmail = localStorage.getItem('bj21.email');
    const initialEmail = user?.email || storedEmail || '';
    setEmail(initialEmail);

    const storedAvatar = localStorage.getItem('bj21.avatar');
    const initialAvatar = storedAvatar || AVATARS[0];
    setAvatar(initialAvatar);
  }, [user]);

  function handleSaveProfile() {
    localStorage.setItem('bj21.username', displayName);
    if (email) {
      localStorage.setItem('bj21.email', email);
    }
    localStorage.setItem('bj21.avatar', avatar);
    setPickerOpen(false);
  }

  return (
    <div className="page-shell">
      <div className="page-shell-inner">
        {/* Header bar – same structure as Home, just with a Back button */}
        <header
          className="header"
          style={{ position: 'static', width: '100%' }}
        >
          <div className="left user-info">
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setPickerOpen(true)}
            >
              <img src={avatar} alt="Profile avatar" />
            </button>
            <span className="username">{displayName}</span>
            {typeof user?.credits === 'number' && (
              <span className="badge" style={{ marginLeft: 8 }}>
                Bank: {user.credits} chips
              </span>
            )}
          </div>

          <div className="right cluster">
            <button
              className="btn-secondary btn"
              type="button"
              onClick={onBackToHome}
            >
              ⮐ Back to Lobby
            </button>
          </div>
        </header>

        {/* Main profile content */}
        <main
          className="main-shell"
          style={{
            marginTop: 40,
            marginBottom: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}
        >
          {/* Top panel: avatar + basic info */}
          <section className="panel" aria-labelledby="profile-heading">
            <div
              className="cluster"
              style={{
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 24
              }}
            >
              {/* Avatar block */}
              <div
                className="stack"
                style={{ alignItems: 'center', gap: 12, position: 'relative' }}
              >
                <button
                  type="button"
                  className="avatar-btn"
                  onClick={() => setPickerOpen(true)}
                  aria-label="Change avatar"
                >
                  <img src={avatar} alt="Profile avatar" />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPickerOpen(true)}
                >
                  Change avatar
                </button>

                {/* Avatar picker popover */}
                {pickerOpen && (
                  <div
                    className="avatar-picker is-open"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choose avatar"
                    style={{ top: '110%', left: 0 }}
                  >
                    <h3>Choose your avatar</h3>
                    <div className="avatar-grid">
                      {AVATARS.map((src) => (
                        <button
                          key={src}
                          type="button"
                          className="avatar-option"
                          onClick={() => setAvatar(src)}
                        >
                          <img src={src} alt="Avatar option" />
                        </button>
                      ))}
                    </div>
                    <div className="avatar-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setPickerOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleSaveProfile}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Text / fields side */}
              <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                <h2 className="panel-header" id="profile-heading">
                  Player Profile
                </h2>
                <p className="panel-subtle">
                  Customize how you appear at the Blackjack 21 tables.
                </p>

                <div className="field">
                  <label htmlFor="displayName">Display name</label>
                  <div className="input-wrap">
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your table name"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <div className="input-wrap">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@casino.com"
                    />
                  </div>
                </div>

                <div className="cluster" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSaveProfile}
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Second panel: simple stats / info */}
          <section className="panel" aria-labelledby="account-heading">
            <h2 className="panel-header" id="account-heading">
              Account & Stats
            </h2>
            <p className="panel-subtle">
              A quick snapshot of your Blackjack 21 progress.
            </p>

            <div className="stack">
              <div className="cluster" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Current bank</span>
                <strong>
                  {typeof user?.credits === 'number'
                    ? `${user.credits} chips`
                    : '—'}
                </strong>
              </div>
              <div className="cluster" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Games played</span>
                <strong>Coming soon</strong>
              </div>
              <div className="cluster" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Win / loss</span>
                <strong>Coming soon</strong>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">© 2025 Blackjack 21</footer>
      </div>
    </div>
  );
}
