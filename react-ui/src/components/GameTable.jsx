import { SeatPanel } from "./SeatPanel.jsx";
import "./game.css";

function seatPositionsForCpuCount(cpuCount) {
  // Hero is always bottom. CPU seats placed in a vertical-ellipse layout.
  // Keys align with CSS grid areas.
  if (cpuCount === 1) return ["tc"];
  if (cpuCount === 3) return ["ml", "tc", "mr"];
  if (cpuCount === 5) return ["tl", "tc", "tr", "ml", "mr"];
  // fallback (should not happen for this mock)
  return ["tc"];
}

export function GameTable({ mock }) {
  const cpuSeats = mock.seats.filter((s) => s.kind === "cpu");
  const hero = mock.seats.find((s) => s.kind === "hero");
  const positions = seatPositionsForCpuCount(mock.hud.cpuCount);

  return (
    <div className={`table-wrap cpu-${mock.hud.cpuCount}`} aria-label="テーブル">
      <div className="table-grid" role="presentation">
        <div className="cell seat tl" aria-label="CPU席（左上）">
          {positions.includes("tl") && <SeatPanel seat={cpuSeats[0]} showdown={mock.showdown} />}
        </div>
        <div className="cell seat tc" aria-label="CPU席（上）">
          {positions.includes("tc") && <SeatPanel seat={cpuSeats[positions.indexOf("tc")]} showdown={mock.showdown} />}
        </div>
        <div className="cell seat tr" aria-label="CPU席（右上）">
          {positions.includes("tr") && <SeatPanel seat={cpuSeats[2]} showdown={mock.showdown} />}
        </div>

        <div className="cell seat ml" aria-label="CPU席（左）">
          {positions.includes("ml") && <SeatPanel seat={cpuSeats[positions.indexOf("ml")]} showdown={mock.showdown} />}
        </div>

        <div className="cell pot" aria-label="ポット">
          <div className="pot-plate">
            <div className="pot-line">
              <span className="pot-lbl">ポット</span>
              <span className="pot-val">{mock.pot}</span>
            </div>
          </div>
        </div>

        <div className="cell seat mr" aria-label="CPU席（右）">
          {positions.includes("mr") && <SeatPanel seat={cpuSeats[positions.indexOf("mr")]} showdown={mock.showdown} />}
        </div>

        <div className="cell seat hero" aria-label="あなた席">
          <SeatPanel seat={hero} showdown={mock.showdown} />
        </div>
      </div>
    </div>
  );
}

