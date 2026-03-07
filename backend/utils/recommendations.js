// groups answers by control, works out compliance state, picks the right recommendation text

import { getControlComplianceState } from "../rules/complianceRules.js";
import { getRecommendationForControl } from "../rules/recommendationRules.js";
import { getNotApplicableControlIds } from "./applicability.js";

function getPriorityFromComplianceState(complianceState) {
  // basic priority rule for the report/UI
  const cs = String(complianceState || "").toUpperCase();
  if (cs === "NOT_COMPLIANT") return "HIGH";
  if (cs === "PARTIALLY_COMPLIANT") return "MEDIUM";
  return "NONE";
}

function mapAnswerToComplianceState(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "yes") return "FULLY_COMPLIANT";
  if (v === "no") return "NOT_COMPLIANT";
  if (v === "partial" || v === "partially") return "PARTIALLY_COMPLIANT";
  if (v === "not applicable" || v === "n/a" || v === "na") return "NOT_APPLICABLE";
  return "";
}

function shouldIgnoreAnswerKey(key) {
  const k = String(key || "").trim();

  // skip gateway questions - they're not scored
  if (/[._-]GW\d+$/i.test(k)) return true;

  // another gateway id format
  if (/_gateway/i.test(k)) return true;

  // cloud gateway - not scored
  if (/^A5\.23\.Q1$/i.test(k)) return true;

  // SDLC gateway - not scored
  if (/^SDLC_GATE_Q1$/i.test(k)) return true;

  return false;
}

function isYesAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "yes";
}

function isSuppressedByStage2Gates(key, stageAnswers) {
  const k = String(key || "").trim();
  const stage = stageAnswers || {};

  // if gateway is no, skip the answers for hidden questions
  if (/^A5\.(19|20|21|22)\./i.test(k)) {
    return !isYesAnswer(stage["A5.19.GW1"]);
  }

  // only consider cloud risk management if cloud use was yes
  if (/^A5\.23\.Q2$/i.test(k)) {
    return !isYesAnswer(stage["A5.23.Q1"]);
  }

  // only consider incident follow-up if incident intro was yes
  if (/^A5\.(25|26|27|28)\./i.test(k)) {
    return !isYesAnswer(stage["A5.24.Q1"]);
  }

  return false;
}

function isSuppressedByStage5Gates(key, stageAnswers) {
  const k = String(key || "").trim();
  const stage = stageAnswers || {};

  // network security follow-ups are N/A if networking isn't in scope
  if (/^A8\.(21|22)[._-]/i.test(k)) {
    return !isYesAnswer(stage["A8.20_Q1"]);
  }

  // SDLC controls are N/A if there's no software development
  if (/^A8\.(25|26|27|28|29|31|33)[._-]/i.test(k)) {
    return !isYesAnswer(stage["SDLC_GATE_Q1"]);
  }

  return false;
}

function normalizeControlId(key) {
  const k = String(key || "").trim();
  // strip question suffix to get the control id (e.g. "A5.24.Q2" -> "A.5.24")

  const stripped = k
    .replace(/[-_.]Q\d+$/i, "")
    .replace(/[._-]GW\d+$/i, "");

  // normalize id format for rule lookups
  const m2 = /^A(\d+)\.(\d+)$/.exec(stripped);
  if (m2) return `A.${Number(m2[1])}.${Number(m2[2])}`;

  const m3 = /^A(\d+)\.(\d+)\.(\d+)$/.exec(stripped);
  if (m3) return `A.${Number(m3[1])}.${Number(m3[2])}.${Number(m3[3])}`;

  return stripped;
}

function normalizeForStage(stageId, key) {
  if (stageId === "stage1") {
    // stage 1 keeps per-question keys - if there's a .Qn suffix, don't strip it
    return String(key || "").trim();
  }

  return normalizeControlId(key);
}

