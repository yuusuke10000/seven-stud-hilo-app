import { makeDeck, shuffleInPlace } from "./cards.js";
import { fmtNum } from "./formatters.js";
import { bestHighFromSeven, bestLowFromSeven, compareKeysHigh, compareLowKeys, lowLadderShortJa } from "./handEvaluator.js";
import { buildSidePotsFromTotals, splitPotAmounts } from "./sidePot.js";

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
  const betUnit = Number(options.betUnit ?? 20);

  const players = createPlayers(cpuCount, startChips);
  const n = players.length;

  const stacks = Array.from({ length: n }, () => startChips);
  const hands = Array.from({ length: n }, () => []);
  const folded = Array.from({ length: n }, () => false);
  const allIn = Array.from({ length: n }, () => false);
  const totalCommitted = Array.from({ length: n }, () => 0);

  return {
    view: { cpuChoices: [1, 3, 5], cpuCount, isShowdown: false },
    settings: { cpuCount, startChips, ante, sb, bb, betUnit },
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
    street: "INIT",
    betting: {
      target: 0,
      invested: Array.from({ length: n }, () => 0),
      toAct: 0,
      acted: Array.from({ length: n }, () => false),
      closed: true,
    },
    lastActions: Array.from({ length: n }, () => ""),
    lastResult: null,
    handStartStacks: Array.from({ length: n }, () => startChips),

    // UI helpers
    mockResult: { miniLog: [], winnerSeatIds: [] },
    supportAi: null,
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
  const withDeck = {
    ...base,
    deck,
    phase: "THIRD",
    street: "THIRD",
    showdown: false,
    view: { ...base.view, isShowdown: false },
  };

  // simplistic ante posting (keeps totalCommitted/pot in shape)
  const n = withDeck.players.length;
  const ante = Number(withDeck.settings.ante ?? 0);
  const stacks = withDeck.stacks.slice();
  const totalCommitted = withDeck.totalCommitted.slice();
  let potAmt = 0;
  const handStartStacks = stacks.slice();
  for (let s = 0; s < n; s++) {
    const pay = Math.max(0, Math.min(stacks[s], ante));
    stacks[s] -= pay;
    totalCommitted[s] += pay;
    potAmt += pay;
  }

  let st = {
    ...withDeck,
    stacks,
    handStartStacks,
    totalCommitted,
    pot: { amount: potAmt, amountText: fmtNum(potAmt) },
  };
  st = dealInitialStudCards(st);
  st = startBettingRound(st);

  // initialize seats (UI-friendly)
  st = rebuildSeatsFromCore(st);
  return st;
}

function activeSeatIds(state) {
  const ids = [];
  for (let i = 0; i < state.players.length; i++) {
    if (state.folded[i]) continue;
    ids.push(i);
  }
  return ids;
}

function startBettingRound(state) {
  const n = state.players.length;
  const prevRound = Number(state.betting?.round ?? 0);
  return {
    ...state,
    betting: {
      round: prevRound + 1,
      target: 0,
      invested: Array.from({ length: n }, () => 0),
      currentActor: firstActor(state),
      toAct: firstActor(state),
      acted: Array.from({ length: n }, () => false),
      closed: false,
    },
  };
}

function firstActor(state) {
  // Simple: hero acts first unless folded/all-in.
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    const s = i;
    if (state.folded[s]) continue;
    if (state.allIn[s]) continue;
    return s;
  }
  return 0;
}

function nextActor(state, from) {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const s = (from + step) % n;
    if (state.folded[s]) continue;
    if (state.allIn[s]) continue;
    if (state.betting.acted[s]) continue;
    return s;
  }
  return null;
}

function closeBettingIfDone(state) {
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    if (state.folded[i]) continue;
    if (state.allIn[i]) continue;
    if (!state.betting.acted[i]) return state;
    if (state.betting.invested[i] !== state.betting.target) return state;
  }
  return { ...state, betting: { ...state.betting, closed: true, toAct: null, currentActor: null } };
}

