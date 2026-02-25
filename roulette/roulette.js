console.log('[Roulette] build=dev1');

(() => {
  // ---- DOM ----
  const bankBadgeEl = document.getElementById('bankBadge');
  const statusEl = document.getElementById('status');
  const betAmountEl = document.getElementById('betAmount');
  const selectedBetEl = document.getElementById('selectedBet');
  const numberSelectEl = document.getElementById('numberSelect');
  const spinBtn = document.getElementById('spinBtn');
  const clearBetBtn = document.getElementById('clearBetBtn');
  const resetBankBtn = document.getElementById('resetBankBtn');
  const historyRowEl = document.getElementById('historyRow');
  const resultBadgeEl = document.getElementById('resultBadge');
  const wheelRingEl = document.querySelector('.wheel-ring');

  const chipButtons = document.querySelectorAll('.chip-btn[data-chip]');
  const betButtons = document.querySelectorAll('.bet-btn[data-bet]');

  // ---- Config ----
  const BANK_KEY = 'bjBank';
  const START_BANK = 500;

  // European roulette: 0-36
  const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const BLACK_NUMBERS = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);

  // ---- State ----
  let bank = loadBank();
  let betAmount = 0;
  let bet = { type: null, value: null }; // type: red/black/even/odd/number
  let spinning = false;
  let history = [];

    // ---- Init ----
    populateNumberSelect();
    updateBankBadge();
    updateBetUI();
    setStatus('Place your bet to begin.');

    // (WAIT to call buildWheelVisual until AFTER EURO_WHEEL is defined)


  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = 'home.html';
  });

  chipButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (spinning) return;
      const add = Number(btn.dataset.chip);
      if (!Number.isFinite(add)) return;
      if (bank <= 0) return;
      betAmount = Math.min(bank, betAmount + add);
      updateBetUI();
    });
  });

  clearBetBtn.addEventListener('click', () => {
    if (spinning) return;
    betAmount = 0;
    bet = { type: null, value: null };
    betButtons.forEach(b => b.classList.remove('active'));
    updateBetUI();
    setStatus('Bet cleared.');
  });

  betButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (spinning) return;
      betButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const t = btn.dataset.bet;
      if (t === 'number') {
        bet = { type: 'number', value: Number(numberSelectEl.value) };
        setStatus(`Selected: Straight ${bet.value} (35:1).`);
      } else {
        bet = { type: t, value: null };
        setStatus(`Selected: ${t.toUpperCase()} (1:1).`);
      }
      updateBetUI();
    });
  });

  numberSelectEl.addEventListener('change', () => {
    if (bet.type === 'number') {
      bet.value = Number(numberSelectEl.value);
      updateBetUI();
    }
  });

    // European roulette wheel order (clockwise)
    const EURO_WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
        6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
        24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
        29, 7, 28, 12, 35, 3, 26
    ];

    // ✅ now safe: EURO_WHEEL exists
    buildWheelVisual();
    window.addEventListener('resize', buildWheelVisual);

    function buildWheelVisual() {
        if (!wheelRingEl) return;

        const seg = 360 / EURO_WHEEL.length;

        // Put pocket 0 centered under the top pointer (-90deg)
        const startOffset = -(seg / 2);

        // IMPORTANT: stops are 0..360 (relative). DO NOT bake startOffset into stops.
        const stops = EURO_WHEEL.map((n, i) => {
            const c = colorOf(n);
            const col =
                c === 'red' ? '#b71c1c' :
                    c === 'black' ? '#111315' :
                        '#0f7a44';

            const a0 = (i * seg).toFixed(4);
            const a1 = ((i + 1) * seg).toFixed(4);
            return `${col} ${a0}deg ${a1}deg`;
        });

        wheelRingEl.style.background = `
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0.0) 52%,
      rgba(0,0,0,0.55) 54%,
      rgba(0,0,0,0.0) 56%
    ),
    conic-gradient(from ${startOffset}deg, ${stops.join(',')})
  `;

        // Remove old labels
        wheelRingEl.querySelectorAll('.number-label').forEach(el => el.remove());

        // Place number labels around rim using the SAME startOffset (this locks them to pockets)
        const ringRect = wheelRingEl.getBoundingClientRect();
        const radius = Math.min(ringRect.width, ringRect.height) / 2;
        const labelRadius = radius * 0.72; // tweakable: 0.70–0.78 tends to look good

        EURO_WHEEL.forEach((n, i) => {
            const angleDeg = startOffset + (i + 0.5) * seg;
            const rad = angleDeg * (Math.PI / 180);

            const xPct = 50 + Math.sin(rad) * (labelRadius / radius) * 50;
            const yPct = 50 - Math.cos(rad) * (labelRadius / radius) * 50;

            const label = document.createElement('div');
            label.className = `number-label ${colorOf(n)}`;
            label.textContent = String(n);
            label.style.left = `${xPct}%`;
            label.style.top = `${yPct}%`;

            // Tangential-ish orientation (readable around rim)
            label.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;

            wheelRingEl.appendChild(label);
        });
    }



  spinBtn.addEventListener('click', onSpin);

  resetBankBtn.addEventListener('click', () => {
    if (spinning) return;
    bank = START_BANK;
    saveBank();
    updateBankBadge();
    setStatus('Bank reset to 500 chips.');
  });

    let wheelAccum = 0;