function groupStageAnswers(stageId, stageAnswers) {
  // group stage answers into { controlId: [answers...] }
  const grouped = {};

  // stage 1 compat: some builds saved 6.1.Q1 instead of 6.1.Q2 - treat Q1 as Q2 if Q2 is missing
  const stage1Aliases =
    stageId === "stage1" && stageAnswers && typeof stageAnswers === "object"
      ? {
          "6.1.Q1": Object.prototype.hasOwnProperty.call(stageAnswers, "6.1.Q2")
            ? null
            : "6.1.Q2",
        }
      : null;

  for (const [key, value] of Object.entries(stageAnswers || {})) {
    // skip blank answers
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
  // builds the recommendations list for the report/UI
  // tries question-level rules first; falls back to one aggregated rec per control to avoid duplicates
  const recommendations = [];
  const orgName =
    typeof options?.orgName === "string" && options.orgName.trim()
      ? options.orgName.trim()
      : "The organization";

  Object.entries(answers || {}).forEach(([stageId, stageAnswers]) => {
    const stage = stageAnswers || {};
    const notApplicableControlIds = getNotApplicableControlIds(stageId, stage);

    // 1) question-level recs where explicit rules exist
    // track which controls already have a question-level rec to skip the control-level fallback
    const controlsWithQuestionRecs = new Set();

    for (const [questionIdRaw, answerValue] of Object.entries(stage)) {
      const questionId = String(questionIdRaw || "").trim();
      if (!questionId) continue;
      if (answerValue == null) continue;
      if (typeof answerValue === "string" && answerValue.trim() === "") continue;

      if (shouldIgnoreAnswerKey(questionId)) continue;
      if (isSuppressedByStage2Gates(questionId, stage)) continue;
      if (stageId === "stage5" && isSuppressedByStage5Gates(questionId, stage)) continue;

      const complianceState = mapAnswerToComplianceState(answerValue);
      if (!complianceState || complianceState === "NOT_APPLICABLE") continue;

      // For Annex A stages, normalize question IDs to the canonical controlId used by rules and N/A.
      const controlId = normalizeForStage(stageId, questionId);
      if (stageId !== "stage1" && notApplicableControlIds.has(controlId)) continue;

      // Only emit a question-level recommendation when an explicit rule exists.
      const recommendation = getRecommendationForControl(questionId, complianceState, orgName);

      const priority = getPriorityFromComplianceState(complianceState);
      if (recommendation) {
        controlsWithQuestionRecs.add(controlId);
        recommendations.push({
          stageId,
          controlId,
          questionId,
          complianceState,
          priority,
          recommendation,
        });
      }
    }

    // 2) fallback: one aggregated rec per control where no question-level rules exist
    const grouped = groupStageAnswers(stageId, stage);
    Object.entries(grouped).forEach(([controlId, questionAnswers]) => {
      if (notApplicableControlIds.has(controlId)) return;
      if (controlsWithQuestionRecs.has(controlId)) return;

      const complianceState = getControlComplianceState(questionAnswers);
      const priority = getPriorityFromComplianceState(complianceState);
      const recommendation = getRecommendationForControl(controlId, complianceState, orgName);

      if (recommendation) {
        recommendations.push({
          controlId,
          stageId,
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
  // full status list for the report - includes controls even if there's no recommendation
  const orgName =
    typeof options?.orgName === "string" && options.orgName.trim()
      ? options.orgName.trim()
      : "The organization";

  const controls = [];

  Object.entries(answers || {}).forEach(([stageId, stageAnswers]) => {
    const notApplicableControlIds = getNotApplicableControlIds(stageId, stageAnswers);
    const grouped = groupStageAnswers(stageId, stageAnswers);

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
    });

    // also add explicit N/A controls so reports can show them
    for (const controlId of notApplicableControlIds) {
      // skip if already in the list
      if (controls.some((c) => c.stageId === stageId && c.controlId === controlId)) continue;
      controls.push({
        stageId,
        controlId,
        complianceState: "NOT_APPLICABLE",
        priority: "NONE",
        recommendation: null,
      });
    }
  });

  // sort so the report output is consistent
  const stageRank = { stage1: 1, stage2: 2, stage3: 3, stage4: 4, stage5: 5 };
  controls.sort((a, b) => {
    const ar = stageRank[a.stageId] ?? 999;
    const br = stageRank[b.stageId] ?? 999;
    if (ar !== br) return ar - br;
    return String(a.controlId).localeCompare(String(b.controlId));
  });

  return controls;
}

// Named export expected by routes/assessment.routes.js
export function buildAnswersForExport(assessment) {
  // Return answers in a shape suitable for report/export.
  // Current assessment schema stores answers as an object keyed by stage:
  // { stage1: {...}, stage2: {...}, stage3: {...}, stage4: {...}, stage5: {...} }
  // Older/legacy schemas may store answers as an array of response items.
  if (!assessment) return {};

  // If caller passed the answers object directly, keep it as-is.
  // (This is the current usage from routes/assessment.routes.js)
  if (!Array.isArray(assessment) && typeof assessment === "object") {
    const hasStageKeys =
      Object.prototype.hasOwnProperty.call(assessment, "stage1") ||
      Object.prototype.hasOwnProperty.call(assessment, "stage2") ||
      Object.prototype.hasOwnProperty.call(assessment, "stage3") ||
      Object.prototype.hasOwnProperty.call(assessment, "stage4") ||
      Object.prototype.hasOwnProperty.call(assessment, "stage5");

    if (hasStageKeys) return assessment;
  }

  // If caller passed a whole assessment object, unwrap common fields.
  if (assessment && typeof assessment === "object") {
    if (assessment.answers && typeof assessment.answers === "object") return assessment.answers;
    if (assessment.responses && typeof assessment.responses === "object") return assessment.responses;
  }

  // Legacy array shape.
  if (Array.isArray(assessment)) return assessment;
  if (Array.isArray(assessment?.answers)) return assessment.answers;
  if (Array.isArray(assessment?.responses)) return assessment.responses;

  return {};
}