function pay(state, seatId, amount, lastActionText) {
  const stacks = state.stacks.slice();
  const totalCommitted = state.totalCommitted.slice();
  const invested = state.betting.invested.slice();
  const lastActions = state.lastActions.slice();
  let potAmt = state.pot.amount;

  const payAmt = Math.max(0, Math.min(stacks[seatId], amount));
  stacks[seatId] -= payAmt;
  invested[seatId] += payAmt;
  totalCommitted[seatId] += payAmt;
  potAmt += payAmt;
  lastActions[seatId] = lastActionText || "";

  const allIn = state.allIn.slice();
  if (stacks[seatId] <= 0 && payAmt > 0) allIn[seatId] = true;

  const betting = { ...state.betting, invested };
  if (invested[seatId] > betting.target) betting.target = invested[seatId];

  return {
    ...state,
    stacks,
    totalCommitted,
    allIn,
    lastActions,
    betting,
    pot: { amount: potAmt, amountText: fmtNum(potAmt) },
  };
}

function applyFold(state, seatId) {
  const folded = state.folded.slice();
  folded[seatId] = true;
  const allIn = state.allIn.slice();
  allIn[seatId] = false;
  const lastActions = state.lastActions.slice();
  lastActions[seatId] = "フォールド";
  return { ...state, folded, allIn, lastActions };
}

function ensureBettingOpen(state) {
  if (!state.betting || state.betting.closed) return startBettingRound(state);
  return state;
}

function applyBetLike(state, seatId, mult) {
  const st = ensureBettingOpen(state);
  const target = st.betting.target;
  const betUnit = Number(st.settings.betUnit || 0);
  if (mult === 1 && target > 0) {
    // 既存仕様の完全再現が難しいため、React版プロトタイプでは single は「最小レイズ」ではなく call 相当に寄せる。
    return applyCall(st, seatId);
  }
  const desired = target > 0 ? target * mult : betUnit * mult;
  const extra = Math.max(0, desired - st.betting.invested[seatId]);
  return pay(st, seatId, extra, mult === 1 ? `シングル ${extra}` : mult === 2 ? `ダブル ${extra}` : `トリプル ${extra}`);
}

function applyCall(state, seatId) {
  const st = ensureBettingOpen(state);
  const toCall = Math.max(0, st.betting.target - st.betting.invested[seatId]);
  if (toCall <= 0) return applyCheck(st, seatId);
  const stack = st.stacks[seatId] ?? 0;
  const payAmt = Math.min(stack, toCall);
  if (payAmt <= 0) return applyFold(st, seatId);
  const suffix = payAmt < toCall ? "（オールイン）" : "";
  return pay(st, seatId, payAmt, `コール ${payAmt}${suffix}`);
}

function applyCheck(state, seatId) {
  const st = ensureBettingOpen(state);
  const toCall = Math.max(0, st.betting.target - st.betting.invested[seatId]);
  if (toCall > 0) return st; // UI側で無効化する。保険として何もしない。
  const lastActions = st.lastActions.slice();
  lastActions[seatId] = "チェック";
  return { ...st, lastActions };
}

function applyAllIn(state, seatId) {
  const st = ensureBettingOpen(state);
  const amt = st.stacks[seatId] ?? 0;
  return pay(st, seatId, amt, "オールイン");
}

function markActedAndAdvance(state, seatId) {
  let st = state;
  const acted = st.betting.acted.slice();
  acted[seatId] = true;
  st = { ...st, betting: { ...st.betting, acted } };
  st = closeBettingIfDone(st);
  if (st.betting.closed) return st;
  const next = nextActor(st, seatId);
  return { ...st, betting: { ...st.betting, toAct: next, currentActor: next } };
}

function resolveIfFoldSurvivor(state) {
  const alive = activeSeatIds(state);
  if (alive.length !== 1) return state;
  const winner = alive[0];
  // Everyone else folded. Winner receives whole pot.
  const stacks = state.stacks.slice();
  stacks[winner] += state.pot.amount;
  const lastResult = {
    kind: "fold_survivor",
    winnerSeatId: winner,
    awards: stacks.map((_, i) => (i === winner ? state.pot.amount : 0)),
    pot: state.pot.amount,
  };
  const st = {
    ...state,
    stacks,
    lastResult,
    phase: "RESULT",
    street: "RESULT",
    view: { ...state.view, isShowdown: false },
    pot: { amount: 0, amountText: fmtNum(0) },
  };
  return finalizeHand(st);
}

