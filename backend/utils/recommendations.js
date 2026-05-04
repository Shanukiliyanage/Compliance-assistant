import { 
  getRecommendationForControl, 
  aliasMandatoryQuestionId,
  canonicalizeRuleKey
} from "../rules/recommendationRules.js";

// Helper to determine compliance state from a single answer value.
function getComplianceState(value) {
  const v = String(value || "").toLowerCase().trim();
  if (v === "yes" || v === "fully") return "FULLY_COMPLIANT";
  if (v === "partial" || v === "partially") return "PARTIALLY_COMPLIANT";
  if (v === "no" || v === "not") return "NOT_COMPLIANT";
  return "NOT_APPLICABLE";
}

// Determines the overall compliance state for a control based on its question answers.
function getControlComplianceState(answers) {
  if (!Array.isArray(answers) || answers.length === 0) return "NOT_APPLICABLE";
  
  const states = answers.map(getComplianceState);
  if (states.every(s => s === "FULLY_COMPLIANT")) return "FULLY_COMPLIANT";
  if (states.some(s => s === "NOT_COMPLIANT")) return "NOT_COMPLIANT";
  if (states.some(s => s === "PARTIALLY_COMPLIANT")) return "PARTIALLY_COMPLIANT";
  return "FULLY_COMPLIANT"; // Default to fully if all are N/A or similar (shouldn't happen with filtering)
}

function getPriorityFromComplianceState(state) {
  switch (state) {
    case "NOT_COMPLIANT": return "HIGH";
    case "PARTIALLY_COMPLIANT": return "MEDIUM";
    case "FULLY_COMPLIANT": return "LOW";
    default: return "NONE";
  }
}

function shouldIgnoreAnswerKey(key) {
  return /_comment$/i.test(key) || /_evidence$/i.test(key) || key === "timestamp" || key === "userId";
}

function isSuppressedByStage2Gates(key, stageAnswers) {
  // ISO 27001 Annex A gateway logic: if a main control is "No", its sub-controls are suppressed.
  if (key.startsWith("A.5.19") && key !== "A.5.19_Gateway" && stageAnswers["A.5.19_Gateway"] === "no") return true;
  if (key.startsWith("A.5.21") && key !== "A.5.21_Gateway" && stageAnswers["A.5.21_Gateway"] === "no") return true;
  if (key.startsWith("A.5.23") && key !== "A.5.23_Gateway" && stageAnswers["A.5.23_Gateway"] === "no") return true;
  return false;
}

function isSuppressedByStage5Gates(key, stageAnswers) {
  // Technological controls gateway logic.
  if (key.startsWith("A.8.11") && key !== "A.8.11_Gateway" && stageAnswers["A.8.11_Gateway"] === "no") return true;
  if (key.startsWith("A.8.12") && key !== "A.8.12_Gateway" && stageAnswers["A.8.12_Gateway"] === "no") return true;
  if (key.startsWith("A.8.16") && key !== "A.8.16_Gateway" && stageAnswers["A.8.16_Gateway"] === "no") return true;
  return false;
}

function getNotApplicableControlIds(stageId, stageAnswers) {
  const na = new Set();
  for (const [key, value] of Object.entries(stageAnswers || {})) {
    if (getComplianceState(value) === "NOT_APPLICABLE") {
      na.add(normalizeControlId(key));
    }
  }
  return na;
}

function normalizeControlId(key) {
  const k = String(key || "").trim();
  // Convert question ids into control ids (example: "A5.24.Q2" -> "A.5.24").

  const stripped = k
    .replace(/[-_.]Q\d+$/i, "")
    .replace(/[._-]GW\d+$/i, "");

  // Make IDs consistent for rule lookups.
  const m2 = /^A(\d+)\.(\d+)$/.exec(stripped);
  if (m2) return `A.${Number(m2[1])}.${Number(m2[2])}`;

  const m3 = /^A(\d+)\.(\d+)\.(\d+)$/.exec(stripped);
  if (m3) return `A.${Number(m3[1])}.${Number(m3[2])}.${Number(m3[3])}`;

  return stripped;
}

function normalizeForStage(stageId, key) {
  if (stageId === "stage1") {
    // Stage 1 needs per-question recommendations.
    // Keys can be either clause-based ("6.1", "6.2") OR question-based ("6.1.Q1", "6.1.Q2").
    // If a .Qn suffix exists, keep it so Q1/Q2 don't collapse into one id.
    return String(key || "").trim();
  }

  return normalizeControlId(key);
}

function groupStageAnswers(stageId, stageAnswers) {
  // Groups answers for one stage into { controlId: [answers...] }.
  const grouped = {};

  // Stage 1 aliasing (compat fix)
  const stage1Aliases =
    stageId === "stage1" && stageAnswers && typeof stageAnswers === "object"
      ? {
          "6.1.Q1": Object.prototype.hasOwnProperty.call(stageAnswers, "6.1.Q2")
            ? null
            : "6.1.Q2",
        }
      : null;

  for (const [key, value] of Object.entries(stageAnswers || {})) {
    // Skip blank answers.
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    if (shouldIgnoreAnswerKey(key)) continue;
    if (isSuppressedByStage2Gates(key, stageAnswers)) continue;
    if (stageId === "stage5" && isSuppressedByStage5Gates(key, stageAnswers)) continue;
    const aliasedKey = stage1Aliases?.[key] || key;
    if (aliasedKey == null) continue;

    const controlId = normalizeForStage(stageId, aliasedKey);
    if (!grouped[controlId]) grouped[controlId] = [];
    grouped[controlId].push(value);
  }
  return grouped;
}

