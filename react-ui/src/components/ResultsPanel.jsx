import "./game.css";
import { fmtNum, fmtSigned } from "../engine/formatters.js";

function seatNameById(state, seatId) {
  const s = (state?.seats || []).find((x) => x.seatId === seatId);
  return s?.seatName || `Seat ${seatId}`;
}

function isFolded(state, seatId) {
  return !!state?.folded?.[seatId];
}

function isAllIn(state, seatId) {
  return !!state?.allIn?.[seatId] && !isFolded(state, seatId);
}

function potLabelJa(label) {
  if (label === "Main Pot") return "メインポット";
  const m = /^Side Pot\s+(\d+)$/.exec(String(label));
  if (m) return `サイドポット ${m[1]}`;
  return String(label || "");
}

function joinSeats(state, ids) {
  return (ids || []).map((i) => seatNameById(state, i)).join("、") || "—";
}

export function ResultsPanel({ state, onNewHand }) {
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
      {typeof onNewHand === "function" ? (
        <div className="results-block">
          <button type="button" className="hud-btn" onClick={onNewHand}>
            新しいハンド
          </button>
        </div>
      ) : null}
      <div className="results-block">
        <div className="results-title">ポット内訳</div>
        <div className="results-lines">
          {r.potDetails?.map((p, idx) => (
            <div key={`p-${idx}`} className="results-pot-card">
              <div className="results-pot-head">
                <span className="results-pot-lbl">{potLabelJa(p.label)}</span>
                <span className="results-pot-amt">{fmtNum(p.amount)}</span>
              </div>
              <div className="results-pot-rows">
                <div className="results-pot-row">
                  <span className="results-pot-k">対象</span>
                  <span className="results-pot-v">{joinSeats(state, p.eligible)}</span>
                </div>
                <div className="results-pot-row">
                  <span className="results-pot-k">ハイ</span>
                  <span className="results-pot-v">{joinSeats(state, p.highWinners)}</span>
                </div>
                <div className="results-pot-row">
                  <span className="results-pot-k">ロー</span>
                  <span className="results-pot-v">{p.lowOk ? joinSeats(state, p.lowWinners) : "ローなし"}</span>
                </div>
                {p.scoop ? (
                  <div className="results-pot-row">
                    <span className="results-pot-k">スクープ</span>
                    <span className="results-pot-v">{joinSeats(state, p.highWinners)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="results-block">
        <div className="results-title">差分</div>
        <div className="results-lines">
          {deltas.map((d, i) => (
            <div key={`d-${i}`} className={`results-line ${d > 0 ? "is-plus" : d < 0 ? "is-minus" : ""}`}>
              <span className="results-seat">
                {seatNameById(state, i)}
                {isFolded(state, i) ? <span className="results-badge is-fold">フォールド</span> : null}
                {isAllIn(state, i) ? <span className="results-badge is-allin">オールイン</span> : null}
              </span>
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

