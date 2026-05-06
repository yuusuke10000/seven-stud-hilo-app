import { bestHighFromSeven, bestLowFromSeven, lowLadderShortJa } from "../engine/handEvaluator.js";

/**
 * HandRankPanel 用の表示データ。
 * - 見出しは出さない（UI側の責務）
 * - 5枚未満では無理に強調しない
 */
export function selectHandRankViewModel(state) {
  const base = state?.handRanks;
  const high = base?.high || [
    "フォーカード以上",
    "フルハウス",
    "フラッシュ",
    "ストレート",
    "スリーカード",
    "ツーペア",
    "ワンペア",
    "ハイカード",
  ];
  const low = base?.low || ["5 TOP", "6 TOP", "7 TOP", "8 TOP", "ローなし"];

  const hand = state?.hands?.[0] || [];
  if (hand.length < 5) {
    return { high, low, activeHigh: null, activeLow: null };
  }

  const cards = hand.map((c) => ({ r: c.r, s: c.s }));
  const hi = bestHighFromSeven(cards);
  const lo = bestLowFromSeven(cards);

  const activeHigh = hi ? hi.nameJa : null;
  const activeLow = lowLadderShortJa(lo);
  return { high, low, activeHigh, activeLow };
}

