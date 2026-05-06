import { useMemo, useRef, useState } from "react";
import "./App.css";
import { GameScreen } from "./components/GameScreen.jsx";
import { applyGameAction, createNewHandState } from "./engine/gameEngine.js";
import { defaultSettings, defaultStats, loadHistory, loadSettings, loadStats, saveHistory, saveSettings, saveStats } from "./storage/localStorage.js";
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

            // update stats (簡易)
            setStats((cur) => {
              const s = cur || defaultStats(settings.startChips);
              const heroDelta = Number(just.deltas?.[0] ?? 0) || 0;
              const nextStats = {
                ...s,
                totalHands: (Number(s.totalHands) || 0) + 1,
                showdownsReached: (Number(s.showdownsReached) || 0) + (just.kind === "showdown" ? 1 : 0),
                playerFolds: (Number(s.playerFolds) || 0) + (just.folded?.[0] ? 1 : 0),
                totalChipsWon: (Number(s.totalChipsWon) || 0) + (heroDelta > 0 ? heroDelta : 0),
                totalChipsLost: (Number(s.totalChipsLost) || 0) + (heroDelta < 0 ? Math.abs(heroDelta) : 0),
                playerChips: Number(just.stacks?.[0] ?? s.playerChips) || 0,
                maxChipsReached: Math.max(Number(s.maxChipsReached) || 0, Number(just.stacks?.[0] ?? 0) || 0),
                minChipsReached:
                  Math.min(Number(s.minChipsReached) || Number(just.stacks?.[0] ?? 0) || 0, Number(just.stacks?.[0] ?? 0) || 0) ||
                  0,
                handsByCpuCount: {
                  ...(s.handsByCpuCount || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
                  [just.cpuCount]: (Number(s.handsByCpuCount?.[just.cpuCount]) || 0) + 1,
                },
              };

              // cpu stacks (first N CPUs)
              const cpuStacks = Array(5).fill(settings.startChips);
              for (let i = 1; i < Math.min(6, (just.stacks?.length || 0)); i++) cpuStacks[i - 1] = Number(just.stacks[i] ?? 0) || 0;
              nextStats.cpuStacks = cpuStacks;

              // win/loss counters (簡易)
              if (heroDelta > 0 && (just.deltas || []).slice(1).every((d) => Number(d) <= 0)) nextStats.playerWins = (Number(s.playerWins) || 0) + 1;
              if (heroDelta < 0 && (just.deltas || []).slice(1).some((d) => Number(d) > 0)) nextStats.cpuWins = (Number(s.cpuWins) || 0) + 1;

              saveStats(nextStats);
              return nextStats;
            });

            // update history (max 10)
            setHistory((cur) => {
              const prevH = Array.isArray(cur) ? cur : [];
              const pot = Array.isArray(just.potDetails) ? just.potDetails.reduce((a, p) => a + (Number(p.amount) || 0), 0) : 0;
              const at = just.at || new Date().toISOString();
              const entry = {
                id: `h-${seq}-${at}`,
                at,
                atText: new Date(at).toLocaleString(),
                cpuCount: just.cpuCount,
                blindsOn: !!just.blindsOn,
                smallBlind: just.smallBlind,
                bigBlind: just.bigBlind,
                ante: just.ante,
                pot,
                summary: heroDelta > 0 ? `あなた：+${heroDelta}` : heroDelta < 0 ? `あなた：${heroDelta}` : "あなた：±0",
              };
              const nextH = [entry, ...prevH].slice(0, 10);
              saveHistory(nextH);
              return nextH;
            });
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
