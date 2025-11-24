/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Module-ized Blackjack with init/destroy for React.
 * - Scope: all DOM queries are relative to the provided rootEl
 * - Assets: served from Vite public/ (e.g., /assets/decks/manifest.json)
 * - Back button handling removed (React controls it)
 */
import { reportResult } from "../api/game";

export function initBlackjack(rootEl: HTMLElement) {
  console.log("[BJ] init");

  // ------- DOM (scoped to rootEl) -------
  const $id = <T extends Element = HTMLElement>(id: string) =>
    rootEl.querySelector<T>("#" + id);

  const dealerCardsEl = $id<HTMLDivElement>("dealerCards")!;
  const playerCardsEl = $id<HTMLDivElement>("playerCards")!;
  const dealerScoreEl = $id<HTMLElement>("dealerScore")!;
  const playerScoreEl = $id<HTMLElement>("playerScore")!;
  const statusEl = $id<HTMLElement>("status")!;

  const betAmountEl = $id<HTMLElement>("betAmount")!;
  const totalWagerEl = $id<HTMLElement>("totalWager")!;
  const bankBadgeEl = $id<HTMLElement>("bankBadge")!;
  const shoeInfoEl = $id<HTMLElement>("shoeInfo")!;
  const countInfoEl = $id<HTMLElement>("countInfo")!;
  const countLabelEl = $id<HTMLElement>("countLabel")!;

  const chipButtons = rootEl.querySelectorAll<HTMLButtonElement>(".chip-btn");
  const dealBtn = $id<HTMLButtonElement>("dealBtn")!;
  const newRoundBtn = $id<HTMLButtonElement>("newRoundBtn")!;
  const clearBetBtn = $id<HTMLButtonElement>("clearBetBtn")!;
  const hitBtn = $id<HTMLButtonElement>("hitBtn")!;
  const standBtn = $id<HTMLButtonElement>("standBtn")!;
  const doubleBtn = $id<HTMLButtonElement>("doubleBtn")!;
  const splitBtn = $id<HTMLButtonElement>("splitBtn")!;
  const insuranceBtn = $id<HTMLButtonElement>("insuranceBtn")!;
  const handsSelect = $id<HTMLSelectElement>("handsSelect")!;
  const deckSelectEl = $id<HTMLSelectElement>("deckSelect")!;
  const resetBankBtn = $id<HTMLButtonElement>("resetBankBtn")!;

  // optional header elements (present in this page)
  const headerAvatar = $id<HTMLImageElement>("headerAvatar");
  const headerUsername = $id<HTMLElement>("headerUsername");

  // ------- Constants / Config -------
  const DECK_KEY = "bjDeck";
  const BANK_KEY = "bjBank";
  const START_BANK = 500;
  const NUM_DECKS = 6;
  const RESHUFFLE_PENETRATION = 0.75;

  // Deck style (images)
  let cardTextures: Record<string, string> = {};
  let deckBackImage = "";

  async function loadDeckTheme(theme = "style_1") {
    try {
      const res = await fetch(`/assets/decks/${theme}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const base = data.path ?? "/assets/cards/";
      const rawMap = data.cards ?? {};

      const normSuit = (s: string) =>
        s.replace(/\u2660/g, "♠")
          .replace(/\u2665/g, "♥")
          .replace(/\u2666/g, "♦")
          .replace(/\u2663/g, "♣");

      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries<string>(rawMap)) {
        const key = normSuit(k.trim());
        const val = v.includes("/") ? v : base + v;
        out[key] = val;
        const m = key.match(/^([AJQK]|10|[2-9])(♠|♥|♦|♣)$/);
        if (m) {
          const ascii = { "♠": "S", "♥": "H", "♦": "D", "♣": "C" }[m[2] as "♠" | "♥" | "♦" | "♣"];
          out[`${m[1]}${ascii}`] = val;
        }
      }
      cardTextures = out;
      deckBackImage = data.back ? (data.back.includes("/") ? data.back : base + data.back) : "";
      console.log("[Deck] Loaded", Object.keys(cardTextures).length, "textures");
    } catch (e) {
      console.warn("Deck theme failed to load; falling back to text cards.", e);
      cardTextures = {};
      deckBackImage = "";
    }
  }

  // Hi-Lo
  let runningCount = 0;
  function hiLoValue(rank: string) {
    if (["2", "3", "4", "5", "6"].includes(rank)) return 1;
    if (["7", "8", "9"].includes(rank)) return 0;
    return -1;
  }

  // ------- State -------
  let bank = loadBank();
  let shoe: Array<{ r: string; s: string }> = [];
  let discard: Array<{ r: string; s: string }> = [];
  let dealer: { cards: Array<{ r: string; s: string }> } = { cards: [] };
  type Hand = {
    cards: Array<{ r: string; s: string }>;
    bet: number;
    stood: boolean;
    doubled: boolean;
    splitUsed: boolean;
    insurance: number;
    finished: boolean;
    hitOnce: boolean;
    paid?: boolean;
  };
  let hands: Hand[] = [];
  let activeIndex = 0;
  let betPerHand = 0;
  let roundActive = false;
  let insuranceOffered = false;

  // ------- Header username/avatar -------
  {
    const storedName = localStorage.getItem("bj21.username");
    const storedAvatar = localStorage.getItem("bj21.avatar");
    const username = storedName || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    if (headerUsername) headerUsername.textContent = username;
    localStorage.setItem("bj21.username", username);
    if (storedAvatar && headerAvatar) headerAvatar.src = storedAvatar;
  }
  const storageHandler = (e: StorageEvent) => {
    if (e.key === "bj21.avatar" && e.newValue && headerAvatar) headerAvatar.src = e.newValue;
  };
  window.addEventListener("storage", storageHandler);

  // ------- Init -------
  updateBankBadge();
  updateBetLabel();
  updateTotalWager();
  setStatus("Loading decks…");
  (async () => {
    const selectedDeck = await populateDeckMenu();
    if (selectedDeck === "text") {
      cardTextures = {};
      deckBackImage = "";
    } else {
      await loadDeckTheme(selectedDeck);
    }
    setStatus("Place your bet to begin.");
    buildShoe();
    updateShoeInfo();
    wireEvents();
    renderHandsSimpleWhenNoGame();
    updateActionButtons();
  })();

  // ------- Helpers -------
  function setStatus(msg: string, type = "info") {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `toast ${type}`;
  }
  async function populateDeckMenu() {
    if (!deckSelectEl) return "style_1";
    try {
      const res = await fetch("/assets/decks/manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Manifest load failed: ${res.status}`);
      const manifest = await res.json();

      deckSelectEl.innerHTML = "";
      for (const deck of manifest.decks as Array<{ id: string; name: string }>) {
        const opt = document.createElement("option");
        opt.value = deck.id;
        opt.textContent = deck.name;
        deckSelectEl.appendChild(opt);
      }
      const savedDeck =
        localStorage.getItem(DECK_KEY) || manifest.default || manifest.decks[0]?.id || "style_1";
      deckSelectEl.value = savedDeck;
      localStorage.setItem(DECK_KEY, savedDeck);
      return savedDeck as string;
    } catch (err) {
      console.warn("Deck manifest failed to load:", err);
      if (deckSelectEl.options.length === 0) {
        const opt = document.createElement("option");
        opt.value = "style_1";
        opt.textContent = "Style 1 (Images)";
        deckSelectEl.appendChild(opt);
        const opt2 = document.createElement("option");
        opt2.value = "text";
        opt2.textContent = "Text Only";
        deckSelectEl.appendChild(opt2);
      }
      return "style_1";
    }
  }

  function updateBankBadge() {
    if (!bankBadgeEl) return;
    bankBadgeEl.textContent = `Bank: ${bank} chips`;
    bankBadgeEl.className = "badge";
  }
  function updateBetLabel() {
    if (betAmountEl) betAmountEl.textContent = String(betPerHand);
  }
  function updateTotalWager() {
    if (!totalWagerEl) return;
    const h = getHandsCount();
    totalWagerEl.textContent = String(betPerHand * h);
  }
  function getHandsCount() {
    return parseInt(handsSelect?.value || "1", 10);
  }

  function loadBank() {
    const v = localStorage.getItem(BANK_KEY);
    return Number.isFinite(+v!) && +v! > 0 ? +v! : START_BANK;
  }
  function saveBank() {
    localStorage.setItem(BANK_KEY, String(bank));
  }

  function buildShoe() {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    shoe = [];
    for (let d = 0; d < NUM_DECKS; d++) {
      for (const s of suits) for (const r of ranks) shoe.push({ r, s });
    }
    shuffle(shoe);
    discard = [];
    runningCount = 0;
  }
  function shuffle(arr: any[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  function drawCard() {
    const used = NUM_DECKS * 52 - shoe.length;
    if (used / (NUM_DECKS * 52) >= RESHUFFLE_PENETRATION) {
      buildShoe();
      setStatus("Shuffling the shoe…", "info");
    }
    const c = shoe.pop()!;
    runningCount += hiLoValue(c.r);
    return c;
  }
  function cardValue(r: string) {
    if (r === "A") return 11;
    if (["K", "Q", "J"].includes(r)) return 10;
    return parseInt(r, 10);
  }
  function handValue(cards: Array<{ r: string; s: string }>) {
    let total = 0,
      aces = 0;
    for (const c of cards) {
      total += cardValue(c.r);
      if (c.r === "A") aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }
  function isBlackjack(cards: Array<{ r: string; s: string }>) {
    return cards.length === 2 && handValue(cards) === 21;
  }
  function canSplit(hand: Hand) {
    if (hand.splitUsed) return false;
    if (hand.cards.length !== 2) return false;
    const [a, b] = hand.cards;
    const vA = a.r === "A" ? 11 : cardValue(a.r);
    const vB = b.r === "A" ? 11 : cardValue(b.r);
    return vA === vB;
  }

  function cardNode(card: { r: string; s: string }, facedown: boolean) {
    const el = document.createElement("div");
    el.className = `card-ui${facedown ? " back" : ""}`;

    if (facedown) {
      if (deckBackImage) {
        const img = document.createElement("img");
        img.src = deckBackImage;
        img.alt = "Card Back";
        img.className = "card-img";
        el.appendChild(img);
      }
      return el;
    }

    const key = `${card.r}${card.s}`;
    const file = cardTextures[key];

    if (file) {
      const img = document.createElement("img");
      img.src = file;
      const suits: any = { "♠": "Spades", "♥": "Hearts", "♦": "Diamonds", "♣": "Clubs" };
      const ranks: any = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };
      img.alt = `${ranks[card.r] || card.r} of ${suits[card.s]}`;
      img.className = "card-img";
      el.appendChild(img);
    } else {
      const red = card.s === "♥" || card.s === "♦" ? " red" : "";
      el.innerHTML = `
        <div class="corner${red}">${card.r}${card.s}</div>
        <div class="center${red}">${card.s}</div>
        <div class="corner${red}" style="justify-self:end; transform: rotate(180deg)">${card.r}${card.s}</div>
      `;
    }
    return el;
  }

  function updateActionButtons() {
    const playing = roundActive;
    const hand = hands[activeIndex];
    const firstMove = hand && hand.cards.length === 2 && !hand.hitOnce;
    hitBtn.disabled = !playing || !hand;
    standBtn.disabled = !playing || !hand;
    doubleBtn.disabled = !playing || !hand || !firstMove || bank < hand.bet;
    splitBtn.disabled = !playing || !hand || !canSplit(hand) || bank < hand.bet;
    insuranceBtn.disabled = !(
      insuranceOffered &&
      hand &&
      firstMove &&
      hand.insurance === 0 &&
      bank >= Math.floor(hand.bet / 2)
    );
    dealBtn.disabled = playing;
    newRoundBtn.disabled = playing;
  }

  function updateShoeInfo() {
    const total = NUM_DECKS * 52;
    const remaining = shoe.length;
    const used = total - remaining;
    const pct = Math.round((used / total) * 100);
    if (shoeInfoEl) shoeInfoEl.textContent = `${remaining}/${total} cards left (${pct}% dealt)`;

    const decksRemaining = Math.max(remaining / 52, 0.25);
    const trueCount = runningCount / decksRemaining;
    const tcDisplay = (trueCount >= 0 ? "+" : "") + (Math.round(trueCount * 10) / 10).toFixed(1);
    if (countInfoEl) countInfoEl.textContent = `${runningCount >= 0 ? "+" : ""}${runningCount} / ${tcDisplay}`;

    let label = "Neutral";
    if (trueCount >= 2) label = "Hot";
    else if (trueCount <= -2) label = "Cold";
    if (countLabelEl) {
      countLabelEl.textContent = label;
      countLabelEl.setAttribute("data-state", label);
    }
  }

  function renderTable(hideHole = true) {
    // Dealer
    dealerCardsEl.innerHTML = "";
    dealer.cards.forEach((c, idx) => {
      const isHole = hideHole && idx === 1 && roundActive;
      dealerCardsEl.appendChild(cardNode(c, isHole));
    });
    const dealerShown =
      hideHole && roundActive ? cardValue(dealer.cards[0].r) : handValue(dealer.cards);
    dealerScoreEl.textContent = `Score: ${hideHole && roundActive ? dealerShown + "+" : dealerShown}`;

    // Player(s)
    const hCount = hands.length;
    if (hCount <= 1) {
      playerCardsEl.innerHTML = "";
      hands[0]?.cards.forEach((c) => playerCardsEl.appendChild(cardNode(c, false)));
      playerScoreEl.textContent = `Score: ${handValue(hands[0]?.cards || [])}`;
    } else {
      const container = document.createElement("div");
      container.className = "player-hands";
      container.dataset.hands = String(hands.length);
      hands.forEach((hand, idx) => {
        const block = document.createElement("div");
        block.className =
          "player-hand" +
          (idx === activeIndex && roundActive ? " active" : "") +
          (hand.finished ? " finished" : "");
        const label = document.createElement("div");
        label.className = "label";
        label.textContent = `Hand ${idx + 1} — Bet ${hand.bet}${
          hand.insurance ? ` (+Ins ${hand.insurance})` : ""
        }`;
        const cardsDiv = document.createElement("div");
        cardsDiv.className = "cards";
        hand.cards.forEach((c) => cardsDiv.appendChild(cardNode(c, false)));
        const score = document.createElement("div");
        score.className = "score";
        score.textContent = `Score: ${handValue(hand.cards)}`;
        block.appendChild(label);
        block.appendChild(cardsDiv);
        block.appendChild(score);
        container.appendChild(block);
      });
      const parent = playerCardsEl.parentElement!.parentElement!;
      const existing = parent.querySelector(".player-hands");
      if (existing) existing.remove();
      parent.appendChild(container);
      playerCardsEl.innerHTML = "";
      playerScoreEl.textContent = "—";
    }

    updateShoeInfo();
    updateActionButtons();
  }

  // ------- Round flow & actions -------
  function onDeal() {
    if (roundActive) return;
    const hCount = getHandsCount();
    const totalWager = betPerHand * hCount;
    if (betPerHand <= 0) return setStatus("Please place a bet first.");
    if (totalWager > bank) return setStatus("Total wager exceeds your bank. Lower bet or hands.");

    bank -= totalWager;
    saveBank();
    updateBankBadge();

    hands = Array.from({ length: hCount }, () => ({
      cards: [],
      bet: betPerHand,
      stood: false,
      doubled: false,
      splitUsed: false,
      insurance: 0,
      finished: false,
      hitOnce: false,
    }));
    activeIndex = 0;
    dealer = { cards: [] };
    roundActive = true;
    insuranceOffered = false;

    for (let i = 0; i < 2; i++) {
      for (let h = 0; h < hands.length; h++) hands[h].cards.push(drawCard());
      dealer.cards.push(drawCard());
    }

    if (dealer.cards[0].r === "A") {
      insuranceOffered = true;
      setStatus("Dealer shows Ace. You may take Insurance (2:1) before acting.");
    } else {
      setStatus("Your move on Hand 1: Hit, Stand, Double, or Split (if allowed).");
    }

    const anyPlayerBJ = hands.some((h) => isBlackjack(h.cards));
    const dealerBJ = isBlackjack(dealer.cards);

    renderTable(true);

    if (dealerBJ) {
      settleAll(true);
      return;
    }
    if (anyPlayerBJ) {
      for (const hand of hands) {
        if (isBlackjack(hand.cards)) {
          const payout = Math.floor(hand.bet * 3 / 2) + hand.bet;
          bank += payout;
          saveBank();
          hand.finished = true;
        }
      }
      if (hands.every((h) => h.finished)) endRound();
    }
    renderTable(true);
  }

  function onHit() {
    const hand = hands[activeIndex];
    if (!roundActive || !hand || hand.finished) return;
    hand.cards.push(drawCard());
    hand.hitOnce = true;
    if (handValue(hand.cards) > 21) {
      hand.finished = true;
      advanceHandOrDealer();
    } else {
      setStatus(`Hand ${activeIndex + 1}: Hit again or Stand.`);
    }
    renderTable(true);
  }

  function onStand() {
    const hand = hands[activeIndex];
    if (!roundActive || !hand || hand.finished) return;
    hand.stood = true;
    hand.finished = true;
    advanceHandOrDealer();
    renderTable(true);
  }

  function onDouble() {
    const hand = hands[activeIndex];
    if (!roundActive || !hand || hand.finished) return;
    if (hand.cards.length !== 2) return;
    if (bank < hand.bet) return setStatus("Not enough chips to double.");

    bank -= hand.bet;
    saveBank();
    updateBankBadge();
    hand.doubled = true;
    hand.cards.push(drawCard());
    hand.hitOnce = true;
    hand.finished = true;
    advanceHandOrDealer();
    renderTable(true);
  }

  function onSplit() {
    const hand = hands[activeIndex];
    if (!roundActive || !hand || hand.finished) return;
    if (!canSplit(hand)) return;
    if (bank < hand.bet) return setStatus("Not enough chips to split.");

    const [c1, c2] = hand.cards;
    const second: Hand = {
      cards: [c2],
      bet: hand.bet,
      stood: false,
      doubled: false,
      splitUsed: false,
      insurance: 0,
      finished: false,
      hitOnce: false,
    };
    hand.cards = [c1];
    hand.splitUsed = true;

    bank -= hand.bet;
    saveBank();
    updateBankBadge();

    hands.splice(activeIndex + 1, 0, second);

    hand.cards.push(drawCard());
    second.cards.push(drawCard());

    if (c1.r === "A" && c2.r === "A") {
      hand.finished = true;
      second.finished = true;
      setStatus("Split Aces: one card each, then stand.");
      advanceHandOrDealer();
    } else {
      setStatus(`Split complete. Continue playing Hand ${activeIndex + 1}.`);
    }
    renderTable(true);
  }

  function onInsurance() {
    const hand = hands[activeIndex];
    if (!roundActive || !hand || hand.finished || !insuranceOffered) return;
    if (hand.insurance > 0) return;
    const ins = Math.floor(hand.bet / 2);
    if (bank < ins) return setStatus("Not enough chips for insurance.");

    bank -= ins;
    saveBank();
    updateBankBadge();
    hand.insurance = ins;
    setStatus(`Insurance taken on Hand ${activeIndex + 1}.`);
    renderTable(true);
  }

  function advanceHandOrDealer() {
    const next = hands.findIndex((h, idx) => idx > activeIndex && !h.finished);
    if (next !== -1) {
      activeIndex = next;
      setStatus(`Hand ${activeIndex + 1}: Your move.`);
      return;
    }
    dealerPlayAndSettle();
  }

  function dealerPlayAndSettle() {
    renderTable(false);
    while (handValue(dealer.cards) < 17) {
      dealer.cards.push(drawCard());
      renderTable(false);
    }
    settleAll(false);
  }

  // Compute and post ONE delta for the whole round
  function settleAll(naturalCheck: boolean) {
    const dealerBJ = isBlackjack(dealer.cards);
    const dealerVal = handValue(dealer.cards);

    // total delta vs start-of-round (bets were already deducted at deal time)
    let roundDelta = 0;

    if (dealerBJ) {
      for (const hand of hands) {
        if (hand.insurance > 0) {
          bank += hand.insurance * 3; // return stake + 2:1
          roundDelta += hand.insurance * 3; // affects bank the same way here
          hand.insurance = 0;
        }
      }
      saveBank();
      updateBankBadge();
    }

    for (const hand of hands) {
      if (hand.paid) continue;

      const pv = handValue(hand.cards);
      const stake = hand.doubled ? hand.bet * 2 : hand.bet; // how much we actually risked this hand
      let payout = 0;

      if (naturalCheck && dealerBJ) {
        // only push natural vs natural
        if (isBlackjack(hand.cards)) {
          payout = stake; // push returns stake
        }
      } else {
        if (pv > 21) {
          payout = 0; // loss: we already deducted stake at deal time
          roundDelta -= stake;
        } else if (dealerVal > 21 || pv > dealerVal) {
          payout = stake * 2; // win -> return stake + win
          roundDelta += stake; // net vs start: +stake
        } else if (pv === dealerVal) {
          payout = stake; // push -> return stake
          // net 0
        } else {
          payout = 0; // loss
          roundDelta -= stake;
        }
      }

      if (payout > 0) {
        bank += payout;
        saveBank();
      }
      hand.paid = true;
    }

    updateBankBadge();
    endRound();

    // Fire-and-forget report (guest users will just be ignored by the backend)
    reportResult(roundDelta > 0, roundDelta);
  }

  function endRound() {
    roundActive = false;
    setStatus("Round complete. Start a new round or adjust your bet.");
    updateActionButtons();
    newRoundBtn.disabled = false;
  }

  function onNewRound() {
    for (const h of hands) discard.push(...h.cards);
    discard.push(...dealer.cards);
    hands = [];
    dealer = { cards: [] };
    activeIndex = 0;
    roundActive = false;
    insuranceOffered = false;
    setStatus("Place your bet to begin.");
    renderTable(true);
  }

  function renderHandsSimpleWhenNoGame() {
    dealerCardsEl.innerHTML = "";
    playerCardsEl.innerHTML = "";
    dealerScoreEl.textContent = "Score: —";
    playerScoreEl.textContent = "Score: —";
  }

  // ------- Event wiring (and teardown tracking) -------
  const teardown: Array<() => void> = [];

  function on(el: Element | Document | Window, ev: string, fn: any) {
    el.addEventListener(ev, fn as any);
    teardown.push(() => el.removeEventListener(ev, fn as any));
  }

  function wireEvents() {
    chipButtons.forEach((btn) => {
      const handler = () => {
        if (roundActive) return;
        const add = parseInt(btn.dataset.chip!, 10);
        if (bank <= 0) return;
        betPerHand = Math.min(bank, betPerHand + add);
        updateBetLabel();
        updateTotalWager();
      };
      on(btn, "click", handler);
    });

    on(clearBetBtn, "click", () => {
      if (roundActive) return;
      betPerHand = 0;
      updateBetLabel();
      updateTotalWager();
    });

    on(handsSelect, "change", updateTotalWager);

    on(dealBtn, "click", onDeal);
    on(newRoundBtn, "click", onNewRound);
    on(hitBtn, "click", onHit);
    on(standBtn, "click", onStand);
    on(doubleBtn, "click", onDouble);
    on(splitBtn, "click", onSplit);
    on(insuranceBtn, "click", onInsurance);

    on(resetBankBtn, "click", () => {
      bank = START_BANK;
      saveBank();
      updateBankBadge();
      setStatus("Bank reset to 500 chips.");
    });

    if (deckSelectEl) {
      on(deckSelectEl, "change", async () => {
        const val = deckSelectEl.value;
        localStorage.setItem(DECK_KEY, val);
        if (val === "text") {
          cardTextures = {};
          deckBackImage = "";
        } else {
          await loadDeckTheme(val);
        }
        renderTable(roundActive);
        setStatus(`Deck changed to ${val === "text" ? "Text Only" : val}.`);
      });
    }
  }

  // Public cleanup
  function destroy() {
    console.log("[BJ] destroy");
    teardown.forEach((fn) => fn());
    window.removeEventListener("storage", storageHandler);
  }

  return { destroy };
}
