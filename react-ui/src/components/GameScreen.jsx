import { useMemo, useState } from "react";
import { GameTable } from "./GameTable.jsx";
import { MiniLog } from "./MiniLog.jsx";
import { SupportAi } from "./SupportAi.jsx";
import { HandRankPanel } from "./HandRankPanel.jsx";
import { ActionButtons } from "./ActionButtons.jsx";
import { EngineDebugPanel } from "./EngineDebugPanel.jsx";
import { ResultsPanel } from "./ResultsPanel.jsx";
import "./game.css";
import { selectMiniLogViewModel } from "../selectors/resultViewModel.js";
import { selectSupportAiViewModel } from "../selectors/supportAiViewModel.js";
import { selectHandRankViewModel } from "../selectors/handRankViewModel.js";

export function GameScreen({ mock, onExit }) {
  const [tab, setTab] = useState("play");
  const mini = useMemo(() => selectMiniLogViewModel(mock), [mock]);
  const supportAi = useMemo(() => selectSupportAiViewModel(mock), [mock]);
  const handRanks = useMemo(() => selectHandRankViewModel(mock), [mock]);
  const canControl = typeof mock?.dispatch === "function";
  const actor = mock?.betting?.currentActor ?? mock?.betting?.toAct ?? null;
  const heroTurn = actor === 0;
  const heroFolded = !!mock?.folded?.[0];
  const heroAllIn = !!mock?.allIn?.[0];
  const toCall = Math.max(0, (mock?.betting?.target ?? 0) - (mock?.betting?.invested?.[0] ?? 0));
  const canAct = canControl && heroTurn && !heroFolded && !heroAllIn;
  const disabled = {
    fold: !canAct,
    check: !canAct || toCall > 0,
    call: !canAct || toCall <= 0,
    single: !canAct,
    double: !canAct,
    triple: !canAct,
  };

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
            アンティ：{mock.hud.ante} <span className="hud-sep">/</span>{" "}
            {mock.hud.blindsOn ? (
              <>
                SB/BB：{mock.hud.sb} / {mock.hud.bb}
              </>
            ) : (
              <>ブラインド：OFF</>
            )}
          </div>
          <div className="hud-right">
            {onExit ? (
              <button type="button" className="hud-btn hud-btn-ghost" onClick={onExit}>
                トップ
              </button>
            ) : null}
            CPU {mock.hud.cpuCount}人
            {canControl ? (
              <span className="hud-actions">
                <button type="button" className="hud-btn" onClick={() => mock.dispatch({ type: "NEW_HAND" })}>
                  新しいハンド
                </button>
                <button type="button" className="hud-btn" onClick={() => mock.dispatch({ type: "ADVANCE_STREET" })}>
                  次のストリート
                </button>
                <button type="button" className="hud-btn" onClick={() => mock.dispatch({ type: "FORCE_SHOWDOWN" })}>
                  ショーダウン
                </button>
              </span>
            ) : null}
          </div>
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
          ) : tab === "results" ? (
            <div className="panel-filler panel-filler-scroll" role="tabpanel">
              <ResultsPanel state={mock} />
            </div>
          ) : tab === "debug" ? (
            <div className="panel-filler panel-filler-scroll" role="tabpanel">
              <EngineDebugPanel state={mock} />
            </div>
          ) : tab === "log" ? (
            <div className="panel-filler panel-filler-scroll" role="tabpanel" aria-label="詳細ログ">
              <pre className="engine-pre">{(mock?.detailLog || ["—"]).join("\n")}</pre>
            </div>
          ) : (
            <div className="panel-filler" role="tabpanel">
              <p className="panel-note">このタブはモックです（表示確認用）。</p>
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
                <HandRankPanel data={handRanks} onAllIn={canControl ? () => mock.dispatch({ type: "PLAYER_ACTION", seatId: 0, actionType: "allin" }) : null} />
              </div>
              <div className="dock-tile dock-tile-actions">
                <ActionButtons
                  onAction={
                    canControl
                      ? (t) => mock.dispatch({ type: "PLAYER_ACTION", seatId: 0, actionType: t })
                      : null
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

