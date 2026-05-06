export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function fmtNum(n) {
  const x = Number(n ?? 0);
  return x.toLocaleString("ja-JP");
}

export function fmtSigned(n) {
  const x = Number(n ?? 0);
  const abs = Math.abs(x).toLocaleString("ja-JP");
  return x > 0 ? `+${abs}` : x < 0 ? `-${abs}` : "0";
}

