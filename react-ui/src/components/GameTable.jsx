import { SeatPanel } from "./SeatPanel.jsx";
import "./game.css";
import { selectSeatViewModel } from "../selectors/seatViewModel.js";

const CELLS = ["lt", "lm", "lb", "rt", "rm", "rb"];
const HERO_POS_TO_CELL = {
  "right-bottom": "rb",
  "right-middle": "rm",
  "right-top": "rt",
  "left-bottom": "lb",
  "left-middle": "lm",
  "left-top": "lt",
};

function buildSeatAssignments(cpuCount, heroPos) {
  const heroCell = HERO_POS_TO_CELL[heroPos] || "rb";
  const cells = CELLS.filter((c) => c !== heroCell);
  const map = { [heroCell]: 0 };
  for (let i = 1; i <= cpuCount; i++) {
    map[cells[i - 1]] = i;
  }
  return { heroCell, map };
}

export function GameTable({ mock }) {
  const cpuCount = mock.hud.cpuCount;
  const heroPos = mock?.settings?.playerSeatPosition || "right-bottom";
  const { heroCell, map } = buildSeatAssignments(cpuCount, heroPos);

  return (
    <div className={`table-wrap table-wrap-sides cpu-${cpuCount} hero-${heroCell}`} aria-label="テーブル">
      <div className="table-grid table-grid-sides" role="presentation">
        <div className="cell seat lt" aria-label="席（左上）">
          {map.lt != null ? <SeatPanel vm={selectSeatViewModel(mock, map.lt)} /> : null}
        </div>
        <div className="cell seat rt" aria-label="席（右上）">
          {map.rt != null ? <SeatPanel vm={selectSeatViewModel(mock, map.rt)} /> : null}
        </div>

        <div className="cell seat lm" aria-label="席（左中央）">
          {map.lm != null ? <SeatPanel vm={selectSeatViewModel(mock, map.lm)} /> : null}
        </div>
        <div className="cell pot" aria-label="ポット">
          <div className="pot-plate">
            <div className="pot-line">
              <span className="pot-lbl">ポット</span>
              <span className="pot-val">{mock.pot.amountText}</span>
            </div>
          </div>
        </div>
        <div className="cell seat rm" aria-label="席（右中央）">
          {map.rm != null ? <SeatPanel vm={selectSeatViewModel(mock, map.rm)} /> : null}
        </div>

        <div className="cell seat lb" aria-label="席（左下）">
          {map.lb != null ? <SeatPanel vm={selectSeatViewModel(mock, map.lb)} /> : null}
        </div>
        <div className="cell seat rb" aria-label="席（右下）">
          {map.rb != null ? <SeatPanel vm={selectSeatViewModel(mock, map.rb)} /> : null}
        </div>
      </div>
    </div>
  );
}

