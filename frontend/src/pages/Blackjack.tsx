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

  // store local “bank” value to detect change per round
  const bankBeforeRound = useRef<number>(0);

  // track username
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

  // initialize blackjack and hook reporting
  useEffect(() => {
    if (!rootRef.current) return;
    const api = initBlackjack(rootRef.current);

    // watch for “bank change” in localStorage (our legacy script updates it)
    const observer = setInterval(() => {
      const val = Number(localStorage.getItem('bjBank') ?? '0');
      // when val changes and roundActive==false, post result
      if (bankBeforeRound.current && val !== bankBeforeRound.current) {
        const delta = val - bankBeforeRound.current;
        if (delta !== 0) reportResult(delta > 0, delta);
        bankBeforeRound.current = val;
      }
    }, 2000);

    // initialize baseline
    bankBeforeRound.current = Number(localStorage.getItem('bjBank') ?? '0');

    return () => {
      clearInterval(observer);
      api?.destroy?.();
    };
  }, []);

  function handleBackClick(e: React.MouseEvent) {
    e.preventDefault();
    onBack?.();
  }

  return (
    <>
      <header className="header header--app">
        <div className="left user-info">
          <img id="headerAvatar" src="/assets/avatars/1.png" alt="User avatar" />
          <span id="headerUsername" className="username">{displayName}</span>
        </div>

        <div className="right cluster">
          <button className="back-button btn-secondary btn" onClick={handleBackClick}>
            ⮐ Back to Home
          </button>
          <label htmlFor="deckSelect" className="muted">Deck:</label>
          <select id="deckSelect" className="select"></select>
          <span className="badge" id="bankBadge" title="Your chip balance"></span>
        </div>
      </header>

      <main className="container container--center" ref={rootRef}>
        <section className="panel">
          <h2 className="panel-header">Table</h2>
          <p className="panel-subtle">
            Beat the dealer without going over 21. Blackjack pays 3:2. Dealer stands on 17.
          </p>

          <div className="table-wrap">
            <div className="row">
              <div className="hand">
                <div className="label">Dealer</div>
                <div className="cards" id="dealerCards" aria-live="polite"></div>
                <div className="score" id="dealerScore">Score: —</div>
              </div>
            </div>

            <div className="row">
              <div className="hand">
                <div className="label">You</div>
                <div className="cards" id="playerCards" aria-live="polite"></div>
                <div className="score" id="playerScore">Score: —</div>
              </div>
            </div>
          </div>

          <div className="toast info mt-6" id="status" aria-live="polite">
            Place your bet to begin.
          </div>
        </section>

        <section className="grid cols-2">
          <div className="panel">
            <h3 className="panel-header">Betting</h3>
            <p className="panel-subtle">Set wager, number of hands, then Deal.</p>

            <div className="cluster chip-row">
              <button className="chip-btn chip-5" data-chip="5" title="+5">+5</button>
              <button className="chip-btn chip-25" data-chip="25" title="+25">+25</button>
              <button className="chip-btn chip-100" data-chip="100" title="+100">+100</button>
              <button className="btn-ghost btn" id="clearBetBtn" title="Clear bet">Clear</button>
            </div>

            <div className="bet-line mt-4">
              <span className="muted">Bet per Hand:</span>
              <strong id="betAmount">0</strong>
            </div>

            <div className="bet-line mt-2">
              <label htmlFor="handsSelect" className="muted">Hands:</label>
              <select id="handsSelect" className="select">
                <option value="1" defaultValue="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
              <span className="muted">Total wager:</span>
              <strong id="totalWager">0</strong>
            </div>

            <div className="mt-4 cluster">
              <button className="btn" id="dealBtn">Deal</button>
              <button className="btn-secondary btn" id="newRoundBtn" disabled>New Round</button>
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
              <button className="btn-secondary btn" id="changeDeckBtn" title="Switch card style">
                Change Deck
              </button>
              <button className="btn-danger btn" id="resetBankBtn" title="Reset bank to 500">
                Reset Bank
              </button>
            </div>
            <p className="panel-subtle mt-2 shoe-line">
              <span className="muted">Shoe:</span> <span id="shoeInfo">—</span>
              <span className="muted"> | Count:</span>
              <strong id="countInfo">—</strong>
              <span className="muted">
                ( <strong id="countLabel">Neutral</strong> )
              </span>
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">© 2025 Blackjack 21</footer>
    </>
  );
}
