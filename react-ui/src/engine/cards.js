export const SUIT_CHARS = ["♠", "♥", "♦", "♣"];

export function rankLabel(r) {
  const n = Number(r);
  if (n >= 2 && n <= 10) return String(n);
  if (n === 11) return "J";
  if (n === 12) return "Q";
  if (n === 13) return "K";
  if (n === 14) return "A";
  return "?";
}

/** Card shape compatible with legacy app.js: { r: 2..14, s: 0..3 } */
export function makeDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ r, s });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle. Inject random() for testability (default Math.random). */
export function shuffleInPlace(arr, random = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

