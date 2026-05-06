import "./game.css";

function isRedSuit(s) {
  return s === "♥" || s === "♦";
}

export function Card({ rank, suit, faceUp = true }) {
  if (!faceUp) {
    return (
      <span className="card card-back" aria-label="伏せカード">
        <span className="back-pattern" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={`card ${isRedSuit(suit) ? "red" : "black"}`} aria-label={`カード ${rank}${suit}`}>
      <span className="rank">{rank}</span>
      <span className="suit">{suit}</span>
    </span>
  );
}

