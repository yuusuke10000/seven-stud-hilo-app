import "./screens.css";

export function HistoryScreen({ history, onBack, onReset }) {
  return (
    <section className="screen" aria-label="履歴">
      <div className="screen-inner">
        <header className="screen-head">
          <h2 className="screen-h2">履歴</h2>
          <div className="screen-head-actions">
            <button type="button" className="screen-btn" onClick={onBack}>
              戻る
            </button>
          </div>
        </header>

        <div className="panel panel-scroll">
          {!history || history.length === 0 ? (
            <p className="p muted">履歴はありません。</p>
          ) : (
            <div className="history-list">
              {history.map((h, idx) => (
                <div key={h?.id ?? idx} className="history-card">
                  <div className="history-row">
                    <span className="history-title">{h?.atText ?? h?.at ?? "—"}</span>
                    <span className="history-meta">CPU {h?.cpuCount ?? "—"}人</span>
                  </div>
                  <div className="history-row">
                    <span className="history-meta">
                      {h?.blindsOn ? `SB/BB ${h?.smallBlind ?? "—"} / ${h?.bigBlind ?? "—"}` : "ブラインド OFF"}
                    </span>
                    <span className="history-meta">ポット {h?.pot ?? "—"}</span>
                  </div>
                  {h?.summary ? <div className="history-summary">{h.summary}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="screen-footer">
          <button
            type="button"
            className="screen-btn danger"
            onClick={() => {
              if (confirm("履歴をリセットしますか？")) onReset();
            }}
          >
            履歴リセット
          </button>
        </div>
      </div>
    </section>
  );
}

