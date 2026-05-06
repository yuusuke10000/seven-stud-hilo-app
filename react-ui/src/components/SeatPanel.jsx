import { Card } from "./Card.jsx";
import "./game.css";

function fmtNum(n) {
  const x = Number(n ?? 0);
  return x.toLocaleString("ja-JP");
}

function chipBand(chips, base = 1000) {
  const n = Number(chips ?? 0);
  if (n <= 0) return "chip-zero";
  if (n < base * 0.5) return "chip-low";
  if (n >= base * 1.5) return "chip-high";
  return "chip-mid";
}

function mockCards() {
  return [
    { r: "A", s: "♠" },
    { r: "7", s: "♦" },
    { r: "Q", s: "♥" },
    { r: "3", s: "♣" },
    { r: "9", s: "♠" },
    { r: "2", s: "♦" },
    { r: "8", s: "♥" },
  ];
}

function shouldShowRoles({ seat, showdown }) {
  if (seat.folded) return false;
  if (!showdown) {
    // CPUはショーダウン前に役を出さない（モックでも同方針）
    if (seat.kind === "cpu") return false;
    return true;
  }
  return true;
}

export function SeatPanel({ seat, showdown }) {
  if (!seat) return null;

  const folded = !!seat.folded;
  const allIn = !!seat.allIn && !folded;
  const winner = !!seat.winner && !folded;

  const classes = [
    "seat-panel",
    seat.kind === "hero" ? "seat--hero seat-human" : "seat--cpu",
    folded ? "seat--folded" : "seat--normal",
    allIn ? "seat--allin" : "",
    winner ? "seat--winner" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showRoles = shouldShowRoles({ seat, showdown });
  const cards = mockCards();

  return (
    <div className={classes}>
      <div className="seat-head">
        <span className="seat-name">{seat.name}</span>
        {allIn ? <span className="seat-allin-badge">オールイン</span> : null}
        {folded ? <span className="seat-fold-badge seat-fold-badge-lg">フォールド</span> : null}
        <span className={`seat-chips ${chipBand(seat.chips)}`}>{fmtNum(seat.chips)}</span>
      </div>

      {folded ? null : (
        <div className="hand" aria-label="手札（モック）">
          {cards.map((c, idx) => (
            <Card key={`${idx}-${c.r}${c.s}`} rank={c.r} suit={c.s} />
          ))}
        </div>
      )}

      <div className={`seat-card-foot ${folded ? "is-folded" : ""}`} aria-label="直近アクション・役">
        <div className="seat-foot-line seat-foot-line1">
          <span className="seat-foot-left">{folded ? "フォールド" : seat.action || ""}</span>
          <span className="seat-foot-right">{showRoles ? seat.hi || "" : ""}</span>
        </div>
        <div className="seat-foot-line seat-foot-line2">
          <span className="seat-foot-left"></span>
          <span className="seat-foot-right">{showRoles ? seat.lo || "" : ""}</span>
        </div>
      </div>
    </div>
  );
}

