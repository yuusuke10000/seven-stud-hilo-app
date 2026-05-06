import { rankLabel } from "./cards.js";

function combinations5(arr) {
  const out = [];
  const n = arr.length;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let d = c + 1; d < n; d++) {
          for (let e = d + 1; e < n; e++) {
            out.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
          }
        }
      }
    }
  }
  return out;
}

export function compareKeysHigh(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function straightHighFromFiveCards(cards) {
  const ranks = cards.map((c) => c.r);
  const u = [...new Set(ranks)];
  if (u.length !== 5) return null;
  u.sort((x, y) => x - y);
  // Wheel straight (A-2-3-4-5) is treated as 5-high in legacy.
  if (u[0] === 2 && u[1] === 3 && u[2] === 4 && u[3] === 5 && u[4] === 14) {
    return 5;
  }
  for (let i = 0; i < 4; i++) {
    if (u[i + 1] !== u[i] + 1) return null;
  }
  return u[4];
}

export function evaluateFiveHigh(cards) {
  const ranks = cards.map((c) => c.r);
  const sortedDesc = [...ranks].sort((a, b) => b - a);
  const byRank = {};
  for (const r of ranks) {
    byRank[r] = (byRank[r] || 0) + 1;
  }
  const entries = Object.keys(byRank).map((k) => Number(k));
  const countsList = entries.map((r) => ({ r, n: byRank[r] }));
  countsList.sort((a, b) => {
    if (b.n !== a.n) return b.n - a.n;
    return b.r - a.r;
  });

  const isFlush = cards.every((c) => c.s === cards[0].s);
  const straightTop = straightHighFromFiveCards(cards);

  if (isFlush && straightTop !== null) {
    return {
      key: [8, straightTop],
      category: "straight_flush",
      nameJa: "ストレートフラッシュ",
      detailJa: `トップ ${rankLabel(straightTop)}`,
      cards,
    };
  }

  if (countsList[0].n === 4) {
    const quad = countsList[0].r;
    const kicker = countsList.find((x) => x.n === 1).r;
    return {
      key: [7, quad, kicker],
      category: "four_kind",
      nameJa: "フォーカード",
      detailJa: `${rankLabel(quad)} ×4 · キッカー ${rankLabel(kicker)}`,
      cards,
    };
  }

  if (countsList[0].n === 3 && countsList[1].n === 2) {
    const trips = countsList[0].r;
    const pair = countsList[1].r;
    return {
      key: [6, trips, pair],
      category: "full_house",
      nameJa: "フルハウス",
      detailJa: `${rankLabel(trips)} のスリーカード & ${rankLabel(pair)} のペア`,
      cards,
    };
  }

  if (isFlush) {
    const hi = sortedDesc;
    return {
      key: [5, ...hi],
      category: "flush",
      nameJa: "フラッシュ",
      detailJa: sortedDesc.map(rankLabel).join(" "),
      cards,
    };
  }

  if (straightTop !== null) {
    return {
      key: [4, straightTop],
      category: "straight",
      nameJa: "ストレート",
      detailJa: `トップ ${rankLabel(straightTop)}`,
      cards,
    };
  }

  if (countsList[0].n === 3) {
    const t = countsList[0].r;
    const kickers = countsList
      .filter((x) => x.n === 1)
      .map((x) => x.r)
      .sort((a, b) => b - a);
    return {
      key: [3, t, ...kickers],
      category: "three_kind",
      nameJa: "スリーカード",
      detailJa: `${rankLabel(t)} ×3 · ${kickers.map(rankLabel).join(" ")}`,
      cards,
    };
  }

  if (countsList[0].n === 2 && countsList[1].n === 2) {
    const p1 = Math.max(countsList[0].r, countsList[1].r);
    const p2 = Math.min(countsList[0].r, countsList[1].r);
    const kicker = countsList[2].r;
    return {
      key: [2, p1, p2, kicker],
      category: "two_pair",
      nameJa: "ツーペア",
      detailJa: `${rankLabel(p1)} & ${rankLabel(p2)} · キッカー ${rankLabel(kicker)}`,
      cards,
    };
  }

  if (countsList[0].n === 2) {
    const p = countsList[0].r;
    const kickers = countsList
      .filter((x) => x.n === 1)
      .map((x) => x.r)
      .sort((a, b) => b - a);
    return {
      key: [1, p, ...kickers],
      category: "one_pair",
      nameJa: "ワンペア",
      detailJa: `${rankLabel(p)} のペア · ${kickers.map(rankLabel).join(" ")}`,
      cards,
    };
  }

  return {
    key: [0, ...sortedDesc],
    category: "high_card",
    nameJa: "ハイカード",
    detailJa: sortedDesc.map(rankLabel).join(" "),
    cards,
  };
}

export function bestHighFromSeven(cards7) {
  const combos = combinations5(cards7);
  let best = null;
  for (const c5 of combos) {
    const ev = evaluateFiveHigh(c5);
    if (!best || compareKeysHigh(ev.key, best.key) > 0) {
      best = ev;
    }
  }
  return best;
}

export function lowRanksFromFive(cards) {
  // 8 or Better: A(=1), 2..8 only, 5 distinct ranks.
  const mapped = cards.map((c) => {
    if (c.r === 14) return 1;
    if (c.r >= 2 && c.r <= 8) return c.r;
    return null;
  });
  if (mapped.some((x) => x === null)) return null;
  const set = new Set(mapped);
  if (set.size !== 5) return null;
  return [...set].sort((a, b) => a - b);
}

export function compareLowKeys(a, b) {
  // legacy compare: compare highest card first (index 4 -> 0); smaller is better.
  for (let i = 4; i >= 0; i--) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function formatLowKeyJa(key) {
  const order = [...key].sort((a, b) => b - a);
  const labels = order.map((n) => (n === 1 ? "A" : String(n)));
  return labels.join("-");
}

export function bestLowFromSeven(cards7) {
  const combos = combinations5(cards7);
  let bestKey = null;
  let bestCards = null;
  for (const c5 of combos) {
    const key = lowRanksFromFive(c5);
    if (!key) continue;
    if (!bestKey || compareLowKeys(key, bestKey) < 0) {
      bestKey = key;
      bestCards = c5;
    }
  }
  if (!bestKey) return null;
  return {
    key: bestKey,
    labelJa: formatLowKeyJa(bestKey),
    cards: bestCards,
  };
}

export function isWheelLowKey(key) {
  if (!key || key.length !== 5) return false;
  const sorted = [...key].sort((a, b) => a - b);
  return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3 && sorted[3] === 4 && sorted[4] === 5;
}

/** Low ladder label for UI: 5/6/7/8 TOP or ローなし. */
export function lowLadderShortJa(lo) {
  if (!lo) return "ローなし";
  if (isWheelLowKey(lo.key)) return "5 TOP";
  const mx = Math.max.apply(null, lo.key);
  if (mx >= 8) return "8 TOP";
  if (mx === 7) return "7 TOP";
  if (mx === 6) return "6 TOP";
  if (mx <= 5) return "5 TOP";
  return "ローなし";
}

