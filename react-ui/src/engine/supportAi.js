import { shuffleInPlace } from "./cards.js";
import { bestHighFromSeven, bestLowFromSeven, isWheelLowKey } from "./handEvaluator.js";

const SUPPORT_AI_CAT_ORDER = {
  high_card: 0,
  one_pair: 1,
  two_pair: 2,
  three_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_kind: 7,
  straight_flush: 8,
};

function lowBucketSupportAi(lo) {
  if (!lo) return "no";
  if (isWheelLowKey(lo.key)) return "5";
  const mx = Math.max.apply(null, lo.key);
  if (mx >= 8) return "8";
  if (mx === 7) return "7";
  if (mx === 6) return "6";
  if (mx === 5) return "5";
  return "no";
}

/**
 * Legacy behavior: sample-complete to 7 cards from remaining deck.
 * Inputs are pure data (no DOM). Inject random() for testability.
 *
 * @param {Object} args
 * @param {Array} args.hand - known cards (0..7)
 * @param {Array} args.deck - remaining deck (>= need)
 * @param {Function} [args.random] - RNG
 */
export function computeSupportAiDrawOdds({ hand, deck, random = Math.random }) {
  const h0 = hand || [];
  if (!h0.length) return null;
  const d0 = deck && deck.length ? deck : [];
  const need = Math.max(0, 7 - h0.length);
  if (need > 0 && d0.length < need) return null;

  const sampleN = need === 0 ? 1 : Math.min(100, Math.max(48, 72));
  let gePair = 0;
  let geStraight = 0;
  let geFlush = 0;
  let geTwoPair = 0;
  let c8 = 0;
  let c7 = 0;
  let c6 = 0;
  let c5 = 0;
  let cNo = 0;

  for (let s = 0; s < sampleN; s++) {
    const h = h0.slice();
    if (need > 0) {
      const pool = shuffleInPlace(d0.slice(), random);
      for (let i = 0; i < need; i++) h.push(pool[i]);
    }
    const hi = bestHighFromSeven(h);
    const r = SUPPORT_AI_CAT_ORDER[hi.category] ?? 0;
    if (r >= 1) gePair++;
    if (r >= 2) geTwoPair++;
    if (r >= 4) geStraight++;
    if (r >= 5) geFlush++;
    const bk = lowBucketSupportAi(bestLowFromSeven(h));
    if (bk === "8") c8++;
    else if (bk === "7") c7++;
    else if (bk === "6") c6++;
    else if (bk === "5") c5++;
    else cNo++;
  }

  const n = sampleN;
  const hiRows = [
    { label: "フラッシュ以上", pct: Math.round((geFlush / n) * 100) },
    { label: "ストレート以上", pct: Math.round((geStraight / n) * 100) },
    { label: "ツーペア以上", pct: Math.round((geTwoPair / n) * 100) },
    { label: "ワンペア以上", pct: Math.round((gePair / n) * 100) },
  ];
  const loRows = [
    { label: "8 TOP", pct: Math.round((c8 / n) * 100) },
    { label: "7 TOP", pct: Math.round((c7 / n) * 100) },
    { label: "6 TOP", pct: Math.round((c6 / n) * 100) },
    { label: "5 TOP", pct: Math.round((c5 / n) * 100) },
    { label: "ローなし", pct: Math.round((cNo / n) * 100) },
  ];
  return { hiRows, loRows, sampleN: n };
}

