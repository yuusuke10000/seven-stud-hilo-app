import "./game.css";

function isRedSuit(s) {
  return s === "♥" || s === "♦";
}

export function Card({ rank, suit }) {
  return (
    <span className={`card ${isRedSuit(suit) ? "red" : "black"}`} aria-label={`カード ${rank}${suit}`}>
      <span className="rank">{rank}</span>
      <span className="suit">{suit}</span>
    </span>
  );
}

