import "./game.css";

function pct(n) {
  const x = Number(n ?? 0);
  return `${Math.max(0, Math.min(100, Math.round(x)))}%`;
}

export function SupportAi({ data }) {
  if (!data) return <div className="dock-scroll support-ai">—</div>;
  if (data.mode === "fixed") {
    return <div className="dock-scroll support-ai">{data.text}</div>;
  }
  return (
    <div className="dock-scroll support-ai" aria-label="サポートAI（モック）">
      <div className="ai-block">
        <div className="ai-rows">
          {data.high?.map((r) => (
            <div key={`h-${r.label}`} className="ai-row">
              <span className="ai-label">{r.label}</span>
              <span className="ai-pct">{pct(r.pct)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ai-spacer" aria-hidden="true" />
      <div className="ai-block">
        <div className="ai-rows">
          {data.low?.map((r) => (
            <div key={`l-${r.label}`} className="ai-row">
              <span className="ai-label">{r.label}</span>
              <span className="ai-pct">{pct(r.pct)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

