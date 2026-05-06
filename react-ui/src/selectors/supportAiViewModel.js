import { computeSupportAiDrawOdds } from "../engine/supportAi.js";

/**
 * UI表示用のサポートAIデータを返す。
 * - 既に state.supportAi がある場合はそれを優先（モック互換）。
 * - hands/deck が揃っていれば engine 純関数で算出。
 */
export function selectSupportAiViewModel(state, { random } = {}) {
  if (state?.supportAi && state.supportAi.mode === "odds") return state.supportAi;

  const hand0 = state?.hands?.[0] || [];
  const deck = state?.deck || [];
  if (!hand0.length) return { mode: "fixed", text: "—" };

  // engine expects {r,s} numeric cards
  const known = hand0.map((c) => ({ r: c.r, s: c.s }));
  const d = deck.map((c) => ({ r: c.r, s: c.s }));

  const odds = computeSupportAiDrawOdds({
    hand: known,
    deck: d,
    random: random || Math.random,
  });

  if (!odds) return { mode: "fixed", text: "—" };
  return {
    mode: "odds",
    high: odds.hiRows,
    low: odds.loRows,
  };
}

