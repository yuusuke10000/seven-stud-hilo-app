export function splitEvenlyAmong(awards, indices, amount) {
  if (!indices.length || amount <= 0) return;
  const share = Math.floor(amount / indices.length);
  let spent = 0;
  for (const idx of indices) {
    awards[idx] += share;
    spent += share;
  }
  const rem = amount - spent;
  if (rem > 0) awards[indices[0]] += rem;
}

/**
 * Legacy split behavior:
 * - If low not ok: high winners split total.
 * - Otherwise: scoop check; else highPool=ceil(total/2), lowPool=total-highPool
 */
export function splitPotAmounts(total, highWinners, lowWinners, lowOk, numP) {
  const awards = Array(numP).fill(0);
  if (!lowOk) {
    splitEvenlyAmong(awards, highWinners, total);
    return awards;
  }
  const scoop =
    highWinners.length === 1 &&
    lowWinners.length === 1 &&
    highWinners[0] === lowWinners[0];
  if (scoop) {
    awards[highWinners[0]] += total;
    return awards;
  }
  const highPool = Math.ceil(total / 2);
  const lowPool = total - highPool;
  splitEvenlyAmong(awards, highWinners, highPool);
  splitEvenlyAmong(awards, lowWinners, lowPool);
  return awards;
}

/**
 * Build side pots from totalCommitted.
 * - Folded seats are excluded from eligibility (winner candidates),
 *   but their committed chips remain in pot amounts.
 * - All-in is not treated as folded: caller should pass folded[] only.
 */
export function buildSidePotsFromTotals(totalCommitted, folded, n) {
  const totals = Array.from({ length: n }, (_, i) => totalCommitted[i] ?? 0);
  const levels = [...new Set(totals.filter((x) => x > 0))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  let idx = 0;
  for (const level of levels) {
    const w = level - prev;
    if (w <= 0) {
      prev = level;
      continue;
    }
    let amount = 0;
    for (let i = 0; i < n; i++) {
      const c = totals[i];
      amount += Math.min(c, level) - Math.min(c, prev);
    }
    const eligible = [];
    for (let i = 0; i < n; i++) {
      if (!folded[i] && totals[i] >= level) eligible.push(i);
    }
    const label = idx === 0 ? "Main Pot" : `Side Pot ${idx}`;
    pots.push({ amount, eligible, eligiblePlayers: eligible, label, level });
    idx += 1;
    prev = level;
  }
  return pots;
}

/** Mirror of legacy debug tests (pure). */
export function runSidePotTests() {
  const out = [];
  function pushCase(name, ok, detail) {
    out.push({ name, ok, detail: detail || "" });
  }
  try {
    const n = 3;
    const tc = [50, 100, 100];
    const folded = [false, false, false];
    const p1 = buildSidePotsFromTotals(tc, folded, n);
    const ok1 =
      p1.length === 2 &&
      p1[0].amount === 150 &&
      p1[1].amount === 100 &&
      p1[0].eligible.length === 3 &&
      p1[1].eligible.join(",") === "1,2";
    pushCase("Player 50 all-in vs 100/100: Main 150, Side 100, eligible", ok1, JSON.stringify(p1));

    const tc2 = [40, 80, 120, 120];
    const p2 = buildSidePotsFromTotals(tc2, [false, false, false, false], 4);
    const ok2 =
      p2.length === 3 &&
      p2[0].amount === 160 &&
      p2[1].amount === 120 &&
      p2[2].amount === 80 &&
      p2[0].eligible.length === 4 &&
      p2[1].eligible.sort((a, b) => a - b).join(",") === "1,2,3" &&
      p2[2].eligible.sort((a, b) => a - b).join(",") === "2,3";
    pushCase("40/80/120/120: three pots 160+120+80", ok2, JSON.stringify(p2));

    const p3 = buildSidePotsFromTotals([50, 100, 100], [true, false, false], 3);
    const sum3 = p3.reduce((a, x) => a + x.amount, 0);
    const ok3 = sum3 === 250 && !p3.some((x) => x.eligible.includes(0));
    pushCase("Folded short stack: pot total kept, seat0 not eligible", ok3, JSON.stringify(p3));

    const p4 = buildSidePotsFromTotals([50, 100, 100], [false, false, false], 3);
    const ok4 = p4[1].eligible.includes(0) === false && p4[0].eligible.includes(0) === true;
    pushCase("All-in short only in main: not in side eligible", ok4, "");
  } catch (e) {
    pushCase("exception", false, String(e));
  }
  return out;
}

