// converts an average score into a maturity label

function clamp01(n) {
  // clamp to 0..1
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function getMaturityLevelFromAverage(averageScore) {
  // 0..1 score in, maturity label out
  const a = clamp01(averageScore);

  // thresholds: 0-0.20 Initial, 0.21-0.40 Basic, 0.41-0.60 Developing, 0.61-0.80 Managed, 0.81-1.00 Optimized
  if (a <= 0.2) return "Initial";
  if (a <= 0.4) return "Basic";
  if (a <= 0.6) return "Developing";
  if (a <= 0.8) return "Managed";
  return "Optimized";
}

export function getMaturityLevelFromPercent(percent) {
  // same thresholds but takes 0..100 instead of 0..1
  const p = Number(percent);
  const n = Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
  return getMaturityLevelFromAverage(n / 100);
}
