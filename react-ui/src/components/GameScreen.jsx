import { useMemo, useState } from "react";
import { GameTable } from "./GameTable.jsx";
import { MiniLog } from "./MiniLog.jsx";
import { SupportAi } from "./SupportAi.jsx";
import { HandRankPanel } from "./HandRankPanel.jsx";
import { ActionButtons } from "./ActionButtons.jsx";
import { EngineDebugPanel } from "./EngineDebugPanel.jsx";
import "./game.css";
import { selectMiniLogViewModel } from "../selectors/resultViewModel.js";
import { selectSupportAiViewModel } from "../selectors/supportAiViewModel.js";
import { selectHandRankViewModel } from "../selectors/handRankViewModel.js";

export function GameScreen({ mock }) {
  const [tab, setTab] = useState("play");
  const mini = useMemo(() => selectMiniLogViewModel(mock), [mock]);
  const supportAi = useMemo(() => selectSupportAiViewModel(mock), [mock]);
  const handRanks = useMemo(() => selectHandRankViewModel(mock), [mock]);

  const tabs = useMemo(
    () => [
      { id: "play", label: "プレイ" },
      { id: "log", label: "ログ" },
      { id: "results", label: "結果" },
      { id: "debug", label: "デバッグ" },
    ],
    []
  );

  return (
    <section className="game" aria-label="ゲーム画面（モック）">
      <header className="game-header" aria-label="HUD">
        <div className="hud-row">
          <div className="hud-left">
            アンティ：{mock.hud.ante} <span className="hud-sep">/</span> SB/BB：
            {mock.hud.sb} / {mock.hud.bb}
          </div>
          <div className="hud-right">CPU {mock.hud.cpuCount}人</div>
        </div>

        <div className="game-tabs" role="tablist" aria-label="ゲーム内タブ（モック）">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="game-body">
        <div className="zone-a" aria-label="ゾーンA：テーブル">
          {tab === "play" ? (
            <GameTable mock={mock} />
          ) : (
            <div className="panel-filler" role="tabpanel">
              {tab === "debug" ? (
                <EngineDebugPanel />
              ) : (
                <p className="panel-note">このタブはモックです（表示確認用）。</p>
              )}
            </div>
          )}
        </div>

        <footer className="dock" aria-label="下部UI">
          <div className="zone-b" aria-label="ゾーンB：ミニログ・サポートAI">
            <div className="dock-row dock-row-top">
              <div className="dock-tile">
                <MiniLog items={mini.items} />
              </div>
              <div className="dock-tile">
                <SupportAi data={supportAi} />
              </div>
            </div>
          </div>

          <div className="zone-c" aria-label="ゾーンC：役名・操作">
            <div className="dock-row dock-row-bottom">
              <div className="dock-tile dock-tile-ranks">
                <HandRankPanel data={handRanks} />
              </div>
              <div className="dock-tile dock-tile-actions">
                <ActionButtons />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

