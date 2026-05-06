import "./game.css";

function fmtSigned(n) {
  const x = Number(n ?? 0);
  const abs = Math.abs(x).toLocaleString("ja-JP");
  return x > 0 ? `+${abs}` : x < 0 ? `-${abs}` : "0";
}

export function MiniLog({ items }) {
  return (
    <div className="dock-scroll mini-log" aria-label="ミニログ">
      {items?.length ? (
        items.map((it, idx) => {
          if (it.kind === "sep") return <div key={`s-${idx}`} className="mini-sep" aria-hidden="true" />;
          const d = Number(it.delta ?? 0);
          return (
            <div key={`l-${idx}`} className={`mini-line ${d > 0 ? "is-plus" : d < 0 ? "is-minus" : ""}`}>
              <span className="mini-who">{it.who}</span>
              <span className="mini-delta">{fmtSigned(d)}</span>
              <span className="mini-role">{it.role || ""}</span>
            </div>
          );
        })
      ) : (
        <div className="mini-placeholder">—</div>
      )}
    </div>
  );
}

