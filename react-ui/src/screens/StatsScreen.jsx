import { fmtNum } from "../engine/formatters.js";
import "./screens.css";

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function StatsScreen({ stats, onBack, onReset }) {
  const hbc = stats?.handsByCpuCount || {};
  const cpuHandsLine = [1, 2, 3, 4, 5].map((n) => `${n}人:${hbc[n] ?? 0}`).join(" · ");

  return (
    <section className="screen" aria-label="戦績">
      <div className="screen-inner">
        <header className="screen-head">
          <h2 className="screen-h2">戦績</h2>
          <div className="screen-head-actions">
            <button type="button" className="screen-btn" onClick={onBack}>
              戻る
            </button>
          </div>
        </header>

        <div className="panel panel-scroll">
          <div className="stats-grid">
            <StatRow label="ハンド数" value={fmtNum(stats?.totalHands ?? 0)} />
            <StatRow label="総ゲーム記録" value={fmtNum(stats?.totalGames ?? 0)} />
            <StatRow label="勝ち（あなた）" value={fmtNum(stats?.playerWins ?? 0)} />
            <StatRow label="勝ち（CPU）" value={fmtNum(stats?.cpuWins ?? 0)} />
            <StatRow label="ハイ勝ち（あなた）" value={fmtNum(stats?.playerHighWins ?? 0)} />
            <StatRow label="ロー勝ち（あなた）" value={fmtNum(stats?.playerLowWins ?? 0)} />
            <StatRow label="スクープ（あなた）" value={fmtNum(stats?.playerScoops ?? 0)} />
            <StatRow label="ショーダウン到達" value={fmtNum(stats?.showdownsReached ?? 0)} />
            <StatRow label="CPU人数別ハンド" value={cpuHandsLine} />
            <StatRow label="あなたのフォールド" value={fmtNum(stats?.playerFolds ?? 0)} />
            <StatRow label="最大ポット勝ち" value={fmtNum(stats?.maxPotWon ?? 0)} />
            <StatRow label="累計獲得" value={fmtNum(stats?.totalChipsWon ?? 0)} />
            <StatRow label="累計損失" value={fmtNum(stats?.totalChipsLost ?? 0)} />
            <StatRow label="最高到達" value={fmtNum(stats?.maxChipsReached ?? 0)} />
            <StatRow label="最低到達" value={fmtNum(stats?.minChipsReached ?? 0)} />
            <StatRow label="補充回数" value={fmtNum(stats?.virtualChipRefills ?? 0)} />
          </div>
        </div>

        <div className="screen-footer">
          <button
            type="button"
            className="screen-btn danger"
            onClick={() => {
              if (confirm("戦績をリセットしますか？")) onReset();
            }}
          >
            戦績リセット
          </button>
        </div>
      </div>
    </section>
  );
}

