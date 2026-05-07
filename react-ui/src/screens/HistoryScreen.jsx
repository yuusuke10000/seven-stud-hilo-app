import "./screens.css";

const PLAYER_RESULT_JA = { Win: "勝ち", Lose: "負け", Split: "分け", Fold: "フォールド" };

function formatAt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function playerResultJa(code) {
  if (!code) return "—";
  return PLAYER_RESULT_JA[code] || String(code);
}

/** チップ増減の一行（静的版履歴に無い場合は playerResult から推測しない） */
function deltaSummary(h) {
  if (h?.summary) return h.summary;
  const pr = h?.playerResult;
  if (pr === "Win") return "結果：勝ち";
  if (pr === "Lose") return "結果：負け";
  if (pr === "Split") return "結果：分け";
  if (pr === "Fold") return "結果：フォールド";
  return null;
}

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
              {history.map((h, idx) => {
                const hasStaticShape = h?.playerResult != null && h?.highWinners != null;
                const title = formatAt(h?.at);
                const extra = deltaSummary(h);
                return (
                  <div key={`${h?.at ?? ""}-${idx}`} className="history-card">
                    <div className="history-row">
                      <span className="history-title">{title}</span>
                      <span className="history-meta">CPU {h?.cpuCount ?? "—"}人</span>
                      {hasStaticShape ? (
                        <span className="history-meta hist-pill">{playerResultJa(h.playerResult)}</span>
                      ) : null}
                    </div>
                    <div className="history-row">
                      <span className="history-meta">
                        {h?.blindsOn === true
                          ? `SB/BB ${h?.smallBlind ?? "—"} / ${h?.bigBlind ?? "—"}`
                          : h?.blindsOn === false
                            ? "ブラインド OFF"
                            : "ブラインド —"}
                      </span>
                      <span className="history-meta">ポット {h?.pot ?? "—"}</span>
                    </div>
                    {hasStaticShape ? (
                      <ul className="history-detail-list muted">
                        {h?.blindsOn === true && (h?.sbSeat || h?.bbSeat) ? (
                          <li>
                            SB {h?.sbSeat ?? "—"} · BB {h?.bbSeat ?? "—"}
                          </li>
                        ) : null}
                        <li>ハイ勝者：{h?.highWinners ?? "—"}</li>
                        <li>ロー勝者：{h?.lowWinners ?? "—"}</li>
                        <li>スクープ：{h?.scoop ? "あり" : "なし"}</li>
                        <li>
                          ポット層：
                          {(h?.sidePotCount ?? 1) > 1
                            ? `メイン＋サイド ${(h?.sidePotCount ?? 1) - 1}`
                            : "メインのみ"}
                        </li>
                        <li>あなたのハイ：{h?.playerHigh ?? "—"}</li>
                        <li>ロー成立（あなた）：{h?.playerLowOk ? "あり" : "なし"}</li>
                      </ul>
                    ) : null}
                    {extra ? <div className="history-summary">{extra}</div> : null}
                  </div>
                );
              })}
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