export function dealNextStreet(state) {
  const n = state.players.length;
  const deck = state.deck.slice();
  const hands = state.hands.map((h) => h.slice());
  const street = state.street;

  function pop() {
    return deck.pop();
  }

  const shouldDeal = (seatId) => {
    if (state.folded[seatId]) return false;
    return true; // all-in stays eligible for cards
  };

  if (street === "THIRD") {
    for (let s = 0; s < n; s++) {
      if (!shouldDeal(s)) continue;
      const c = pop();
      if (!c) break;
      hands[s].push({ ...c, faceUp: true });
    }
    return { ...state, deck, hands, street: "FOURTH", phase: "FOURTH" };
  }
  if (street === "FOURTH") {
    for (let s = 0; s < n; s++) {
      if (!shouldDeal(s)) continue;
      const c = pop();
      if (!c) break;
      hands[s].push({ ...c, faceUp: true });
    }
    return { ...state, deck, hands, street: "FIFTH", phase: "FIFTH" };
  }
  if (street === "FIFTH") {
    for (let s = 0; s < n; s++) {
      if (!shouldDeal(s)) continue;
      const c = pop();
      if (!c) break;
      hands[s].push({ ...c, faceUp: true });
    }
    return { ...state, deck, hands, street: "SIXTH", phase: "SIXTH" };
  }
  if (street === "SIXTH") {
    for (let s = 0; s < n; s++) {
      if (!shouldDeal(s)) continue;
      const c = pop();
      if (!c) break;
      hands[s].push({ ...c, faceUp: false });
    }
    return { ...state, deck, hands, street: "SEVENTH", phase: "SEVENTH" };
  }
  return state;
}

export function advanceStreet(state) {
  if (state.street === "THIRD") return startBettingRound(rebuildSeatsFromCore(dealNextStreet(state)));
  if (state.street === "FOURTH") return startBettingRound(rebuildSeatsFromCore(dealNextStreet(state)));
  if (state.street === "FIFTH") return startBettingRound(rebuildSeatsFromCore(dealNextStreet(state)));
  if (state.street === "SIXTH") return startBettingRound(rebuildSeatsFromCore(dealNextStreet(state)));
  if (state.street === "SEVENTH") return showdownAndPayoutForReact(state);
  return state;
}

function cpuChooseAction(state, seatId) {
  const toCall = Math.max(0, state.betting.target - state.betting.invested[seatId]);
  const st = state.stacks[seatId] ?? 0;
  if (st <= 0) return { type: "check" };
  if (toCall === 0) {
    // small chance to bet
    return Math.random() < 0.18 ? { type: "single" } : { type: "check" };
  }
  if (toCall > 0) {
    if (st < toCall) return { type: "allin" };
    return Math.random() < 0.22 ? { type: "fold" } : { type: "call" };
  }
  return { type: "check" };
}

export function applyCpuAction(state) {
  let st = state;
  while (!st.betting.closed && st.betting.toAct != null && st.players[st.betting.toAct]?.kind === "cpu") {
    const seatId = st.betting.toAct;
    const act = cpuChooseAction(st, seatId);
    st = applyPlayerAction(st, seatId, act.type);
  }
  return st;
}

export function applyPlayerAction(state, seatId, actionType) {
  let st = state;
  if (st.folded[seatId] || st.allIn[seatId]) return st;
  if (!st.betting.closed && st.betting.toAct != null && st.betting.toAct !== seatId) {
    // Not your turn in this simple engine.
    return st;
  }

  if (actionType === "fold") st = applyFold(st, seatId);
  else if (actionType === "check") st = applyCheck(st, seatId);
  else if (actionType === "call") st = applyCall(st, seatId);
  else if (actionType === "single") st = applyBetLike(st, seatId, 1);
  else if (actionType === "double") st = applyBetLike(st, seatId, 2);
  else if (actionType === "triple") st = applyBetLike(st, seatId, 3);
  else if (actionType === "allin") st = applyAllIn(st, seatId);

  if (actionType === "fold") {
    st = resolveIfFoldSurvivor(st);
    if (st.street === "RESULT") return rebuildSeatsFromCore(st);
  }

  if (!st.betting.closed) {
    st = markActedAndAdvance(st, seatId);
  }
  st = rebuildSeatsFromCore(st);
  st = applyCpuAction(st);
  st = rebuildSeatsFromCore(st);
  return st;
}

export function applyGameAction(state, action) {
  const type = action?.type;
  if (type === "NEW_HAND") {
    const next = createNewHandState({
      cpuCount: state.settings.cpuCount,
      startChips: state.settings.startChips,
      ante: state.settings.ante,
      sb: state.settings.sb,
      bb: state.settings.bb,
      betUnit: state.settings.betUnit,
    });
    // keep mini log (do not reset)
    next.mockResult = state.mockResult || { miniLog: [], winnerSeatIds: [] };
    return next;
  }
  if (type === "ADVANCE_STREET") return rebuildSeatsFromCore(advanceStreet(state));
  if (type === "FORCE_SHOWDOWN") return showdownAndPayoutForReact(state);
  if (type === "PLAYER_ACTION") {
    const seatId = action.seatId ?? 0;
    return applyPlayerAction(state, seatId, action.actionType);
  }
  return state;
}

