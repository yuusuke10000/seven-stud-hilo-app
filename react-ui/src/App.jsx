import { useMemo, useState } from "react";
import "./App.css";
import { GameScreen } from "./components/GameScreen.jsx";

const CPU_CHOICES = [1, 3, 5];

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function fmtNum(n) {
  const x = Number(n ?? 0);
  return x.toLocaleString("ja-JP");
}

function makeMockState({ cpuCount, showdown, withFold, withAllIn, withWinners }) {
  const nCpu = clamp(cpuCount, 1, 5);

  /** seats: 0=hero, 1..5=cpu */
  const seats = [];
  seats.push({
    id: 0,
    kind: "hero",
    name: "あなた",
    chips: 820,
    action: "チェック",
    folded: false,
    allIn: false,
    winner: withWinners,
    hi: showdown ? "ハイ：ワンペア" : "",
    lo: showdown ? "ロー：8 TOP" : "",
  });

  for (let i = 1; i <= nCpu; i++) {
    const folded = withFold && i === 3; // CPU3 をフォールド例に
    const allIn = withAllIn && i === 2; // CPU2 をオールイン例に
    const winner = withWinners && (i === 1 || i === 2); // 複数勝者例
    seats.push({
      id: i,
      kind: "cpu",
      name: `CPU ${i}`,
      chips: i === 2 ? 0 : i === 4 ? 180 : i === 5 ? 2200 : 980,
      action: folded ? "フォールド" : allIn ? "コール 20" : "コール 20",
      folded,
      allIn,
      winner,
      hi: showdown && !folded ? "ハイ：ツーペア" : "",
      lo: showdown && !folded ? "ロー：ローなし" : "",
    });
  }

  const pot = 240 + (withAllIn ? 180 : 0) + (withFold ? 40 : 0);

  const miniLog = [
    { kind: "sep" },
    {
      kind: "line",
      who: "あなた",
      delta: +120,
      role: "ハイ：ワンペア",
    },
    { kind: "line", who: "CPU 1", delta: -60, role: "" },
    { kind: "line", who: "CPU 2", delta: -60, role: "" },
    { kind: "sep" },
    { kind: "line", who: "あなた", delta: -20, role: "" },
    { kind: "line", who: "CPU 1", delta: +20, role: "ロー：8 TOP" },
  ];

  const supportAi = showdown
    ? { mode: "fixed", text: "ショーダウン後です。" }
    : {
        mode: "odds",
        high: [
          { label: "フラッシュ以上", pct: 6 },
          { label: "ストレート以上", pct: 12 },
          { label: "ツーペア以上", pct: 32 },
          { label: "ワンペア以上", pct: 68 },
        ],
        low: [
          { label: "8 TOP", pct: 24 },
          { label: "7 TOP", pct: 14 },
          { label: "6 TOP", pct: 7 },
          { label: "5 TOP", pct: 2 },
          { label: "ローなし", pct: 53 },
        ],
      };

  const handRanks = {
    high: ["フォーカード以上", "フルハウス", "フラッシュ", "ストレート", "スリーカード", "ツーペア", "ワンペア", "ハイカード"],
    low: ["5 TOP", "6 TOP", "7 TOP", "8 TOP", "ローなし"],
    activeHigh: showdown ? "ワンペア" : null,
    activeLow: showdown ? "8 TOP" : null,
  };

  return {
    hud: {
      ante: 10,
      sb: 10,
      bb: 20,
      cpuCount: nCpu,
    },
    pot: fmtNum(pot),
    showdown,
    seats,
    miniLog,
    supportAi,
    handRanks,
  };
}

export default function App() {
  const [cpuCount, setCpuCount] = useState(5);
  const [showdown, setShowdown] = useState(false);
  const [withFold, setWithFold] = useState(true);
  const [withAllIn, setWithAllIn] = useState(true);
  const [withWinners, setWithWinners] = useState(true);

  const mock = useMemo(
    () => makeMockState({ cpuCount, showdown, withFold, withAllIn, withWinners }),
    [cpuCount, showdown, withFold, withAllIn, withWinners]
  );

  return (
    <div className="app">
      <header className="proto-bar" aria-label="モック切替">
        <div className="proto-row">
          <label className="proto-field">
            CPU人数
            <select value={cpuCount} onChange={(e) => setCpuCount(Number(e.target.value))}>
              {CPU_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="proto-field">
            状態
            <select value={showdown ? "showdown" : "play"} onChange={(e) => setShowdown(e.target.value === "showdown")}>
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
