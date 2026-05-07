import { fmtNum } from "../engine/formatters.js";

const CPU_CHOICES = [1, 3, 5];

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function mockCards7() {
  return [
    { r: "A", s: "♠" },
    { r: "7", s: "♦" },
    { r: "Q", s: "♥" },
    { r: "3", s: "♣" },
    { r: "9", s: "♠" },
    { r: "2", s: "♦" },
    { r: "8", s: "♥" },
  ];
}

/**
 * UI表示確認用の擬似 GameState。
 * - 進行ロジックは持たず、ViewModel層の入力データとして扱う。
 */
export function createMockGameState({
  cpuCount = 5,
  isShowdown = false,
  withFold = true,
  withAllIn = true,
  withWinners = true,
} = {}) {
  const nCpu = clamp(cpuCount, 1, 5);

  const seats = [];
  seats.push({
    seatId: 0,
    kind: "hero",
    seatName: "あなた",
    stack: 820,
    folded: false,
    allIn: false,
    winner: !!withWinners,
    lastActionText: "チェック",
    cards: mockCards7(),
    highText: isShowdown ? "ハイ：ワンペア" : "ハイ：ワンペア",
    lowText: isShowdown ? "ロー：8 TOP" : "ロー：8 TOP",
  });

  for (let i = 1; i <= nCpu; i++) {
    const folded = !!withFold && i === 3;
    const allIn = !!withAllIn && i === 2;
    const winner = !!withWinners && (i === 1 || i === 2);
    seats.push({
      seatId: i,
      kind: "cpu",
      seatName: `CPU ${i}`,
      stack: i === 2 ? 0 : i === 4 ? 180 : i === 5 ? 2200 : 980,
      folded,
      allIn,
      winner,
      lastActionText: folded ? "フォールド" : "コール 20",
      cards: mockCards7(),
      highText: isShowdown && !folded ? "ハイ：ツーペア" : "",
      lowText: isShowdown && !folded ? "ロー：ローなし" : "",
    });
  }

  const pot = 240 + (withAllIn ? 180 : 0) + (withFold ? 40 : 0);

  return {
    view: {
      cpuChoices: CPU_CHOICES,
      cpuCount: nCpu,
      isShowdown,
    },
    hud: {
      ante: 10,
      sb: 10,
      bb: 20,
      cpuCount: nCpu,
    },
    pot: {
      amount: pot,
      amountText: fmtNum(pot),
    },
    seats,
    // Result-like mock (mini log source). No hand number shown by design.
    mockResult: {
      miniLog: [
        { kind: "sep" },
        { kind: "delta", seatId: 0, delta: +120, roleText: "ハイ：ワンペア" },
        { kind: "delta", seatId: 1, delta: -60, roleText: "" },
        { kind: "delta", seatId: 2, delta: -60, roleText: "" },
        { kind: "sep" },
        { kind: "delta", seatId: 0, delta: -20, roleText: "" },
        { kind: "delta", seatId: 1, delta: +20, roleText: "ロー：8 TOP" },
      ],
      winnerSeatIds: withWinners ? [0, 1, 2].filter((id) => id <= nCpu) : [],
    },
    // Support-AI mock (UI表示用の構造化データ)
    supportAi: isShowdown
      ? { mode: "fixed", text: "ショーダウン後です。" }
      : {
          mode: "odds",
          high: [
            { label: "フラッシュ以上", pct: 6 },
            { label: "ストレート以上", pct: 12 },
            { label: "ツーペア以上", pct: 32 },
            { label: "ワンペア以上", pct: 68 },
          ],
          low: [
            { label: "8 TOP", pct: 24 },
            { label: "7 TOP", pct: 14 },
            { label: "6 TOP", pct: 7 },
            { label: "5 TOP", pct: 2 },
            { label: "ローなし", pct: 53 },
          ],
        },
    handRanks: {
      high: ["フォーカード以上", "フルハウス", "フラッシュ", "ストレート", "スリーカード", "ツーペア", "ワンペア", "ハイカード"],
      low: ["5 TOP", "6 TOP", "7 TOP", "8 TOP", "ローなし"],
      activeHigh: isShowdown ? "ワンペア" : null,
      activeLow: isShowdown ? "8 TOP" : null,
    },
  };
}

export const MOCK_CPU_CHOICES = CPU_CHOICES;

