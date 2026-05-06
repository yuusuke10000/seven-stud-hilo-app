import "./game.css";
import { fmtNum, fmtSigned } from "../engine/formatters.js";

function seatNameById(state, seatId) {
  const s = (state?.seats || []).find((x) => x.seatId === seatId);
  return s?.seatName || `Seat ${seatId}`;
}

export function ResultsPanel({ state }) {
  const r = state?.lastResult;
  const n = state?.players?.length || 0;
  if (!r) {
    return <div className="results-panel">—</div>;
  }

  if (r.kind === "fold_survivor") {
    return (
      <div className="results-panel">
        <div className="results-block">
          <div className="results-title">勝者</div>
          <div className="results-line">{seatNameById(state, r.winnerSeatId)}</div>
        </div>
      </div>
    );
  }

  const deltas = Array.from({ length: n }, (_, i) => (state.stacks[i] ?? 0) - (state.handStartStacks?.[i] ?? 0));

  return (
    <div className="results-panel" aria-label="結果（簡易）">
      <div className="results-block">
        <div className="results-title">ポット分配</div>
        <div className="results-lines">
          {r.potDetails?.map((p, idx) => (
            <div key={`p-${idx}`} className="results-line">
              <span className="results-pot-lbl">{p.label}</span>
              <span className="results-pot-amt">{fmtNum(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="results-block">
        <div className="results-title">差分</div>
        <div className="results-lines">
          {deltas.map((d, i) => (
            <div key={`d-${i}`} className={`results-line ${d > 0 ? "is-plus" : d < 0 ? "is-minus" : ""}`}>
              <span className="results-seat">{seatNameById(state, i)}</span>
              <span className="results-val">{fmtSigned(d)}</span>
              <span className="results-role">
                {d > 0 && r.hiEvals?.[i]?.nameJa ? `ハイ：${r.hiEvals[i].nameJa}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="results-block">
        <div className="results-title">役</div>
        <div className="results-lines">
          {Array.from({ length: n }, (_, i) => (
            <div key={`h-${i}`} className="results-line">
              <span className="results-seat">{seatNameById(state, i)}</span>
              <span className="results-role">
                {r.hiEvals?.[i]?.nameJa ? `ハイ：${r.hiEvals[i].nameJa}` : "—"}
                {" · "}
                {r.loEvals?.[i]?.ladderJa ? `ロー：${r.loEvals[i].ladderJa}` : "ロー：ローなし"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

