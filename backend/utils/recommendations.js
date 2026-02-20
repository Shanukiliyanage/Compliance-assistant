// Recommendation utilities.
// Groups answers by control, derives compliance state, and selects recommendation text.

import { getControlComplianceState } from "../rules/complianceRules.js";
import { getRecommendationForControl } from "../rules/recommendationRules.js";
import { getNotApplicableControlIds } from "./applicability.js";

function getPriorityFromComplianceState(complianceState) {
  // Minimal prioritization rule used by the report/UI.
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

  // Ignore "gateway" questions that only decide if later questions apply.
  if (/[._-]GW\d+$/i.test(k)) return true;

  // Another gateway naming style used in the frontend.
  if (/_gateway/i.test(k)) return true;

  // Cloud applicability question: also a gate, not a scored control.
  if (/^A5\.23\.Q1$/i.test(k)) return true;

  // Stage 5 SDLC gateway: applicability only (not a scored control).
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

  // If a gateway is "no", ignore answers for questions that were hidden.
  if (/^A5\.(19|20|21|22)\./i.test(k)) {
    return !isYesAnswer(stage["A5.19.GW1"]);
  }

  // Only consider cloud risk management if cloud use was "yes".
  if (/^A5\.23\.Q2$/i.test(k)) {
    return !isYesAnswer(stage["A5.23.Q1"]);
  }

  // Only consider incident follow-up if incident intro was "yes".
  if (/^A5\.(25|26|27|28)\./i.test(k)) {
    return !isYesAnswer(stage["A5.24.Q1"]);
  }

  return false;
}

function isSuppressedByStage5Gates(key, stageAnswers) {
  const k = String(key || "").trim();
  const stage = stageAnswers || {};

  // Network security follow-up controls apply only if networking is in scope.
  if (/^A8\.(21|22)[._-]/i.test(k)) {
    return !isYesAnswer(stage["A8.20_Q1"]);
  }

  // Secure development controls apply only if SDLC/software development is in scope.
  if (/^A8\.(25|26|27|28|29|31|33)[._-]/i.test(k)) {
    return !isYesAnswer(stage["SDLC_GATE_Q1"]);
  }

  return false;
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

  // Stage 1 aliasing (compat fix): some builds stored the “risk treatment decisions mapped
  // to controls/actions” question under 6.1.Q1, but the rule text is defined under 6.1.Q2.
  // If Q2 is not present, treat Q1 as Q2.
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
  // Output supports question-level recommendations when they exist.
  // If a question-specific recommendation rule is missing, we fall back to a single aggregated
  // control-level recommendation (avoids duplicates).
  const recommendations = [];
  const orgName =
    typeof options?.orgName === "string" && options.orgName.trim()
      ? options.orgName.trim()
      : "The organization";

  Object.entries(answers || {}).forEach(([stageId, stageAnswers]) => {
    const stage = stageAnswers || {};
    const notApplicableControlIds = getNotApplicableControlIds(stageId, stage);

    // 1) Collect question-level recommendations where explicit question rules exist.
    // Track controls that already have question-level recs so we can skip the control-level fallback.
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

    // 2) Fallback: one aggregated recommendation per control where no question-level rules exist.
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
  // What: Build a full “status list” for the report.
  // Difference vs generateRecommendations: includes controls even if recommendation is empty.
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

    // Add explicit NOT_APPLICABLE controls so reports can show them as N/A.
    for (const controlId of notApplicableControlIds) {
      // Avoid duplicates if a control was somehow answered.
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

  // Sort output so the report looks consistent.
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
  // Minimal safe implementation to unblock server start.
  // Adjust mapping later to match your assessment schema / export format.
  if (!assessment) return [];

  // Common patterns:
  if (Array.isArray(assessment.answers)) return assessment.answers;
  if (Array.isArray(assessment.responses)) return assessment.responses;

  // If answers are nested in sections/questions, keep it non-crashing for now.
  return [];
}
