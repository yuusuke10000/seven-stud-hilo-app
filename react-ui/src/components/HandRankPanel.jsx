import "./game.css";

export function HandRankPanel({ data, onAllIn }) {
  const high = data?.high || [];
  const low = data?.low || [];
  const activeHigh = data?.activeHigh || null;
  const activeLow = data?.activeLow || null;

  return (
    <div className="hand-rank" aria-label="役名一覧（モック）">
      <div className="rank-grid">
        <div className="rank-col">
          {high.map((t) => {
            const isOn = activeHigh && t.includes(activeHigh);
            return (
              <div key={`h-${t}`} className={`rank-row ${isOn ? "is-on" : ""}`}>
                {t}
              </div>
            );
          })}
        </div>
        <div className="rank-col rank-col-low">
          {low.map((t) => {
            const isOn = activeLow && t === activeLow;
            return (
              <div key={`l-${t}`} className={`rank-row ${isOn ? "is-on" : ""}`}>
                {t}
              </div>
            );
          })}
          <button type="button" className="btn-allin" aria-label="オールイン" onClick={() => onAllIn?.()}>
            オールイン
          </button>
        </div>
      </div>
    </div>
  );
}

