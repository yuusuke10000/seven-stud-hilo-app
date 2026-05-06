import { SeatPanel } from "./SeatPanel.jsx";
import "./game.css";
import { selectSeatViewModel } from "../selectors/seatViewModel.js";

function seatPositionsForCpuCount(cpuCount) {
  // Hero is always bottom. CPU seats placed in a vertical-ellipse layout.
  // Keys align with CSS grid areas.
  if (cpuCount === 1) return ["tc"];
  if (cpuCount === 3) return ["ml", "tc", "mr"];
  if (cpuCount === 5) return ["tl", "tc", "tr", "ml", "mr"];
  // fallback (should not happen for this mock)
  return ["tc"];
}

function seatIdByCell(cpuCount, cellKey) {
  // seatId: 0=hero, 1..cpuCount=cpu
  if (cpuCount === 1) {
    return cellKey === "tc" ? 1 : null;
  }
  if (cpuCount === 3) {
    if (cellKey === "ml") return 1;
    if (cellKey === "tc") return 2;
    if (cellKey === "mr") return 3;
    return null;
  }
  if (cpuCount === 5) {
    if (cellKey === "tl") return 1;
    if (cellKey === "tc") return 2;
    if (cellKey === "tr") return 3;
    if (cellKey === "ml") return 4;
    if (cellKey === "mr") return 5;
    return null;
  }
  return null;
}

export function GameTable({ mock }) {
  const positions = seatPositionsForCpuCount(mock.hud.cpuCount);
  const cpuCount = mock.hud.cpuCount;

  return (
    <div className={`table-wrap cpu-${mock.hud.cpuCount}`} aria-label="テーブル">
      <div className="table-grid" role="presentation">
        <div className="cell seat tl" aria-label="CPU席（左上）">
          {positions.includes("tl") && <SeatPanel vm={selectSeatViewModel(mock, seatIdByCell(cpuCount, "tl"))} />}
        </div>
        <div className="cell seat tc" aria-label="CPU席（上）">
          {positions.includes("tc") && <SeatPanel vm={selectSeatViewModel(mock, seatIdByCell(cpuCount, "tc"))} />}
        </div>
        <div className="cell seat tr" aria-label="CPU席（右上）">
          {positions.includes("tr") && <SeatPanel vm={selectSeatViewModel(mock, seatIdByCell(cpuCount, "tr"))} />}
        </div>

        <div className="cell seat ml" aria-label="CPU席（左）">
          {positions.includes("ml") && <SeatPanel vm={selectSeatViewModel(mock, seatIdByCell(cpuCount, "ml"))} />}
        </div>

        <div className="cell pot" aria-label="ポット">
          <div className="pot-plate">
            <div className="pot-line">
              <span className="pot-lbl">ポット</span>
              <span className="pot-val">{mock.pot.amountText}</span>
            </div>
          </div>
        </div>

        <div className="cell seat mr" aria-label="CPU席（右）">
          {positions.includes("mr") && <SeatPanel vm={selectSeatViewModel(mock, seatIdByCell(cpuCount, "mr"))} />}
        </div>

        <div className="cell seat hero" aria-label="あなた席">
          <SeatPanel vm={selectSeatViewModel(mock, 0)} />
        </div>
      </div>
    </div>
  );
}

