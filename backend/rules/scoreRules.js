// Score weights used by the scoring utilities.

export const SCORE_RULES = {
  // If a control is fully compliant, it gets full points.
  YES: 1,

  // Partial compliance gets half points.
  PARTIAL: 0.5,

  // Not compliant gets zero points.
  NO: 0,
};
