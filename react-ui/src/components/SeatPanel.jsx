import { Card } from "./Card.jsx";
import "./game.css";

export function SeatPanel({ vm }) {
  if (!vm) return null;

  const folded = !!vm.isFolded;
  const allIn = !!vm.isAllIn;
  const showRoles = !!vm.shouldShowHandRank;
  const revealAll = !!vm.revealCards;

  return (
    <div className={vm.panelClasses}>
      <div className="seat-head">
        <span className="seat-name">{vm.seatName}</span>
        {allIn ? <span className="seat-allin-badge">オールイン</span> : null}
        {folded ? <span className="seat-fold-badge seat-fold-badge-lg">フォールド</span> : null}
        <span className={`seat-chips ${vm.chipLevel}`}>{vm.stackText}</span>
      </div>

      {!vm.shouldShowCards ? null : (
        <div className="hand" aria-label="手札（モック）">
          {(vm.cards || []).map((c, idx) => (
            <Card key={`${idx}-${c.r}${c.s}`} rank={c.r} suit={c.s} faceUp={revealAll ? true : c.faceUp !== false} />
          ))}
        </div>
      )}

      <div className={`seat-card-foot ${folded ? "is-folded" : ""}`} aria-label="直近アクション・役">
        <div className="seat-foot-line seat-foot-line1">
          <span className="seat-foot-left">{vm.lastActionText}</span>
          <span className="seat-foot-right">{showRoles ? vm.highText : ""}</span>
        </div>
        <div className="seat-foot-line seat-foot-line2">
          <span className="seat-foot-left"></span>
          <span className="seat-foot-right">{showRoles ? vm.lowText : ""}</span>
        </div>
      </div>
    </div>
  );
}

