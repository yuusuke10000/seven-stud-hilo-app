import { bestHighFromSeven, bestLowFromSeven, lowLadderShortJa } from "./handEvaluator.js";
import { buildSidePotsFromTotals, runSidePotTests } from "./sidePot.js";
import { computeSupportAiDrawOdds } from "./supportAi.js";
import { makeDeck } from "./cards.js";

// Simple deterministic RNG for repeatable samples
export function makeMulberry32(seed = 1) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function getEngineDebugSamples() {
  const cards7 = [
    { r: 14, s: 0 },
    { r: 7, s: 2 },
    { r: 12, s: 1 },
    { r: 3, s: 3 },
    { r: 9, s: 0 },
    { r: 2, s: 2 },
    { r: 8, s: 1 },
  ];

  const hi = bestHighFromSeven(cards7);
  const lo = bestLowFromSeven(cards7);

  const totalCommitted = [50, 100, 100];
  const folded = [true, false, false];
  const pots = buildSidePotsFromTotals(totalCommitted, folded, 3);

  const deck = makeDeck();
  // Remove known cards from deck for a realistic sample (best-effort)
  const used = new Set(cards7.map((c) => `${c.r}-${c.s}`));
  const remaining = deck.filter((c) => !used.has(`${c.r}-${c.s}`));
  const odds = computeSupportAiDrawOdds({
    hand: cards7.slice(0, 4),
    deck: remaining,
    random: makeMulberry32(123),
  });

  return {
    highEval: { nameJa: hi?.nameJa, detailJa: hi?.detailJa, category: hi?.category, key: hi?.key },
    lowEval: lo ? { labelJa: lo.labelJa, ladderJa: lowLadderShortJa(lo), key: lo.key } : null,
    sidePotsSample: pots,
    sidePotTests: runSidePotTests(),
    supportAiSample: odds,
  };
}

