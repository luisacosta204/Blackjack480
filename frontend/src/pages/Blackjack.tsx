import { useEffect, useRef, useState } from 'react';
import '../styles/global.css';
import '../styles/header-user.css';
import '../styles/blackjack.css';
import { initBlackjack } from '../legacy/blackjack';
import { reportResult } from '../api/game';

type UserLite = { username?: string; email?: string; credits?: number };
type Props = {
  user?: UserLite | null;
  onBack?: () => void;
};

export default function Blackjack({ user, onBack }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [displayName, setDisplayName] = useState('Guest');

  useEffect(() => {
    if (user?.username) {
      setDisplayName(user.username);
      localStorage.setItem('bj21.username', user.username);
    } else {
      const stored = localStorage.getItem('bj21.username');
      const name = stored || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      setDisplayName(name);
      localStorage.setItem('bj21.username', name);
    }
  }, [user]);

  useEffect(() => {
    (window as any).__bjReportResult = reportResult;
    return () => { delete (window as any).__bjReportResult; };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const teardown = initBlackjack(rootRef.current);
    return () => teardown?.destroy?.();
  }, []);

  function handleBackClick(e: React.MouseEvent) {
    e.preventDefault();
    onBack?.();
  }

  return (
    <div className="blackjack-page-root">
      
      {/* Centered fixed header */}
      <header className="header">
        <div className="left user-info">
          <img id="headerAvatar" src="/assets/avatars/1.png" alt="User avatar" />
          <span className="username">{displayName}</span>
        </div>

        <div className="right cluster">
          <button className="back-button btn-secondary btn" onClick={handleBackClick}>
            ⮐ Back to Home
          </button>

          <label htmlFor="deckSelect" className="muted">Deck:</label>
          <select id="deckSelect" className="select" />
          <span className="badge" id="bankBadge" />
        </div>
      </header>

      {/* Centered blackjack main container */}
      <main className="blackjack-content" ref={rootRef}>
        
        <section className="panel">
          <h2 className="panel-header">Table</h2>
          <p className="panel-subtle">
            Beat the dealer without going over 21. Blackjack pays 3:2. Dealer stands on 17.
          </p>

          <div className="table-wrap">
            <div className="row">
              <div className="hand">
                <div className="label">Dealer</div>
                <div className="cards" id="dealerCards" aria-live="polite" />
                <div className="score" id="dealerScore">Score: —</div>
              </div>
            </div>

            <div className="row">
              <div className="hand">
                <div className="label">You</div>
                <div className="cards" id="playerCards" aria-live="polite" />
                <div className="score" id="playerScore">Score: —</div>
              </div>
            </div>
          </div>

          <div className="toast info mt-6" id="status">Place your bet to begin.</div>
        </section>

        <section className="grid cols-2" style={{ marginTop: 20 }}>
          
          <div className="panel">
            <h3 className="panel-header">Betting</h3>
            <p className="panel-subtle">Set wager, number of hands, then Deal.</p>

            <div className="cluster chip-row">
              <button className="chip-btn chip-5" data-chip="5">+5</button>
              <button className="chip-btn chip-25" data-chip="25">+25</button>
              <button className="chip-btn chip-100" data-chip="100">+100</button>
              <button className="btn-ghost btn" id="clearBetBtn">Clear</button>
            </div>

            <div className="bet-line mt-4">
              <span className="muted">Bet per Hand:</span>
              <strong id="betAmount">0</strong>
            </div>

            <div className="bet-line mt-2">
              <label htmlFor="handsSelect" className="muted">Hands:</label>
              <select id="handsSelect" className="select" defaultValue="1">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
              <span className="muted">Total wager:</span>
              <strong id="totalWager">0</strong>
            </div>

            <div className="mt-4 cluster">
              <button className="btn" id="dealBtn">Deal</button>
              <button className="btn-secondary btn" id="newRoundBtn" disabled>
                New Round
              </button>
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-header">Actions</h3>
            <p className="panel-subtle">Act on the highlighted hand.</p>

            <div className="cluster action-row">
              <button className="btn-secondary btn" id="hitBtn" disabled>Hit</button>
              <button className="btn-secondary btn" id="standBtn" disabled>Stand</button>
              <button className="btn-secondary btn" id="doubleBtn" disabled>Double</button>
              <button className="btn-secondary btn" id="splitBtn" disabled>Split</button>
              <button className="btn-secondary btn" id="insuranceBtn" disabled>
                Take Insurance
              </button>
              <button className="btn-secondary btn" id="changeDeckBtn">Change Deck</button>
              <button className="btn-danger btn" id="resetBankBtn">Reset Bank</button>
            </div>

            <p className="panel-subtle mt-2 shoe-line">
              <span className="muted">Shoe:</span>
              <span id="shoeInfo">—</span>
              <span className="muted"> | Count:</span>
              <strong id="countInfo">—</strong>
              <span className="muted"> (</span>
              <strong id="countLabel">Neutral</strong>
              <span className="muted">)</span>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">© 2025 Blackjack 21</footer>
    </div>
  );
}