let ballAccum = 0; // degrees; our ball CSS treats 0deg as "up" and +deg clockwise.

// Wheel is static; only the ball moves.
function animateBallToResult(n) {
  return new Promise((resolve) => {
    const idx = EURO_WHEEL.indexOf(n);
    if (idx === -1 || !wheelRingEl) { resolve(); return; }

    const seg = 360 / EURO_WHEEL.length;
    const startOffset = -(seg / 2); // same offset used when drawing labels

    const wheelEl = wheelRingEl;
    const ballEl = document.getElementById('rouletteBall') || document.querySelector('.wheel .ball');
    if (!ballEl) { resolve(); return; }

    // set ball radius to fit inside rim
    const wheelRect = wheelEl.getBoundingClientRect();
    const r = Math.min(wheelRect.width, wheelRect.height) / 2;
    const ballRadius = Math.max(70, Math.min(r - 22, r * 0.46));
    ballEl.style.setProperty('--ball-radius', `${ballRadius}px`);

    // Pocket center angle in the SAME coordinate system as conic-gradient (0=up, clockwise)
    const pocketAngle = startOffset + (idx + 0.5) * seg;

    // Add several full turns for flair, then land exactly on pocketAngle.
    const duration = 2600 + Math.floor(Math.random() * 700); // 2.6–3.3s
    const turns = 360 * (4 + Math.floor(Math.random() * 3)); // 4–6 turns
    const jitter = (Math.random() - 0.5) * 1.2;              // subtle ±0.6°

    const startNorm = ((ballAccum % 360) + 360) % 360;
    const pocketNorm = ((pocketAngle % 360) + 360) % 360;

    // delta ensures final angle (mod 360) hits the desired pocket center.
    const delta = (pocketNorm - startNorm + 360) % 360;
    const ballDest = ballAccum + turns + delta + jitter;

    // Reset transitions for fresh animation (wheel stays still)
    ballEl.style.transition = 'none';
    ballEl.style.setProperty('--ball-rot', `${ballAccum}deg`);
    void ballEl.offsetWidth; // force reflow

    ballEl.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.2,1)`;
    requestAnimationFrame(() => {
      ballEl.style.setProperty('--ball-rot', `${ballDest}deg`);
    });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      ballEl.removeEventListener('transitionend', onEnd);
      ballAccum = ballDest; // persist for next spin
      resolve();
    };

    const onEnd = (e) => {
      if (e.propertyName === 'transform') finish();
    };

    ballEl.addEventListener('transitionend', onEnd);
    setTimeout(finish, duration + 200);
  });
}

// ---- Bank badge (same pattern as your other games) ----
  function updateBankBadge() {
    bankBadgeEl.setAttribute('aria-label', `Bank: ${bank} chips`);
    bankBadgeEl.textContent = String(bank);
    updateChipIcon(bank);
  }

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
    return tierImages[Math.min(tier, tierImages.length - 1)];
  }

  function updateChipIcon(bankAmount) {
    const url = chipUrlForBank(bankAmount);
    bankBadgeEl.style.setProperty("--bank-chip-url", `url("${url}")`);
  }

  function loadBank() {
    const v = localStorage.getItem(BANK_KEY);
    return Number.isFinite(+v) && +v >= 0 ? +v : START_BANK;
  }

  function saveBank() {
    localStorage.setItem(BANK_KEY, String(bank));
  }

  // ---- UI helpers ----
  function setStatus(msg, type = 'info') {
    statusEl.textContent = msg;
    statusEl.className = `toast ${type}`;
  }

  function updateBetUI() {
    betAmountEl.textContent = String(betAmount);

    if (!bet.type) {
      selectedBetEl.textContent = '—';
      return;
    }

    if (bet.type === 'number') {
      selectedBetEl.textContent = `Straight ${bet.value}`;
    } else {
      selectedBetEl.textContent = bet.type.toUpperCase();
    }
  }

  function populateNumberSelect() {
    numberSelectEl.innerHTML = '';
    for (let n = 0; n <= 36; n++) {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = String(n);
      numberSelectEl.appendChild(opt);
    }
    numberSelectEl.value = '7';
  }

  // ---- Roulette logic ----
  function spinNumber() {
    // Uniform random 0..36
    return Math.floor(Math.random() * 37);
  }

  function colorOf(n) {
    if (n === 0) return 'green';
    if (RED_NUMBERS.has(n)) return 'red';
    return 'black';
  }

  function payoutMultiplier(spin, betObj) {
    if (!betObj.type) return 0;

    if (betObj.type === 'number') {
      return (spin === betObj.value) ? 35 : 0;
    }

    if (spin === 0) return 0;

    switch (betObj.type) {
      case 'red': return (colorOf(spin) === 'red') ? 1 : 0;
      case 'black': return (colorOf(spin) === 'black') ? 1 : 0;
      case 'even': return (spin % 2 === 0) ? 1 : 0;
      case 'odd': return (spin % 2 === 1) ? 1 : 0;
      default: return 0;
    }
  }

  function setResultUI(n) {
    const c = colorOf(n);
    resultBadgeEl.textContent = `Result: ${n} (${c})`;
    resultBadgeEl.dataset.color = c;

    history.unshift({ n, c });
    history = history.slice(0, 8);
    renderHistory();
  }

  function renderHistory() {
    historyRowEl.innerHTML = '';
    for (const h of history) {
      const s = document.createElement('span');
      s.className = `pill ${h.c}`;
      s.textContent = String(h.n);
      historyRowEl.appendChild(s);
    }
  }

  function onSpin() {
    if (spinning) return;
    if (betAmount <= 0) return setStatus('Place a bet amount first.');
    if (!bet.type) return setStatus('Select a bet type first.');
    if (bet.type === 'number') bet.value = Number(numberSelectEl.value);

    if (betAmount > bank) betAmount = bank; // clamp
    if (betAmount <= 0) return setStatus('Not enough chips.');

    // Deduct stake
    bank -= betAmount;
    saveBank();
    updateBankBadge();

    spinning = true;
    spinBtn.disabled = true;
    setStatus('Spinning…');

      const n = spinNumber();

      // Wheel is STATIC; only animate the ball.
      animateBallToResult(n).then(() => {
          const mult = payoutMultiplier(n, bet);
          const win = mult > 0;
          const winnings = win ? betAmount * (mult + 1) : 0;

          if (win) {
              bank += winnings;
              saveBank();
              updateBankBadge();
              setStatus(`You won! Payout x${mult}: +${winnings} chips.`, 'success');
          } else {
              setStatus('No win this spin.', 'info');
          }

          setResultUI(n);

          spinning = false;
          spinBtn.disabled = false;
      }).catch((err) => {
          console.error('[Roulette] spin animation failed', err);
          // Fail-safe: never leave UI stuck in "Spinning…"
          setResultUI(n);
          spinning = false;
          spinBtn.disabled = false;
          setStatus('Spin animation error (see console).', 'info');
      });

  }
})();

