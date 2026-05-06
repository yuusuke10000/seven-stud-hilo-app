import { makeDeck, shuffleInPlace } from "./cards.js";
import { fmtNum } from "./formatters.js";

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function createPlayers(cpuCount, startChips) {
  const nCpu = clamp(cpuCount, 1, 5);
  const players = [];
  players.push({ seatId: 0, kind: "hero", seatName: "あなた", startChips });
  for (let i = 1; i <= nCpu; i++) {
    players.push({ seatId: i, kind: "cpu", seatName: `CPU ${i}`, startChips });
  }
  return players;
}

export function createDeckForHand(random = Math.random) {
  return shuffleInPlace(makeDeck(), random);
}

export function createInitialGameState(options = {}) {
  const cpuCount = clamp(options.cpuCount ?? 5, 1, 5);
  const startChips = Number(options.startChips ?? 1000);
  const ante = Number(options.ante ?? 10);
  const sb = Number(options.sb ?? 10);
  const bb = Number(options.bb ?? 20);

  const players = createPlayers(cpuCount, startChips);
  const n = players.length;

  const stacks = Array.from({ length: n }, () => startChips);
  const hands = Array.from({ length: n }, () => []);
  const folded = Array.from({ length: n }, () => false);
  const allIn = Array.from({ length: n }, () => false);
  const totalCommitted = Array.from({ length: n }, () => 0);

  return {
    view: { cpuChoices: [1, 3, 5], cpuCount, isShowdown: false },
    settings: { cpuCount, startChips, ante, sb, bb },
    hud: { ante, sb, bb, cpuCount },

    // core-ish state (future migration targets)
    players,
    seats: [],
    hands,
    stacks,
    folded,
    allIn,
    totalCommitted,
    pot: { amount: 0, amountText: fmtNum(0) },
    deck: [],
    phase: "INIT",
    showdown: false,
    lastActions: Array.from({ length: n }, () => ""),
    lastResult: null,

    // UI helpers (kept similar to mockGameState for now)
    mockResult: { miniLog: [], winnerSeatIds: [] },
    supportAi: { mode: "fixed", text: "—" },
    handRanks: {
      high: ["フォーカード以上", "フルハウス", "フラッシュ", "ストレート", "スリーカード", "ツーペア", "ワンペア", "ハイカード"],
      low: ["5 TOP", "6 TOP", "7 TOP", "8 TOP", "ローなし"],
      activeHigh: null,
      activeLow: null,
    },
  };
}

export function dealInitialStudCards(state) {
  // Third street only: 2 down + 1 up (no fold/all-in effect here; later streets will care).
  const n = state.players.length;
  const deck = state.deck.slice();
  const hands = state.hands.map((h) => h.slice());

  function pop() {
    return deck.pop();
  }

  for (let round = 0; round < 2; round++) {
    for (let s = 0; s < n; s++) {
      const c = pop();
      if (!c) break;
      hands[s].push({ ...c, faceUp: false });
    }
  }
  for (let s = 0; s < n; s++) {
    const c = pop();
    if (!c) break;
    hands[s].push({ ...c, faceUp: true });
  }

  return { ...state, deck, hands };
}

export function createNewHandState(options = {}) {
  const base = createInitialGameState(options);
  const random = options.random ?? Math.random;
  const deck = createDeckForHand(random);
  const withDeck = { ...base, deck, phase: "THIRD", showdown: false, view: { ...base.view, isShowdown: false } };

  // simplistic ante posting (keeps totalCommitted/pot in shape)
  const n = withDeck.players.length;
  const ante = Number(withDeck.settings.ante ?? 0);
  const stacks = withDeck.stacks.slice();
  const totalCommitted = withDeck.totalCommitted.slice();
  let potAmt = 0;
  for (let s = 0; s < n; s++) {
    const pay = Math.max(0, Math.min(stacks[s], ante));
    stacks[s] -= pay;
    totalCommitted[s] += pay;
    potAmt += pay;
  }

  let st = { ...withDeck, stacks, totalCommitted, pot: { amount: potAmt, amountText: fmtNum(potAmt) } };
  st = dealInitialStudCards(st);

  // initialize seats (UI-friendly)
  st = rebuildSeatsFromCore(st);
  return st;
}

