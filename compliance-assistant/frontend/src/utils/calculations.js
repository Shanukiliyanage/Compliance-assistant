export function calculatePercentages(y, p, n, na, isMandatory = false) {
  const t = isMandatory ? (y + p + n) : (y + p + n + na);
  if (t === 0) return { yes: 0, partial: 0, no: 0, na: 0, total: 0 };

  const getPct = (val) => Number(((val / t) * 100).toFixed(1));

  return {
    yes: getPct(y),
    partial: getPct(p),
    no: getPct(n),
    na: isMandatory ? 0 : getPct(na),
    total: t
  };
}
