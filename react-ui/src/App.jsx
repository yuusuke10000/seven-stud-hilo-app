import { useMemo, useState } from "react";
import "./App.css";
import { GameScreen } from "./components/GameScreen.jsx";
import { createMockGameState } from "./mock/mockGameState.js";

export default function App() {
  const [cpuCount, setCpuCount] = useState(5);
  const [isShowdown, setIsShowdown] = useState(false);
  const [withFold, setWithFold] = useState(true);
  const [withAllIn, setWithAllIn] = useState(true);
  const [withWinners, setWithWinners] = useState(true);

  const mock = useMemo(
    () => createMockGameState({ cpuCount, isShowdown, withFold, withAllIn, withWinners }),
    [cpuCount, isShowdown, withFold, withAllIn, withWinners]
  );

  return (
    <div className="app">
      <header className="proto-bar" aria-label="モック切替">
        <div className="proto-row">
          <label className="proto-field">
            CPU人数
            <select value={cpuCount} onChange={(e) => setCpuCount(Number(e.target.value))}>
              {mock.view.cpuChoices.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="proto-field">
            状態
            <select value={isShowdown ? "showdown" : "play"} onChange={(e) => setIsShowdown(e.target.value === "showdown")}>
              <option value="play">ショーダウン前</option>
              <option value="showdown">ショーダウン後</option>
            </select>
          </label>
        </div>
        <div className="proto-row proto-row-toggles">
          <label className="proto-toggle">
            <input type="checkbox" checked={withFold} onChange={(e) => setWithFold(e.target.checked)} />
            Foldあり
          </label>
          <label className="proto-toggle">
            <input type="checkbox" checked={withAllIn} onChange={(e) => setWithAllIn(e.target.checked)} />
            All-inあり
          </label>
          <label className="proto-toggle">
            <input type="checkbox" checked={withWinners} onChange={(e) => setWithWinners(e.target.checked)} />
            勝者あり
          </label>
        </div>
      </header>

      <main className="app-main">
        <GameScreen mock={mock} />
      </main>
    </div>
  );
}
