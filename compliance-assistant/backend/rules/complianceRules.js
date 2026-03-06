// Compliance normalization helpers used by scoring and recommendations.

function normalizeAnswer(answer) {
  // Normalize common answer variants.
  const v = String(answer || "").trim().toLowerCase();
  if (v === "yes" || v === "y" || v === "true") return "YES";
  if (v === "partial" || v === "partially") return "PARTIAL";
  if (v === "no" || v === "n" || v === "false") return "NO";
  return "";
}

export function getComplianceState(answer) {
  // Convert one answer into a compliance label.
  const normalized = normalizeAnswer(answer);
  if (normalized === "YES") return "FULLY_COMPLIANT";
  if (normalized === "PARTIAL") return "PARTIALLY_COMPLIANT";
  if (normalized === "NO") return "NOT_COMPLIANT";
  return "UNANSWERED";
}

// One ISO control can have multiple questions (Q1, Q2,).
// This function rolls those into ONE final status:
// Threshold-based rule (numeric average):
// - YES = 1.0, PARTIAL = 0.5, NO = 0.0
// - avg == 1.0                  -> FULLY_COMPLIANT
// - avg >= 0.5 and avg < 1.0     -> PARTIALLY_COMPLIANT
// - avg < 0.5                    -> NOT_COMPLIANT
// - nothing answered             -> UNANSWERED
export function getControlComplianceState(questionAnswers) {
  // Reduce multiple question answers for one control into one final compliance label.
  const answersArray = Array.isArray(questionAnswers)
    ? questionAnswers
    : questionAnswers == null
      ? []
      : [questionAnswers];

  const scores = answersArray
    .map((a) => getComplianceState(a))
    .map((state) => {
      if (state === "FULLY_COMPLIANT") return 1;
      if (state === "PARTIALLY_COMPLIANT") return 0.5;
      if (state === "NOT_COMPLIANT") return 0;
      return null;
    })
    .filter((v) => v != null);

  if (scores.length === 0) return "UNANSWERED";

  const sum = scores.reduce((acc, v) => acc + Number(v), 0);
  const avg = sum / scores.length;

  if (avg === 1) return "FULLY_COMPLIANT";
  if (avg > 0) return "PARTIALLY_COMPLIANT";
  return "NOT_COMPLIANT";
}
