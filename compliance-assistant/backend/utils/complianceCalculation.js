
import { getControlWeight } from "../rules/sectorWeights.js";

/**
 * Map status to score (thesis model)
 * Yes → 1.0, Partial → 0.5, No/Implicit NO → 0.0
 */
function statusToScore(status, isImplicitNo) {
  if (isImplicitNo) return 0.0;
  const v = String(status || "").toUpperCase();
  if (v === "YES") return 1.0;
  if (v === "PARTIAL") return 0.5;
  if (v === "NO") return 0.0;
  return null;
}

/**
 * Calculate compliance results per thesis model
 * @param {Array} controls - Array of control objects (with subQuestions if any)
 * @param {string} sector - Sector key for weighting
 * @returns {Object} Results object
 */
export function calculateComplianceResults(controls, sector) {
  let numerator = 0;
  let denominator = 0;
  let counts = { YES: 0, PARTIAL: 0, NO: 0, NA: 0 };
  let distCounts = { YES: 0, PARTIAL: 0, NO: 0, NA: 0 };
  const totalControls = controls.length;
  let applicableControls = 0;
  const recommendationScores = [];

  for (const ctrl of controls) {
    // Sub-question logic: average only visible sub-questions
    let score = null;
    let isNA = !ctrl.isApplicable;
    let isImplicitNo = !!ctrl.isImplicitNo;
    let weight = getControlWeight(ctrl.id, sector);

    if (Array.isArray(ctrl.subQuestions) && ctrl.subQuestions.length > 0) {
      // Only include visible sub-questions (not hidden/NA)
      const visibleSubs = ctrl.subQuestions.filter(q => q.isVisible !== false && !q.isNA);
      if (visibleSubs.length > 0) {
        const subScores = visibleSubs.map(q => statusToScore(q.status, !!q.isImplicitNo)).filter(s => s !== null);
        if (subScores.length > 0) {
          score = subScores.reduce((a, b) => a + b, 0) / subScores.length;
        }
      }
      // If all sub-questions are NA, treat control as NA
      if (!score && visibleSubs.length === 0) isNA = true;
    } else {
      score = statusToScore(ctrl.status, isImplicitNo);
    }

    if (isNA) {
      distCounts.NA++;
      counts.NA++;
      continue;
    }
    applicableControls++;
    if (isImplicitNo) {
      distCounts.NO++;
      counts.NO++;
      numerator += 0 * weight;
      denominator += weight;
      recommendationScores.push({ id: ctrl.id, weight, controlScore: 0 });
      continue;
    }
    if (score === 1.0) {
      distCounts.YES++;
      counts.YES++;
    } else if (score === 0.5) {
      distCounts.PARTIAL++;
      counts.PARTIAL++;
    } else {
      distCounts.NO++;
      counts.NO++;
    }
    numerator += (score ?? 0) * weight;
    denominator += weight;
    recommendationScores.push({ id: ctrl.id, weight, controlScore: score ?? 0 });
  }

  // Weighted score (internal only)
  const weightedScore = denominator > 0 ? (numerator / denominator) * 100 : 0;

  // Section-level compliance (user-facing)
  // Compliance = ((Y + 0.5 * P) / (Y + P + N)) * 100
  const sectionDenom = distCounts.YES + distCounts.PARTIAL + distCounts.NO;
  const compliance = sectionDenom > 0
    ? ((distCounts.YES + 0.5 * distCounts.PARTIAL) / sectionDenom) * 100
    : 0;

  // Distribution calculation
  const T = applicableControls;
  const distribution = {
    YES: T > 0 ? (distCounts.YES / T) * 100 : 0,
    PARTIAL: T > 0 ? (distCounts.PARTIAL / T) * 100 : 0,
    NO: T > 0 ? (distCounts.NO / T) * 100 : 0,
    NA: totalControls > 0 ? (distCounts.NA / totalControls) * 100 : 0,
  };

  // Pie chart calculation (for UI/visualization)
  // YES%, PARTIAL%, NO%: denominator = applicable controls (T)
  // NA%: denominator = total controls
  const piePercentages = {
    YES: T > 0 ? (distCounts.YES / T) * 100 : 0,
    PARTIAL: T > 0 ? (distCounts.PARTIAL / T) * 100 : 0,
    NO: T > 0 ? (distCounts.NO / T) * 100 : 0,
    NA: totalControls > 0 ? (distCounts.NA / totalControls) * 100 : 0,
  };

  // Recommendation ranking: weight × (1 - controlScore)
  const recommendations = recommendationScores
    .map(r => ({ ...r, priority: r.weight * (1 - (r.controlScore ?? 0)) }))
    .sort((a, b) => b.priority - a.priority);

  return {
    weightedScore, // internal only
    compliance,    // user-facing
    distribution,
    piePercentages, // for pie chart UI
    counts,
    sector,
    recommendations, // sorted by priority
    numerator,
    denominator,
    applicableControls,
    totalControls,
    timestamp: new Date().toISOString(),
  };
}
