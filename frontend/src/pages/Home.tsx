import '../styles/global.css';
import '../styles/header-user.css';
import { useEffect, useState } from 'react';

export default function Home({
  onPlayBlackjack,
  onViewLeaderboard,
  onViewProfile
}: {
  onPlayBlackjack: () => void;
  onViewLeaderboard: () => void;
  onViewProfile?: () => void;
}) {
  // Minimal header username/avatar like your static page
  const [username, setUsername] = useState('Guest');

  useEffect(() => {
    const storedName = localStorage.getItem('bj21.username');
    const name = storedName || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    setUsername(name);
    localStorage.setItem('bj21.username', name);
  }, []);

  return (
    <div className="container" style={{minHeight:'70vh', display:'grid', placeItems:'center'}}>
      {/* Header bar */}
      <header className="header" style={{position:'static', width:'100%'}}>
        <div className="left user-info">
          <img id="headerAvatar" src="/assets/avatars/1.png" alt="User avatar" />
          <span className="username">{username}</span>
        </div>
        <div className="right cluster">
          <button className="btn-secondary btn" onClick={() => onViewProfile?.()}>Profile</button>
        </div>
      </header>

      {/* Main hero */}
      <main style={{textAlign:'center', marginTop:40}}>
        <h1 className="panel-header" style={{marginBottom:8}}>Welcome to the Casino Lobby</h1>
        <p className="panel-subtle" style={{marginBottom:24}}>
          Choose a game mode or view your stats below.
        </p>

        <div className="cluster" style={{justifyContent:'center', marginBottom:20}}>
          <button className="btn" onClick={onPlayBlackjack}>Play Blackjack</button>
          <button className="btn btn-secondary" disabled>Coming Soon</button>
        </div>

        <div className="stack" style={{justifyItems:'center', gap:12}}>
          <button className="btn btn-secondary" onClick={onViewLeaderboard}>View Leaderboards</button>
          <button className="btn btn-secondary" onClick={() => onViewProfile?.()}>View Profile</button>
        </div>
      </main>

      <footer className="footer">© 2025 Blackjack 21. All rights reserved.</footer>
    </div>
  );
}
