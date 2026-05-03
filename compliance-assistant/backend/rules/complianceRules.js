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
// - avg > 0 and avg < 1.0        -> PARTIALLY_COMPLIANT
// - avg == 0                     -> NOT_COMPLIANT
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

// --- ISO/IEC 27001 Rule-based Compliance Evaluation System ---

// 1. CONTROL GROUP DEFINITIONS
const CONTROL_GROUPS = [
  {
    name: "SUPPLIER MANAGEMENT",
    type: "CONTEXTUAL",
    parent: "A.5.19",
    children: ["A.5.20", "A.5.21", "A.5.22"],
  },
  {
    name: "CLOUD SERVICES",
    type: "CONTEXTUAL",
    parent: "A.5.23",
    children: ["A.5.23.1", "A.5.23.2", "A.5.23.3"], // Replace with actual cloud sub-questions
  },
  {
    name: "SOFTWARE DEVELOPMENT",
    type: "CONTEXTUAL",
    parent: "A.8.25",
    children: ["A.8.26", "A.8.27", "A.8.28", "A.8.29", "A.8.31", "A.8.33"],
  },
  {
    name: "INCIDENT MANAGEMENT",
    type: "MANDATORY",
    parent: "A.5.24",
    children: ["A.5.25", "A.5.26", "A.5.27", "A.5.28"],
  },
  {
    name: "NETWORK SECURITY",
    type: "MANDATORY",
    parent: "A.8.20",
    children: ["A.8.21"],
  },
];

// 2. SCORING MODEL
const SCORE_MAP = {
  YES: 1.0,
  PARTIAL: 0.5,
  NO: 0.0,
  IMPLICIT_NO: 0.0,
};

// 3. GATEWAY LOGIC IMPLEMENTATION
function applyGatewayLogic(answers) {
  // answers: { [controlId]: { answer: 'YES'|'NO'|'PARTIAL'|... } }
  const excludedControls = new Set(); // TRUE_NA
  const implicitFailures = new Set(); // IMPLICIT_NO
  const patchedAnswers = { ...answers };

  for (const group of CONTROL_GROUPS) {
    const parentAns = normalizeAnswer(answers[group.parent]?.answer);
    if (parentAns === "NO") {
      if (group.type === "CONTEXTUAL") {
        for (const child of group.children) {
          patchedAnswers[child] = { answer: "TRUE_NA" };
          excludedControls.add(child);
        }
      } else if (group.type === "MANDATORY") {
        for (const child of group.children) {
          patchedAnswers[child] = { answer: "IMPLICIT_NO" };
          implicitFailures.add(child);
        }
      }
    }
  }
  return { patchedAnswers, excludedControls, implicitFailures };
}

// 4. CALCULATION RULES
function calculateScores(answers, weights = {}) {
  // answers: { [controlId]: { answer: ... } }
  // weights: { [controlId]: number }
  const controlScores = {};
  let numerator = 0;
  let denominator = 0;

  for (const [controlId, { answer }] of Object.entries(answers)) {
    if (answer === "TRUE_NA") continue; // Exclude from all calcs
    const score = SCORE_MAP[normalizeAnswer(answer)] ?? null;
    if (score === null) continue; // skip unanswered
    const weight = weights[controlId] ?? 1;
    controlScores[controlId] = score;
    numerator += score * weight;
    denominator += weight;
  }
  const finalScore = denominator > 0 ? (numerator / denominator) : null;
  return { finalScore, controlScores };
}

// 5. MAIN EVALUATION FUNCTION
/**
 * Evaluate ISO/IEC 27001 compliance with gateway logic and scoring.
 * @param {Object} answers - { [controlId]: { answer: 'YES'|'NO'|'PARTIAL'|... } }
 * @param {Object} weights - { [controlId]: number } (optional)
 * @returns {Object} { finalScore, controlScores, excludedControls, implicitFailures }
 */
export function evaluateCompliance(answers, weights = {}) {
  // 1. Apply gateway logic
  const { patchedAnswers, excludedControls, implicitFailures } = applyGatewayLogic(answers);
  // 2. Calculate scores
  const { finalScore, controlScores } = calculateScores(patchedAnswers, weights);
  return {
    finalScore,
    controlScores,
    excludedControls: Array.from(excludedControls),
    implicitFailures: Array.from(implicitFailures),
  };
}
