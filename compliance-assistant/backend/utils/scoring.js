// Scoring utilities.
// Normalizes answers, applies applicability rules, and computes stage + overall scores.
import { SCORE_RULES } from "../rules/scoreRules.js";
import { getControlComplianceState } from "../rules/complianceRules.js";
import { getMaturityLevelFromAverage } from "../rules/maturityRules.js";
import { getNotApplicableControlIds } from "./applicability.js";

// How many Annex A controls exist per stage (ISO 27001:2022).
// Used so missing/hidden controls count as NOT COMPLIANT.
const ANNEXA_TOTALS_BY_STAGE = {
  stage2: 37,
  stage3: 8,
  stage4: 14,
  stage5: 34,
};

// Returns the official control count for a stage.
function getExpectedScoredItemCount(stageId) {
  return ANNEXA_TOTALS_BY_STAGE[stageId] ?? null;
}

// True if the key is a gateway/applicability question (not a scored control).
function shouldIgnoreAnswerKey(key) {
  const k = String(key || "").trim();

  // Ignore "gateway" questions that only decide if later questions apply.
  if (/[._-]GW\d+$/i.test(k)) return true;

  // Another gateway naming style used in the frontend.
  if (/_gateway/i.test(k)) return true;

  // Stage 5 SDLC gateway: applicability only (not a scored control).
  if (/^SDLC_GATE_Q1$/i.test(k)) return true;

  // Cloud applicability question: also a gate, not a scored control.
  if (/^A5\.23\.Q1$/i.test(k)) return true;

  return false;
}

function isYesAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "yes";
}