function rebuildSeatsFromCore(state) {
  const n = state.players.length;
  const seats = [];
  for (let i = 0; i < n; i++) {
    const p = state.players[i];
    const folded = !!state.folded[i];
    const allIn = !!state.allIn[i] && !folded;
    const cards = (state.hands[i] || []).map((c) => {
      // UI Card expects r/s strings; keep it readable here.
      const suitChar = ["♠", "♥", "♦", "♣"][c.s] ?? "?";
      const r =
        c.r >= 2 && c.r <= 10 ? String(c.r) : c.r === 11 ? "J" : c.r === 12 ? "Q" : c.r === 13 ? "K" : c.r === 14 ? "A" : "?";
      return { r, s: suitChar, faceUp: !!c.faceUp };
    });
    seats.push({
      seatId: i,
      kind: p.kind,
      seatName: p.seatName,
      stack: state.stacks[i] ?? 0,
      folded,
      allIn,
      winner: false,
      lastActionText: folded ? "フォールド" : state.lastActions[i] || "",
      cards,
      // placeholder role texts (future: computed via engine evaluators)
      highText: state.view.isShowdown && !folded ? "ハイ：—" : "",
      lowText: state.view.isShowdown && !folded ? "ロー：—" : "",
    });
  }
  return { ...state, seats };
}

/**
 * Display-only actions (no full game progression yet).
 * The goal is to let UI confirm Fold/All-in/Winner/Showdown differences with core-like state fields.
 */
export function applyMockAction(state, action) {
  const type = action?.type;
  const next = { ...state };

  if (type === "SET_SHOWDOWN") {
    next.view = { ...next.view, isShowdown: !!action.value };
    next.showdown = !!action.value;
  }

  if (type === "SET_FOLD_SAMPLE") {
    const enabled = !!action.value;
    next.folded = next.folded.slice();
    // Example: fold CPU3 if exists
    if (next.players.length > 3) next.folded[3] = enabled;
    if (enabled) {
      // do not treat all-in as fold; if folded, clear all-in flag for that seat.
      next.allIn = next.allIn.slice();
      next.allIn[3] = false;
    }
  }

  if (type === "SET_ALLIN_SAMPLE") {
    const enabled = !!action.value;
    next.allIn = next.allIn.slice();
    // Example: all-in CPU2 if exists
    if (next.players.length > 2) next.allIn[2] = enabled;
    if (enabled) {
      next.folded = next.folded.slice();
      next.folded[2] = false;
    }
  }

  if (type === "SET_WINNER_SAMPLE") {
    // winners are on seats (UI-only), and must not apply to folded seats.
    const enabled = !!action.value;
    // We'll mark hero + CPU1 + CPU2 as winners if present.
    next._winnersEnabled = enabled;
  }

  // rebuild UI seats (winner flags etc.)
  let out = rebuildSeatsFromCore(next);
  if (next._winnersEnabled) {
    out.seats = out.seats.map((s) => {
      const wants = s.seatId === 0 || s.seatId === 1 || s.seatId === 2;
      return { ...s, winner: wants && !s.folded };
    });
  }

  // Mini-log is still mock-ish, but uses seatIds (no hand number).
  out.mockResult = {
    miniLog: [
      { kind: "sep" },
      { kind: "delta", seatId: 0, delta: +120, roleText: "ハイ：ワンペア" },
      ...(out.players.length > 1 ? [{ kind: "delta", seatId: 1, delta: -60, roleText: "" }] : []),
      ...(out.players.length > 2 ? [{ kind: "delta", seatId: 2, delta: -60, roleText: "" }] : []),
      { kind: "sep" },
      { kind: "delta", seatId: 0, delta: -20, roleText: "" },
      ...(out.players.length > 1 ? [{ kind: "delta", seatId: 1, delta: +20, roleText: "ロー：8 TOP" }] : []),
    ],
    winnerSeatIds: out.seats.filter((s) => s.winner).map((s) => s.seatId),
  };

  return out;
}

