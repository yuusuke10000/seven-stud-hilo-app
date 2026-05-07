const SETTINGS_KEY = "studHiloLearn_settings_v1";
const STATS_KEY = "studHiloLearn_stats_v3";
const HISTORY_KEY = "studHiloLearn_history_v1";
const LEGACY_STATS_KEY = "studHiloLearn_stats_v2";

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function pickOne(v, allowed, fallback) {
  const n = Number(v);
  return allowed.includes(n) ? n : fallback;
}

export function defaultSettings() {
  return {
    cpuCount: 1,
    startChips: 1000,
    ante: 10,
    betUnit: 20,
    difficulty: "normal",
    playSpeed: "normal",
    animations: true,
    sound: false,
    foldConfirm: true,
    blindsOn: true,
    smallBlind: 10,
    bigBlind: 20,
    playerSeatPosition: "right-bottom",
  };
}

const PLAYER_SEAT_POSITIONS = [
  "right-bottom",
  "right-middle",
  "right-top",
  "left-bottom",
  "left-middle",
  "left-top",
];

function normalizeBlinds(sb, bb, d) {
  const smallBlind = [5, 10, 20].includes(Number(sb)) ? Number(sb) : d.smallBlind;
  let bigBlind = [10, 20, 50].includes(Number(bb)) ? Number(bb) : d.bigBlind;
  if (bigBlind < smallBlind) {
    const opts = [10, 20, 50];
    bigBlind = opts.find((x) => x >= smallBlind) || opts[opts.length - 1];
  }
  return { smallBlind, bigBlind };
}

export function loadSettings() {
  const d = defaultSettings();
  const o = safeParse(globalThis?.localStorage?.getItem?.(SETTINGS_KEY), null);
  if (!o) return d;
  const rawCpu = Number(o.cpuCount);
  const cpuCount = Number.isFinite(rawCpu)
    ? Math.min(5, Math.max(1, rawCpu))
    : d.cpuCount;
  const startChips = pickOne(o.startChips, [500, 1000, 2000], d.startChips);
  const ante = pickOne(o.ante, [5, 10, 20], d.ante);
  const betUnit = pickOne(o.betUnit, [10, 20, 50], d.betUnit);
  const difficulty = ["easy", "normal", "hard"].includes(o.difficulty) ? o.difficulty : d.difficulty;
  const playSpeed = ["slow", "normal", "fast"].includes(o.playSpeed) ? o.playSpeed : d.playSpeed;
  const animations = o.animations === false ? false : o.animations === true ? true : d.animations;
  const sound = o.sound === true ? true : o.sound === false ? false : d.sound;
  const foldConfirm = o.foldConfirm === false ? false : o.foldConfirm === true ? true : d.foldConfirm;
  const blindsOn = o.blindsOn === false ? false : o.blindsOn === true ? true : d.blindsOn;
  const playerSeatPosition = PLAYER_SEAT_POSITIONS.includes(o.playerSeatPosition) ? o.playerSeatPosition : d.playerSeatPosition;
  const { smallBlind, bigBlind } = normalizeBlinds(o.smallBlind, o.bigBlind, d);
  return {
    cpuCount,
    startChips,
    ante,
    betUnit,
    difficulty,
    playSpeed,
    animations,
    sound,
    foldConfirm,
    blindsOn,
    smallBlind,
    bigBlind,
    playerSeatPosition,
  };
}

export function saveSettings(settings) {
  globalThis?.localStorage?.setItem?.(SETTINGS_KEY, JSON.stringify(settings));
}

export function defaultStats(startChips = 1000) {
  const sc = Number(startChips) || 1000;
  return {
    totalGames: 0,
    totalHands: 0,
    playerWins: 0,
    cpuWins: 0,
    playerHighWins: 0,
    playerLowWins: 0,
    playerScoops: 0,
    maxPotWon: 0,
    playerChips: sc,
    cpuStacks: Array(5).fill(sc),
    totalChipsWon: 0,
    totalChipsLost: 0,
    maxChipsReached: sc,
    minChipsReached: sc,
    playerFolds: 0,
    showdownsReached: 0,
    handsByCpuCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    virtualChipRefills: 0,
  };
}

export function loadStats(settingsForDefaults) {
  const sc = settingsForDefaults?.startChips ?? 1000;
  const d = defaultStats(sc);
  let raw = globalThis?.localStorage?.getItem?.(STATS_KEY);
  if (!raw) raw = globalThis?.localStorage?.getItem?.(LEGACY_STATS_KEY);
  const o = safeParse(raw, null);
  if (!o) return d;

  const playerChips = o.playerChips !== undefined ? Math.max(0, Number(o.playerChips)) : d.playerChips;
  let cpuStacks = Array.isArray(o.cpuStacks) ? o.cpuStacks.map((x) => Math.max(0, Number(x) || 0)) : null;
  if (!cpuStacks && o.cpuChips !== undefined) {
    cpuStacks = [Math.max(0, Number(o.cpuChips)), d.cpuStacks[1], d.cpuStacks[2]];
  }
  if (!cpuStacks) cpuStacks = [...d.cpuStacks];
  while (cpuStacks.length < 5) cpuStacks.push(d.cpuStacks[cpuStacks.length] ?? sc);
  cpuStacks = cpuStacks.slice(0, 5);

  const hbc = o.handsByCpuCount || {};
  return {
    ...d,
    totalGames: Number(o.totalGames) || 0,
    totalHands: Number(o.totalHands) || Number(o.totalGames) || 0,
    playerWins: Number(o.playerWins) || 0,
    cpuWins: Number(o.cpuWins) || 0,
    playerHighWins: Number(o.playerHighWins) || 0,
    playerLowWins: Number(o.playerLowWins) || 0,
    playerScoops: Number(o.playerScoops) || 0,
    maxPotWon: Number(o.maxPotWon) || 0,
    playerChips: Number.isFinite(playerChips) ? playerChips : d.playerChips,
    cpuStacks,
    totalChipsWon: Number(o.totalChipsWon) || 0,
    totalChipsLost: Number(o.totalChipsLost) || 0,
    maxChipsReached: Number(o.maxChipsReached) || playerChips || d.maxChipsReached,
    minChipsReached: o.minChipsReached !== undefined ? Number(o.minChipsReached) : playerChips || d.minChipsReached,
    playerFolds: Number(o.playerFolds) || 0,
    showdownsReached: Number(o.showdownsReached) || 0,
    handsByCpuCount: {
      1: Number(hbc[1]) || 0,
      2: Number(hbc[2]) || 0,
      3: Number(hbc[3]) || 0,
      4: Number(hbc[4]) || 0,
      5: Number(hbc[5]) || 0,
    },
    virtualChipRefills: Number(o.virtualChipRefills) || 0,
  };
}

