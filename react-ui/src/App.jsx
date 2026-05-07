import { useMemo, useRef, useState } from "react";
import "./App.css";
import { GameScreen } from "./components/GameScreen.jsx";
import { applyGameAction, createNewHandState } from "./engine/gameEngine.js";
import {
  buildHistoryEntryForStorage,
  defaultSettings,
  defaultStats,
  loadHistory,
  loadSettings,
  loadStats,
  pushHistory,
  saveHistory,
  saveSettings,
  saveStats,
} from "./storage/localStorage.js";
import { TopScreen } from "./screens/TopScreen.jsx";
import { SettingsScreen } from "./screens/SettingsScreen.jsx";
import { RulesScreen } from "./screens/RulesScreen.jsx";
import { StatsScreen } from "./screens/StatsScreen.jsx";
import { HistoryScreen } from "./screens/HistoryScreen.jsx";

export default function App() {
  const [view, setView] = useState("top"); // top | settings | game | rules | stats | history
  const [settings, setSettings] = useState(() => loadSettings());
  const [stats, setStats] = useState(() => loadStats(settings));
  const [history, setHistory] = useState(() => loadHistory());
  const [engineState, setEngineState] = useState(() => createNewHandState(settings));
  const lastHandledSeqRef = useRef(0);

  const gameState = useMemo(() => {
    return {
      ...engineState,
      dispatch: (a) =>
        setEngineState((prev) => {
          const next = applyGameAction(prev, a);
          const seq = Number(next.handResultSeq ?? 0) || 0;
          const just = next.handJustEnded;
          if (just && seq > (lastHandledSeqRef.current || 0)) {
            lastHandledSeqRef.current = seq;

            // stats: 静的版 app.js のハンド終了更新に寄せる
            setStats((cur) => {
              const s = cur || defaultStats(settings.startChips);
              const awards = Array.isArray(just.awards) ? just.awards.map((x) => Number(x) || 0) : [];
              const pA = Number(awards[0]) || 0;
              const maxA = awards.length ? Math.max(...awards) : 0;
              const cc = Number(just.cpuCount) || settings.cpuCount;
              const heroStack = Number(just.stacks?.[0] ?? s.playerChips) || 0;
              const prevMin = Number(s.minChipsReached);

              const nextStats = {
                ...s,
                totalGames: (Number(s.totalGames) || 0) + 1,
                totalHands: (Number(s.totalHands) || 0) + 1,
                showdownsReached: (Number(s.showdownsReached) || 0) + (just.kind === "showdown" ? 1 : 0),
                playerFolds: (Number(s.playerFolds) || 0) + (just.folded?.[0] ? 1 : 0),
                totalChipsWon: (Number(s.totalChipsWon) || 0) + (pA > 0 ? pA : 0),
                totalChipsLost: Number(s.totalChipsLost) || 0,
                playerChips: heroStack,
                maxChipsReached: Math.max(Number(s.maxChipsReached) || 0, heroStack),
                minChipsReached: Number.isFinite(prevMin) ? Math.min(prevMin, heroStack) : heroStack,
                handsByCpuCount: {
                  ...(s.handsByCpuCount || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
                  [cc]: (Number(s.handsByCpuCount?.[cc]) || 0) + 1,
                },
              };

              if (just.kind === "fold_survivor") {
                const w =
                  just.winnerSeatId != null && just.winnerSeatId >= 0
                    ? just.winnerSeatId
                    : awards.findIndex((x) => Number(x) > 0);
                if (w !== 0 && just.folded?.[0] && pA === 0) {
                  nextStats.totalChipsLost = (Number(s.totalChipsLost) || 0) + 1;
                }
              }

              if (just.kind === "showdown") {
                if (pA === maxA && maxA > 0) nextStats.playerWins = (Number(s.playerWins) || 0) + 1;
                if (pA < maxA && maxA > 0) nextStats.cpuWins = (Number(s.cpuWins) || 0) + 1;
                // 静的版 app.js: 各サイドポットのループ内で pHiAny / pLoAny / pScAny を OR 集計
                const pots = Array.isArray(just.potDetails) ? just.potDetails : [];
                let pHiAny = false;
                let pLoAny = false;
                let pScAny = false;
                for (const p of pots) {
                  if (p.highWinners?.includes(0)) pHiAny = true;
                  if (p.lowOk && p.lowWinners?.includes(0)) pLoAny = true;
                  if (p.scoop && p.highWinners?.includes(0)) pScAny = true;
                }
                if (pHiAny) nextStats.playerHighWins = (Number(s.playerHighWins) || 0) + 1;
                if (pLoAny) nextStats.playerLowWins = (Number(s.playerLowWins) || 0) + 1;
                if (pScAny) nextStats.playerScoops = (Number(s.playerScoops) || 0) + 1;
              } else if (just.kind === "fold_survivor") {
                const w =
                  just.winnerSeatId != null && just.winnerSeatId >= 0
                    ? just.winnerSeatId
                    : awards.findIndex((x) => Number(x) > 0);
                if (w === 0) nextStats.playerWins = (Number(s.playerWins) || 0) + 1;
                else nextStats.cpuWins = (Number(s.cpuWins) || 0) + 1;
              }

              if (pA > (Number(s.maxPotWon) || 0)) nextStats.maxPotWon = pA;

              const cpuStacks = Array(5).fill(settings.startChips);
              for (let i = 1; i < Math.min(6, just.stacks?.length || 0); i++) {
                cpuStacks[i - 1] = Number(just.stacks[i] ?? 0) || 0;
              }
              nextStats.cpuStacks = cpuStacks;

              saveStats(nextStats);
              return nextStats;
            });

            const entry = buildHistoryEntryForStorage(just);
            if (entry) pushHistory(entry);
            setHistory(loadHistory());
          }
          return next;
        }),
    };
  }, [engineState]);

  function updateSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  function startGameWithSettings(nextSettings = settings) {
    setEngineState(createNewHandState(nextSettings));
    setView("game");
  }

  return (
    <div className="app">
      <main className="app-main">
        {view === "top" ? (
          <TopScreen
            onStart={() => startGameWithSettings(settings)}
            onGo={(to) => setView(to)}
          />
        ) : view === "settings" ? (
          <SettingsScreen
            settings={settings}
            onChange={updateSettings}
            onStart={() => startGameWithSettings(settings)}
            onBack={() => setView("top")}
          />
        ) : view === "rules" ? (
          <RulesScreen onBack={() => setView("top")} />
        ) : view === "stats" ? (
          <StatsScreen
            stats={stats}
            onBack={() => setView("top")}
            onReset={() => {
              const next = defaultStats(settings.startChips);
              setStats(next);
              saveStats(next);
            }}
          />
        ) : view === "history" ? (
          <HistoryScreen
            history={history}
            onBack={() => setView("top")}
            onReset={() => {
              setHistory([]);
              saveHistory([]);
            }}
          />
        ) : (
          <GameScreen mock={gameState} onExit={() => setView("top")} />
        )}
      </main>
    </div>
  );
}