export function generateRecommendations(answers, options = {}) {
  // Builds the recommendations list used in report/UI.
  const recommendations = [];
  const orgName =
    typeof options?.orgName === "string" && options.orgName.trim()
      ? options.orgName.trim()
      : "The organization";

  Object.entries(answers || {}).forEach(([stageId, stageAnswers]) => {
    const stage = stageAnswers || {};
    const notApplicableControlIds = getNotApplicableControlIds(stageId, stage);
    const controlsWithQuestionRecs = new Set();

    // 1) Specific question-level recommendations.
    for (const [questionId, answerValue] of Object.entries(stage)) {
      if (shouldIgnoreAnswerKey(questionId)) continue;
      if (notApplicableControlIds.has(normalizeControlId(questionId))) continue;
      if (isSuppressedByStage2Gates(questionId, stage)) continue;
      if (stageId === "stage5" && isSuppressedByStage5Gates(questionId, stage)) continue;

      const complianceState = getComplianceState(answerValue);
      if (complianceState === "FULLY_COMPLIANT") continue;
      if (complianceState === "NOT_APPLICABLE") continue;

      const recommendation = getRecommendationForControl(questionId, complianceState, orgName);
      if (recommendation) {
        const controlId = normalizeForStage(stageId, questionId);
        controlsWithQuestionRecs.add(controlId);

        const priority = getPriorityFromComplianceState(complianceState);
        recommendations.push({
          stageId,
          controlId: controlId,
          questionId: questionId,
          complianceState,
          priority,
          recommendation,
        });
      }
    }

    // 2) Fallback: one aggregated recommendation per control where no question-level rules exist.
    const grouped = groupStageAnswers(stageId, stage);
    Object.entries(grouped).forEach(([controlId, questionAnswers]) => {
      if (controlsWithQuestionRecs.has(controlId)) return;
      if (notApplicableControlIds.has(controlId)) return;

      const complianceState = getControlComplianceState(questionAnswers);
      if (complianceState === "FULLY_COMPLIANT") return;

      const recommendation = getRecommendationForControl(controlId, complianceState, orgName);
      if (recommendation) {
        const priority = getPriorityFromComplianceState(complianceState);
        recommendations.push({
          stageId,
          controlId,
          complianceState,
          priority,
          recommendation,
        });
      }
    });
  });

  return recommendations;
}

export function buildControlStatusSummary(answers, options = {}) {
  // What: Build a full “status list” for the report.
  const orgName =
    typeof options?.orgName === "string" && options.orgName.trim()
      ? options.orgName.trim()
      : "The organization";

  const controls = [];

  Object.entries(answers || {}).forEach(([stageId, stageAnswers]) => {
    const notApplicableControlIds = getNotApplicableControlIds(stageId, stageAnswers);
    const grouped = groupStageAnswers(stageId, stageAnswers);
    const stage1ClauseAnswers = {}; // Map of CL4_CONTEXT -> [answers...]

    Object.entries(grouped).forEach(([controlId, questionAnswers]) => {
      if (notApplicableControlIds.has(controlId)) return;
      const complianceState = getControlComplianceState(questionAnswers);
      const priority = getPriorityFromComplianceState(complianceState);
      const recommendation = getRecommendationForControl(controlId, complianceState, orgName);

      controls.push({
        stageId,
        controlId,
        complianceState,
        priority,
        recommendation: recommendation || null,
      });

      // Track Stage 1 clause groups
      if (stageId === "stage1") {
        const m = /^(\d+)\./.exec(controlId);
        if (m) {
          const clauseNum = m[1];
          const groupMap = {
            "4": "CL4_CONTEXT", "5": "CL5_LEADERSHIP", "6": "CL6_PLANNING", "7": "CL7_SUPPORT",
            "8": "CL8_OPERATION", "9": "CL9_EVALUATION", "10": "CL10_IMPROVEMENT"
          };
          const groupId = groupMap[clauseNum];
          if (groupId) {
            if (!stage1ClauseAnswers[groupId]) stage1ClauseAnswers[groupId] = [];
            stage1ClauseAnswers[groupId].push(...questionAnswers);
          }
        }
      }
    });

    // Add explicit group-level statuses for Stage 1.
    Object.entries(stage1ClauseAnswers).forEach(([groupId, answersList]) => {
      const complianceState = getControlComplianceState(answersList);
      controls.push({
        stageId: "stage1",
        controlId: groupId,
        complianceState,
        priority: getPriorityFromComplianceState(complianceState),
        recommendation: null
      });
    });

    // Add explicit NOT_APPLICABLE controls.
    notApplicableControlIds.forEach(id => {
      if (!controls.find(c => c.stageId === stageId && c.controlId === id)) {
        controls.push({
          stageId,
          controlId: id,
          complianceState: "NOT_APPLICABLE",
          priority: "NONE",
          recommendation: null,
        });
      }
    });
  });

  return controls;
}

export function buildAnswersForExport(answers) {
  // Returns a flat list of { id, value, label } for the report.
  const list = [];
  Object.entries(answers || {}).forEach(([stageId, stage]) => {
    Object.entries(stage || {}).forEach(([qid, val]) => {
      if (shouldIgnoreAnswerKey(qid)) return;
      list.push({
        stageId,
        id: qid,
        value: val,
        label: getComplianceState(val).replace("_", " "),
      });
    });
  });
  return list;
}