export function saveStats(stats) {
  globalThis?.localStorage?.setItem?.(STATS_KEY, JSON.stringify(stats));
  try {
    globalThis?.localStorage?.removeItem?.(LEGACY_STATS_KEY);
  } catch {
    // ignore
  }
}

export function loadHistory() {
  const a = safeParse(globalThis?.localStorage?.getItem?.(HISTORY_KEY), []);
  return Array.isArray(a) ? a.slice(0, 10) : [];
}

export function saveHistory(entries) {
  const a = Array.isArray(entries) ? entries.slice(0, 10) : [];
  globalThis?.localStorage?.setItem?.(HISTORY_KEY, JSON.stringify(a));
}

export function pushHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  saveHistory(h);
  return h;
}

/** Static app.js seatLabel と同じ（あなた / CPU n） */
export function historySeatLabel(seatId) {
  if (seatId === 0) return "あなた";
  return `CPU ${seatId}`;
}

/**
 * 静的版 app.js の pushHistory 1 件と同じフィールド形。
 * 既存 React 用の任意フィールド（id, summary 等）は付けない（静的版が読んでも無害な最小形）。
 */
export function buildHistoryEntryForStorage(just) {
  if (!just) return null;
  const awards = Array.isArray(just.awards) ? just.awards.map((x) => Number(x) || 0) : [];
  const pA = Number(awards[0]) || 0;
  let playerResult = "Lose";
  if (just.folded?.[0]) playerResult = "Fold";
  else if (just.kind === "showdown") {
    const maxA = awards.length ? Math.max(...awards) : 0;
    if (pA === 0) playerResult = "Lose";
    else if (pA === maxA && maxA > 0) {
      const cnt = awards.filter((x) => x === maxA).length;
      playerResult = cnt === 1 ? "Win" : "Split";
    } else playerResult = "Lose";
  } else if (just.kind === "fold_survivor") {
    const w =
      just.winnerSeatId != null && just.winnerSeatId >= 0
        ? just.winnerSeatId
        : awards.findIndex((x) => Number(x) > 0);
    playerResult = w === 0 ? "Win" : "Lose";
  }

  const potLayers = Array.isArray(just.potDetails) ? just.potDetails.length : 1;
  const potStart =
    just.potStart != null && Number.isFinite(Number(just.potStart))
      ? Number(just.potStart)
      : Array.isArray(just.potDetails)
        ? just.potDetails.reduce((a, p) => a + (Number(p.amount) || 0), 0)
        : 0;

  let highWinners = "—";
  let lowWinners = "—";
  let scoop = false;
  if (just.kind === "showdown") {
    const hw = Array.isArray(just.highWinners) ? just.highWinners : [];
    highWinners = hw.map(historySeatLabel).join(", ");
    lowWinners = just.lowOk ? (Array.isArray(just.lowWinners) ? just.lowWinners.map(historySeatLabel).join(", ") : "—") : "—";
    scoop = !!just.scoop;
  } else if (just.kind === "fold_survivor") {
    const w =
      just.winnerSeatId != null && just.winnerSeatId >= 0
        ? just.winnerSeatId
        : awards.findIndex((x) => Number(x) > 0);
    highWinners = w >= 0 ? historySeatLabel(w) : "—";
    lowWinners = "—";
    scoop = false;
  }

  const hiP = just.kind === "showdown" && just.hiEvals?.[0];
  const loP = just.kind === "showdown" && just.loEvals?.[0];
  const playerHigh = hiP ? `${hiP.nameJa} (${hiP.detailJa})` : "—";
  const playerLowOk = !!(just.kind === "showdown" && loP);

  const blindsOn = !!just.blindsOn;
  const handSb = Number(just.handSbSeat);
  const handBb = Number(just.handBbSeat);

  return {
    at: just.at || new Date().toISOString(),
    cpuCount: just.cpuCount ?? 1,
    pot: potStart,
    highWinners,
    lowWinners,
    scoop,
    playerResult,
    playerHigh,
    playerLowOk,
    blindsOn,
    smallBlind: blindsOn ? just.smallBlind : null,
    bigBlind: blindsOn ? just.bigBlind : null,
    sbSeat: blindsOn && Number.isFinite(handSb) && handSb >= 0 ? historySeatLabel(handSb) : null,
    bbSeat: blindsOn && Number.isFinite(handBb) && handBb >= 0 ? historySeatLabel(handBb) : null,
    hasSidePots: potLayers > 1,
    sidePotCount: potLayers,
  };
}

export function getStorageKeys() {
  return { SETTINGS_KEY, STATS_KEY, HISTORY_KEY, LEGACY_STATS_KEY };
}