export function showdownAndPayoutForReact(state) {
  const n = state.players.length;
  const folded = state.folded;
  const tc = state.totalCommitted;

  const sidePots = buildSidePotsFromTotals(tc, folded, n);
  const awards = Array(n).fill(0);
  const potDetails = [];

  const hiEvals = Array(n).fill(null);
  const loEvals = Array(n).fill(undefined);

  for (const sp of sidePots) {
    const elig = sp.eligiblePlayers.filter((i) => !folded[i]);
    if (!elig.length) continue;
    for (const i of elig) {
      if (hiEvals[i] == null) hiEvals[i] = bestHighFromSeven(state.hands[i]);
      if (loEvals[i] === undefined) loEvals[i] = bestLowFromSeven(state.hands[i]);
    }
    let bestHiKey = null;
    for (const i of elig) {
      const hi = hiEvals[i];
      if (!bestHiKey || compareKeysHigh(hi.key, bestHiKey) > 0) bestHiKey = hi.key;
    }
    const highWinners = elig.filter((i) => compareKeysHigh(hiEvals[i].key, bestHiKey) === 0);

    const qual = [];
    for (const i of elig) {
      const lo = loEvals[i];
      if (lo) qual.push({ i, low: lo });
    }
    let lowWinners = [];
    let lowOk = false;
    if (qual.length) {
      lowOk = true;
      let bestK = qual[0].low.key;
      for (const q of qual) {
        if (compareLowKeys(q.low.key, bestK) < 0) bestK = q.low.key;
      }
      lowWinners = qual.filter((q) => compareLowKeys(q.low.key, bestK) === 0).map((q) => q.i);
    }

    const sub = splitPotAmounts(sp.amount, highWinners, lowWinners, lowOk, n);
    for (let i = 0; i < n; i++) awards[i] += sub[i] || 0;
    potDetails.push({
      label: sp.label,
      amount: sp.amount,
      eligible: elig,
      highWinners,
      lowWinners,
      lowOk,
      scoop: lowOk && highWinners.length === 1 && lowWinners.length === 1 && highWinners[0] === lowWinners[0],
    });
  }

  const stacks = state.stacks.slice();
  for (let i = 0; i < n; i++) stacks[i] += awards[i] || 0;

  const lastResult = {
    kind: "showdown",
    potDetails,
    awards,
    hiEvals: hiEvals.map((h) => (h ? { nameJa: h.nameJa, detailJa: h.detailJa } : null)),
    loEvals: loEvals.map((l) => (l ? { ladderJa: lowLadderShortJa(l), labelJa: l.labelJa } : null)),
  };

  let out = {
    ...state,
    stacks,
    lastResult,
    view: { ...state.view, isShowdown: true },
    showdown: true,
    phase: "RESULT",
    street: "RESULT",
    pot: { amount: 0, amountText: fmtNum(0) },
  };

  out = rebuildSeatsFromCore(out);
  out.seats = out.seats.map((s) => ({ ...s, winner: (awards[s.seatId] ?? 0) > 0 && !s.folded }));
  out = finalizeHand(out);
  return out;
}

function finalizeHand(state) {
  // Append mini-log delta lines; do not reset existing mini-log.
  const n = state.players.length;
  const prev = state.mockResult?.miniLog || [];
  const start = state.handStartStacks || state.stacks;
  const items = prev.slice();
  items.push({ kind: "sep" });
  for (let i = 0; i < n; i++) {
    const delta = (state.stacks[i] ?? 0) - (start[i] ?? 0);
    if (delta === 0) continue;
    // show role of winners only (simple)
    const roleText =
      delta > 0 && state.lastResult?.kind === "showdown"
        ? state.lastResult.hiEvals?.[i]?.nameJa
          ? `ハイ：${state.lastResult.hiEvals[i].nameJa}`
          : ""
        : "";
    items.push({ kind: "delta", seatId: i, delta, roleText });
  }
  return {
    ...state,
    mockResult: {
      miniLog: items,
      winnerSeatIds: state.seats.filter((s) => s.winner).map((s) => s.seatId),
    },
  };
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
      // placeholder role texts (actual evals are computed in selector using state.hands)
      highText: "",
      lowText: "",
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

