// compliance helpers used by scoring and recommendations

function normalizeAnswer(answer) {
  // normalize answer variants (capitalisation etc.)
  const v = String(answer || "").trim().toLowerCase();
  if (v === "yes" || v === "y" || v === "true") return "YES";
  if (v === "partial" || v === "partially") return "PARTIAL";
  if (v === "no" || v === "n" || v === "false") return "NO";
  return "";
}

export function getComplianceState(answer) {
  // convert a single answer to a compliance label
  const normalized = normalizeAnswer(answer);
  if (normalized === "YES") return "FULLY_COMPLIANT";
  if (normalized === "PARTIAL") return "PARTIALLY_COMPLIANT";
  if (normalized === "NO") return "NOT_COMPLIANT";
  return "UNANSWERED";
}

// roll up multiple question answers for one control into a single compliance status
// YES = 1.0, PARTIAL = 0.5, NO = 0.0
// avg 1.0 -> FULLY_COMPLIANT, 0 < avg < 1 -> PARTIALLY_COMPLIANT, 0 -> NOT_COMPLIANT
export function getControlComplianceState(questionAnswers) {
  // combine all question answers for this control into one label
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
