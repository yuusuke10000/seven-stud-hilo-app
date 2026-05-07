import { fmtSigned } from "../engine/formatters.js";

function seatNameById(state, seatId) {
  const s = (state?.seats || []).find((x) => x.seatId === seatId);
  return s?.seatName || `Seat ${seatId}`;
}

/**
 * ミニログ表示用（チップ増減中心、ハンド数表示なし）
 * 入力は mockResult などの「結果風データ」でOK。
 */
export function selectMiniLogViewModel(state) {
  const src = state?.mockResult?.miniLog || [];
  const items = [];
  for (const it of src) {
    if (it.kind === "sep") {
      items.push({ kind: "sep" });
      continue;
    }
    if (it.kind === "delta") {
      const who = seatNameById(state, it.seatId);
      const delta = Number(it.delta ?? 0);
      items.push({
        kind: "line",
        who,
        delta,
        deltaText: fmtSigned(delta),
        roleText: it.roleText || "",
      });
      continue;
    }
  }
  return {
    items,
    winnerSeatIds: state?.mockResult?.winnerSeatIds || [],
  };
}

