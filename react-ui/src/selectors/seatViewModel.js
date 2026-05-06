import { fmtNum } from "../engine/formatters.js";
import { bestHighFromSeven, bestLowFromSeven, lowLadderShortJa } from "../engine/handEvaluator.js";

function chipLevel(stack, base = 1000) {
  const n = Number(stack ?? 0);
  if (n <= 0) return "chip-zero";
  if (n < base * 0.5) return "chip-low";
  if (n >= base * 1.5) return "chip-high";
  return "chip-mid";
}

/**
 * SeatPanel 向けの表示用データを生成する。
 * - CPUのショーダウン前は役を表示しない
 * - Fold席はショーダウン時も役を表示しない
 * - All-in は Fold と別
 */
export function selectSeatViewModel(state, seatId) {
  const seat = (state?.seats || []).find((s) => s.seatId === seatId);
  if (!seat) return null;

  const isHero = seat.kind === "hero";
  const isCpu = seat.kind === "cpu";
  const isShowdown = !!state?.view?.isShowdown;

  const isFolded = !!seat.folded;
  const isAllIn = !!seat.allIn && !isFolded;
  const isWinner = !!seat.winner && !isFolded;

  const shouldShowCards = !isFolded;
  const revealCards = isHero || isShowdown;

  // Hand rank display rules
  const shouldShowHandRank = !isFolded && (isShowdown || isHero) && !(isCpu && !isShowdown);

  const badges = [];
  if (isAllIn) badges.push({ kind: "allin", text: "オールイン" });
  if (isFolded) badges.push({ kind: "fold", text: "フォールド" });

  const panelClasses = [
    "seat-panel",
    isHero ? "seat--hero seat-human" : "seat--cpu",
    isFolded ? "seat--folded" : "seat--normal",
    isAllIn ? "seat--allin" : "",
    isWinner ? "seat--winner" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lastActionText = isFolded ? "フォールド" : seat.lastActionText || "";

  let highText = "";
  let lowText = "";
  if (shouldShowHandRank) {
    const hand = state?.hands?.[seatId] || [];
    const isCpuShow = isCpu && isShowdown && hand.length === 7;
    const isHeroShow = isHero && hand.length >= 5;
    if (isCpuShow || isHeroShow) {
      const cards = hand.map((c) => ({ r: c.r, s: c.s }));
      const hi = bestHighFromSeven(cards);
      const lo = bestLowFromSeven(cards);
      highText = hi ? `ハイ：${hi.nameJa}` : "";
      lowText = `ロー：${lowLadderShortJa(lo)}`;
    } else {
      // fallback for pure-mock state (string-based)
      highText = seat.highText || "";
      lowText = seat.lowText || "";
    }
  }

  return {
    seatId,
    seatName: seat.seatName,
    stackText: fmtNum(seat.stack),
    chipLevel: chipLevel(seat.stack),
    isFolded,
    isAllIn,
    isWinner,
    isHero,
    isCpu,
    badges,
    panelClasses,
    cards: seat.cards || [],
    revealCards,
    shouldShowCards,
    shouldShowHandRank,
    lastActionText,
    highText,
    lowText,
  };
}

