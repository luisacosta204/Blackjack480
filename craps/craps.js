/* Classic Craps — minimal but correct core loop
   - Shared bank with Blackjack/Slots via localStorage key "bjBank"
   - Bets: Pass Line, Don't Pass, Field, Any 7
   - Simple dice animation

   Rules implemented:
   COME-OUT:
     Pass wins on 7/11, loses on 2/3/12, otherwise point is set.
     Don't Pass wins on 2/3, loses on 7/11, 12 pushes (returned), otherwise point is set.
   POINT:
     Pass wins if point repeats, loses on 7.
     Don't Pass wins on 7, loses if point repeats.
   ONE-ROLL:
     Field: wins on 2,3,4,9,10,11,12; loses on 5,6,7,8; 2/12 pay 2:1.
     Any 7: wins on 7 pays 4:1 else loses.

   NOTE: This is a foundation you can extend to Come/Come-Don't, Odds, Place bets, Hardways, etc.
*/
console.log('[CRAPS] build=dev1');

(() => {
  // ---- DOM ----
  const bankBadgeEl = document.getElementById('bankBadge');
  const bankLineEl = document.getElementById('bankLine');
  const payoutLineEl = document.getElementById('payoutLine');
  const statusEl = document.getElementById('status');

  const phaseLineEl = document.getElementById('phaseLine');
  const pointValueEl = document.getElementById('pointValue');

  const dieAEl = document.getElementById('dieA');
  const dieBEl = document.getElementById('dieB');
  const lastRollEl = document.getElementById('lastRoll');

  const selectedBetLabelEl = document.getElementById('selectedBetLabel');
  const totalBetEl = document.getElementById('totalBet');

  const chipButtons = document.querySelectorAll('.chip-btn[data-chip]');
  const betSpotButtons = document.querySelectorAll('.bet-spot[data-bet]');

  const clearSelectedBtn = document.getElementById('clearSelectedBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const rollBtn = document.getElementById('rollBtn');
  const resetBankBtn = document.getElementById('resetBankBtn');

  // ---- Bank ----
  const BANK_KEY = 'bjBank';
  const START_BANK = 500;

  // ---- Game state ----
  let bank = loadBank();
  let phase = 'comeout'; // 'comeout' | 'point'
  let point = null;      // 4,5,6,8,9,10

  // Bets stored as integer chips.
  const bets = {
    pass: 0,
    dont: 0,
    field: 0,
    any7: 0,
  };

  const BET_LABEL = {
    pass: 'Pass Line',
    dont: "Don't Pass",
    field: 'Field',
    any7: 'Any 7',
  };

  let selectedBet = 'pass';
  let rolling = false;

  // ---- Init ----
  syncBankUI();
  selectBet(selectedBet);
  renderBets();
  syncPhaseUI();
  setStatus('Click a betting area, add chips, then Roll.');
  payoutLineEl.textContent = '—';
  updateButtons();

  // ---- Header back button (optional) ----
  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = 'home.html';
  });

  // ---- Events ----
  betSpotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (rolling) return;
      selectBet(btn.dataset.bet);
    });
  });

  chipButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (rolling) return;
      const add = parseInt(btn.dataset.chip, 10);
      if (!Number.isFinite(add) || add <= 0) return;
      if (bank <= 0) return setStatus('Bank is empty. Reset bank to continue.');
      if (add > bank) return setStatus('Not enough chips in bank.');

      // Add to selected bet
      bank -= add;
      bets[selectedBet] += add;
      saveBank();
      syncBankUI();
      renderBets();
      payoutLineEl.textContent = '—';
      setStatus(`${BET_LABEL[selectedBet]} +${add}`);
      updateButtons();
    });
  });

  clearSelectedBtn.addEventListener('click', () => {
    if (rolling) return;
    const amt = bets[selectedBet];
    if (amt <= 0) return;
    bets[selectedBet] = 0;
    bank += amt;
    saveBank();
    syncBankUI();
    renderBets();
    payoutLineEl.textContent = '—';
    setStatus(`Cleared ${BET_LABEL[selectedBet]} bet.`);
    updateButtons();
  });

  clearAllBtn.addEventListener('click', () => {
    if (rolling) return;
    const refund = sumBets();
    if (refund <= 0) return;
    for (const k of Object.keys(bets)) bets[k] = 0;
    bank += refund;
    saveBank();
    syncBankUI();
    renderBets();
    payoutLineEl.textContent = '—';
    setStatus('All bets cleared.');
    updateButtons();
  });

  resetBankBtn.addEventListener('click', () => {
    if (rolling) return;
    // Do NOT auto-clear bets; mirror Slots behavior: bank reset only.
    bank = START_BANK;
    saveBank();
    syncBankUI();
    setStatus(`Bank reset to ${START_BANK} chips.`);
    updateButtons();
  });

  rollBtn.addEventListener('click', onRoll);

  // ---- Core ----
  async function onRoll() {
    if (rolling) return;
    if (sumBets() <= 0) return setStatus('Place at least one bet first.');

    rolling = true;
    payoutLineEl.textContent = '—';
    updateButtons();

    const { a, b, total } = await rollDiceAnimated();
    lastRollEl.textContent = `${a} + ${b} = ${total}`;

    const result = resolveRoll(total);
    applyPayouts(result);

    syncPhaseUI();
    renderBets();
    syncBankUI();

    rolling = false;
    updateButtons();
  }

  function resolveRoll(total) {
    // Returns a structured result the payout engine can use.
    const r = {
      total,
      phaseBefore: phase,
      pointBefore: point,
      phaseAfter: phase,
      pointAfter: point,
      events: [], // strings for status
      // Flags for quick checks
      isSeven: total === 7,
      isYo: total === 11,
      isCraps: total === 2 || total === 3 || total === 12,
      isFieldWin: [2,3,4,9,10,11,12].includes(total),
    };

    if (phase === 'comeout') {
      if ([7, 11].includes(total)) {
        r.events.push('Natural on the come-out.');
        // point stays null
      } else if ([2, 3, 12].includes(total)) {
        r.events.push('Craps on the come-out.');
      } else {
        point = total;
        phase = 'point';
        r.phaseAfter = 'point';
        r.pointAfter = point;
        r.events.push(`Point is set to ${point}.`);
      }
    } else {
      // phase === 'point'
      if (total === 7) {
        r.events.push('Seven out. New come-out roll.');
        phase = 'comeout';
        point = null;
        r.phaseAfter = 'comeout';
        r.pointAfter = null;
      } else if (total === point) {
        r.events.push(`Hit the point (${point}). New come-out roll.`);
        phase = 'comeout';
        point = null;
        r.phaseAfter = 'comeout';
        r.pointAfter = null;
      } else {
        r.events.push('No decision on line bets.');
      }
    }

    return r;
  }

  function applyPayouts(r) {
    let delta = 0; // net change to bank from resolving bets
    const lines = [];

    // ONE-ROLL BETS resolve every roll.
    // Field
    if (bets.field > 0) {
      if (r.isFieldWin) {
        const mult = (r.total === 2 || r.total === 12) ? 2 : 1;
        const win = bets.field * mult;
        delta += bets.field + win; // return stake + winnings
        lines.push(`Field wins x${mult}: +${win}`);
      } else {
        lines.push(`Field loses: -${bets.field}`);
      }
      bets.field = 0;
    }

    // Any 7
    if (bets.any7 > 0) {
      if (r.isSeven) {
        const win = bets.any7 * 4;
        delta += bets.any7 + win;
        lines.push(`Any 7 hits x4: +${win}`);
      } else {
        lines.push(`Any 7 loses: -${bets.any7}`);
      }
      bets.any7 = 0;
    }

    // LINE BETS resolve on decisions.
    // If no decision, leave them up.
    const decidedComeout = (r.phaseBefore === 'comeout') && ([7,11,2,3,12].includes(r.total));
    const decidedPoint = (r.phaseBefore === 'point') && (r.total === 7 || r.total === r.pointBefore);

    // Pass Line
    if (bets.pass > 0) {
      if (r.phaseBefore === 'comeout' && decidedComeout) {
        if (r.total === 7 || r.total === 11) {
          const win = bets.pass * 1;
          delta += bets.pass + win;
          lines.push(`Pass wins: +${win}`);
          bets.pass = 0;
        } else {
          lines.push(`Pass loses: -${bets.pass}`);
          bets.pass = 0;
        }
      } else if (r.phaseBefore === 'point' && decidedPoint) {
        if (r.total === r.pointBefore) {
          const win = bets.pass * 1;
          delta += bets.pass + win;
          lines.push(`Pass hits point: +${win}`);
        } else {
          lines.push(`Pass seven-out: -${bets.pass}`);
        }
        bets.pass = 0;
      }
    }

    // Don't Pass
    if (bets.dont > 0) {
      if (r.phaseBefore === 'comeout' && decidedComeout) {
        if (r.total === 2 || r.total === 3) {
          const win = bets.dont * 1;
          delta += bets.dont + win;
          lines.push(`Don't Pass wins: +${win}`);
          bets.dont = 0;
        } else if (r.total === 12) {
          // push (stake returned)
          delta += bets.dont;
          lines.push(`Don't Pass pushes on 12: +0`);
          bets.dont = 0;
        } else {
          lines.push(`Don't Pass loses: -${bets.dont}`);
          bets.dont = 0;
        }
      } else if (r.phaseBefore === 'point' && decidedPoint) {
        if (r.total === 7) {
          const win = bets.dont * 1;
          delta += bets.dont + win;
          lines.push(`Don't Pass wins (7-out): +${win}`);
        } else {
          lines.push(`Don't Pass loses (point hit): -${bets.dont}`);
        }
        bets.dont = 0;
      }
    }

    // Apply net
    if (delta !== 0) {
      bank += delta;
      saveBank();
    }

    // UI output
    const eventMsg = r.events.join(' ');
    const payoutMsg = lines.length ? lines.join(' • ') : 'No payouts.';
    payoutLineEl.textContent = lines.length ? (delta >= 0 ? `+${delta}` : `${delta}`) : '—';

    if (lines.length) {
      setStatus(`${eventMsg} ${payoutMsg}`.trim());
    } else {
      setStatus(eventMsg);
    }

    // Guard
    if (bank < 0) bank = 0;
  }

  // ---- Dice ----
  async function rollDiceAnimated() {
    dieAEl.classList.add('rolling');
    dieBEl.classList.add('rolling');

    const frames = 10;
    for (let i = 0; i < frames; i++) {
      setDieFace(dieAEl, rand1to6());
      setDieFace(dieBEl, rand1to6());
      await wait(45);
    }

    const a = rand1to6();
    const b = rand1to6();
    setDieFace(dieAEl, a);
    setDieFace(dieBEl, b);

    dieAEl.classList.remove('rolling');
    dieBEl.classList.remove('rolling');

    return { a, b, total: a + b };
  }

  function setDieFace(el, n) {
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    el.textContent = faces[n - 1];
  }

  // ---- UI helpers ----
  function selectBet(key) {
    selectedBet = key;
    betSpotButtons.forEach(b => b.classList.toggle('selected', b.dataset.bet === key));
    selectedBetLabelEl.textContent = BET_LABEL[key] || key;
  }

    function renderBets() {
        try {
            for (const k of Object.keys(bets)) {
                const el = document.querySelector(`[data-amt="${k}"]`);
                if (el) el.textContent = String(bets[k]);
            }
            const total = sumBets();
            totalBetEl.textContent = String(total);
            // only call if defined (prevents ReferenceError)
            if (typeof updateTableChipIcon === 'function') updateTableChipIcon(total);
        } catch (err) {
            console.error('renderBets error', err);
            // keep UI usable
            totalBetEl.textContent = String(sumBets());
        }
    }

  function syncPhaseUI() {
    phaseLineEl.textContent = (phase === 'comeout') ? 'Come-out roll' : 'Point established';
    pointValueEl.textContent = point ? String(point) : '—';
  }

    function syncBankUI() {
        bankBadgeEl.setAttribute('aria-label', `Bank: ${bank} chips`);
        bankBadgeEl.textContent = String(bank);

        bankLineEl.textContent = String(bank);

        // Top-right badge
        updateChipIconForEl(bankBadgeEl, bank);

        // Bottom "Bank" badge (same exact tiering/colors)
        updateChipIconForEl(bankLineEl, bank);
    }

    function chipUrlForTableTotal(total) {
        if (total >= 100) return "../assets/images/bet-100.png";
        if (total >= 25) return "../assets/images/bet-25.png";
        return "../assets/images/bet-5.png";
    }

    function updateTableChipIcon(total) {
        const url = chipUrlForTableTotal(total);
        totalBetEl.style.setProperty("--bank-chip-url", `url("${url}")`);
    }

    // Same tier logic used in Slots/Blackjack
    function chipUrlForBank(bankAmount) {
        if (bankAmount < 750) return "../assets/images/chip-chip.png";
        const tier = Math.floor((bankAmount - 750) / 250);

        const tierImages = [
            "../assets/images/chip-750.png",
            "../assets/images/chip-1000.png",
            "../assets/images/chip-1250.png",
            "../assets/images/chip-1500.png",
            "../assets/images/chip-1750.png",
            "../assets/images/chip-2000.png",
            "../assets/images/chip-2250.png"
        ];

        const idx = Math.min(tier, tierImages.length - 1);
        return tierImages[idx];
    }

    function updateChipIconForEl(el, bankAmount) {
        const url = chipUrlForBank(bankAmount);
        el.style.setProperty("--bank-chip-url", `url("${url}")`);
    }

  function updateButtons() {
    const hasAnyBet = sumBets() > 0;
    rollBtn.disabled = rolling || !hasAnyBet;

    clearSelectedBtn.disabled = rolling || bets[selectedBet] <= 0;
    clearAllBtn.disabled = rolling || !hasAnyBet;
    resetBankBtn.disabled = rolling;

    chipButtons.forEach(btn => {
      const add = parseInt(btn.dataset.chip, 10);
      btn.disabled = rolling || bank < add;
    });
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  // ---- storage ----
  function loadBank() {
    const raw = localStorage.getItem(BANK_KEY);
    const n = raw == null ? NaN : parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) {
      localStorage.setItem(BANK_KEY, String(START_BANK));
      return START_BANK;
    }
    return n;
  }

  function saveBank() {
    localStorage.setItem(BANK_KEY, String(bank));
  }

  // ---- utils ----
  function rand1to6() { return 1 + Math.floor(Math.random() * 6); }
  function sumBets() { return Object.values(bets).reduce((a,b) => a + b, 0); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
})();