// True if the answer must be ignored because a related gateway is "no".
function isSuppressedByStage2Gates(key, stageAnswers) {
  const k = String(key || "").trim();
  const stage = stageAnswers || {};

  // If a gateway is "no", ignore answers for questions that were hidden.
  if (/^A5\.(19|20|21|22)\./i.test(k)) {
    return !isYesAnswer(stage["A5.19.GW1"]);
  }

  // Only score cloud risk management if cloud use was "yes".
  if (/^A5\.23\.Q2$/i.test(k)) {
    return !isYesAnswer(stage["A5.23.Q1"]);
  }

  // Only score incident follow-up if incident intro was "yes".
  if (/^A5\.(25|26|27|28)\./i.test(k)) {
    return !isYesAnswer(stage["A5.24.Q1"]);
  }

  // Stage 5: secure development controls only apply if SDLC gateway is "yes".
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

function groupStageAnswersByControl(stageId, stageAnswers) {
  // Groups answers for one stage into { controlId: [answers...] }.
  const grouped = {};
  for (const [key, value] of Object.entries(stageAnswers || {})) {
    // Skip blank answers (we don't want to treat "not answered" as a real score).
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    if (shouldIgnoreAnswerKey(key)) continue;
    if (isSuppressedByStage2Gates(key, stageAnswers)) continue;

    // Stage 1 is clauses 4–10 (not Annex A).
    // Group by clause number so both questions in a clause (e.g. "4.2" and "4.3")
    // are averaged into one clause score — giving each clause equal weight.
    const controlId = stageId === "stage1"
      ? String(key || "").trim().split(".")[0]  // "4.2" -> "4", "4.3" -> "4"
      : normalizeControlId(key);
    if (!grouped[controlId]) grouped[controlId] = [];
    grouped[controlId].push(value);
  }
  return grouped;
}

function getStageAnswers(stageId, answers) {
  if (!answers) return {};

  // Input shape (current): { stage1: {...}, stage2: {...}, ... }
  if (!Array.isArray(answers) && typeof answers === "object") {
    const stageAnswers = answers[stageId];
    return stageAnswers && typeof stageAnswers === "object" ? stageAnswers : {};
  }

  // Older shape: [{ stageId, questionId/controlId, answer }, ...]
  if (Array.isArray(answers)) {
    const stageAnswers = {};
    for (const item of answers) {
      if (!item || item.stageId !== stageId) continue;
      const key = item.questionId || item.controlId || item.id;
      if (!key) continue;
      stageAnswers[key] = item.answer ?? item.value;
    }
    return stageAnswers;
  }

  return {};
}

function buildBreakdown(groupedStageAnswers) {
  // Counts YES / PARTIAL / NO / UNANSWERED for UI charts and summary.
  const counts = { yes: 0, partial: 0, no: 0, unanswered: 0, total: 0 };

  for (const questionAnswers of Object.values(groupedStageAnswers || {})) {
    const state = getControlComplianceState(questionAnswers);
    if (state === "FULLY_COMPLIANT") counts.yes += 1;
    else if (state === "PARTIALLY_COMPLIANT") counts.partial += 1;
    else if (state === "NOT_COMPLIANT") counts.no += 1;
    else counts.unanswered += 1;
    counts.total += 1;
  }

  const denom = counts.total || 0;
  const percent = {
    fullyCompliant: denom ? Math.round((counts.yes / denom) * 100) : 0,
    partiallyCompliant: denom ? Math.round((counts.partial / denom) * 100) : 0,
    nonCompliant: denom ? Math.round((counts.no / denom) * 100) : 0,
    unanswered: denom ? Math.round((counts.unanswered / denom) * 100) : 0,
  };

  return { counts, percent };
}

function buildBreakdownWithExpectedTotal(groupedStageAnswers, expectedTotal) {
  const base = buildBreakdown(groupedStageAnswers);
  const expected = Number(expectedTotal);

  if (!Number.isFinite(expected) || expected <= 0) return base;

  const missing = Math.max(0, expected - (base.counts.total || 0));

  // Rule: if we expect N controls but only got M, then (N-M) is counted as NO.
  if (missing > 0) {
    base.counts.no += missing;
    base.counts.total = expected;
  }

  const denom = base.counts.total || 0;
  base.percent = {
    fullyCompliant: denom ? Math.round((base.counts.yes / denom) * 100) : 0,
    partiallyCompliant: denom ? Math.round((base.counts.partial / denom) * 100) : 0,
    nonCompliant: denom ? Math.round((base.counts.no / denom) * 100) : 0,
    unanswered: denom ? Math.round((base.counts.unanswered / denom) * 100) : 0,
  };

  return base;
}
// Scores one stage and returns points + percent + breakdown.
export function calculateStageScore(stageId, answers) {
  const stageAnswers = getStageAnswers(stageId, answers);
  const notApplicableControlIds = getNotApplicableControlIds(stageId, stageAnswers);
  const grouped = groupStageAnswersByControl(stageId, stageAnswers);
  // Remove any controls that are explicitly NOT_APPLICABLE for this stage.
  for (const id of notApplicableControlIds) {
    if (Object.prototype.hasOwnProperty.call(grouped, id)) delete grouped[id];
  }

  const expectedTotalRaw = getExpectedScoredItemCount(stageId);
  const expectedTotal =
    expectedTotalRaw && stageId !== "stage1"
      ? Math.max(0, Number(expectedTotalRaw) - notApplicableControlIds.size)
      : expectedTotalRaw;
  const breakdown = expectedTotal
    ? buildBreakdownWithExpectedTotal(grouped, expectedTotal)
    : buildBreakdown(grouped);

  // Turn compliance state into points.
  let raw = 0;
  for (const questionAnswers of Object.values(grouped)) {
    const state = getControlComplianceState(questionAnswers);
    if (state === "FULLY_COMPLIANT") raw += SCORE_RULES.YES ?? 0;
    else if (state === "PARTIALLY_COMPLIANT") raw += SCORE_RULES.PARTIAL ?? 0;
    else raw += SCORE_RULES.NO ?? 0;
  }

  // Max score = (number of items) * (max points per item).
  const yesWeight = Number(SCORE_RULES.YES ?? 1);
  const maxScore = (expectedTotal ?? Object.keys(grouped).length) * yesWeight;

  const averageScore = maxScore > 0 ? raw / maxScore : 0;
  const percent = Math.round(averageScore * 100);

  // Return a friendly shape for the frontend (plus older aliases).
  return {
    totalScore: raw,
    maxPossibleScore: maxScore,
    averageScore,
    percent,
    breakdown,
    notApplicableCount: notApplicableControlIds.size,
    // Back-compat
    raw,
    max: maxScore,
  };
}

// Combines stage scores into a single overall score and maturity label.
export function calculateOverallScore(stageScores) {
  // Add all points from all stages.
  const totalRaw = Object.values(stageScores).reduce(
    (sum, s) => sum + Number(s?.totalScore ?? s?.raw ?? 0),
    0
  );
  const totalMax = Object.values(stageScores).reduce(
    (sum, s) => sum + Number(s?.maxPossibleScore ?? s?.max ?? 0),
    0
  );
  
  const averageScore = totalMax > 0 ? totalRaw / totalMax : 0;
  const percent = Math.round(averageScore * 100);

  const maturityLevel = getMaturityLevelFromAverage(averageScore);

  return {
    totalScore: totalRaw,
    maxPossibleScore: totalMax,
    averageScore,
    percent,
    maturityLevel,
    // Back-compat
    raw: totalRaw,
    max: totalMax,
  };
}

// Main scoring entry point used by the API.
export function calculateAllScores(answers) {
  const stageScores = {};
  const mandatoryCounts = { yes: 0, partial: 0, no: 0, unanswered: 0, total: 0 };
  const annexACounts = { yes: 0, partial: 0, no: 0, unanswered: 0, total: 0 };

  // Score each stage and accumulate combined breakdowns.
  ["stage1", "stage2", "stage3", "stage4", "stage5"].forEach((stageId) => {
    stageScores[stageId] = calculateStageScore(stageId, answers);

    const stageCounts = stageScores[stageId].breakdown?.counts;
    if (stageCounts) {
      const bucket = stageId === "stage1" ? mandatoryCounts : annexACounts;
      bucket.yes += stageCounts.yes;
      bucket.partial += stageCounts.partial;
      bucket.no += stageCounts.no;
      bucket.unanswered += stageCounts.unanswered;
      bucket.total += stageCounts.total;
    }
  });

  // Two overall numbers are exposed: Stage 1 (clauses) and Stages 2–5 (Annex A).
  const overallMandatory = calculateOverallScore({ stage1: stageScores.stage1 });
  const overallAnnexA = calculateOverallScore({
    stage2: stageScores.stage2,
    stage3: stageScores.stage3,
    stage4: stageScores.stage4,
    stage5: stageScores.stage5,
  });

  const mandatoryDenom = mandatoryCounts.total || 0;
  const complianceBreakdownMandatory = {
    counts: mandatoryCounts,
    percent: {
      fullyCompliant: mandatoryDenom
        ? Math.round((mandatoryCounts.yes / mandatoryDenom) * 100)
        : 0,
      partiallyCompliant: mandatoryDenom
        ? Math.round((mandatoryCounts.partial / mandatoryDenom) * 100)
        : 0,
      nonCompliant: mandatoryDenom
        ? Math.round((mandatoryCounts.no / mandatoryDenom) * 100)
        : 0,
      unanswered: mandatoryDenom
        ? Math.round((mandatoryCounts.unanswered / mandatoryDenom) * 100)
        : 0,
    },
  };

  const annexADenom = annexACounts.total || 0;
  const complianceBreakdownAnnexA = {
    counts: annexACounts,
    percent: {
      fullyCompliant: annexADenom
        ? Math.round((annexACounts.yes / annexADenom) * 100)
        : 0,
      partiallyCompliant: annexADenom
        ? Math.round((annexACounts.partial / annexADenom) * 100)
        : 0,
      nonCompliant: annexADenom
        ? Math.round((annexACounts.no / annexADenom) * 100)
        : 0,
      unanswered: annexADenom
        ? Math.round((annexACounts.unanswered / annexADenom) * 100)
        : 0,
    },
  };

  // Compatibility: older code expects `overall` + `complianceBreakdown`.
  // Here they represent Annex A (Stages 2–5).
  const overall = overallAnnexA;
  const complianceBreakdown = complianceBreakdownAnnexA;

  return {
    stageScores,
    overall,
    complianceBreakdown,
    overallMandatory,
    overallAnnexA,
    complianceBreakdownMandatory,
    complianceBreakdownAnnexA,
  };
}
