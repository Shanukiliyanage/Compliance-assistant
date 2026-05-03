// Frontend scoring helpers.
// The backend is authoritative, but the UI expects a normalized “summary” shape.

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function priorityToScore(priority) {
  // Some UIs render priority as a number with toFixed(2).
  // Normalize common string priorities into a stable numeric score.
  const p = String(priority || "").trim().toUpperCase();
  if (p === "HIGH") return 1;
  if (p === "MEDIUM") return 0.5;
  if (p === "LOW") return 0.25;
  return toNumber(priority, 0);
}

function complianceStateToPriorityScore(complianceState) {
  const cs = String(complianceState || "").trim().toUpperCase();
  if (cs === "NOT_COMPLIANT") return 1;
  if (cs === "PARTIALLY_COMPLIANT") return 0.5;
  return 0;
}

function normalizeRecommendations(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((rec) => {
      const id = rec?.id || rec?.controlId || rec?.questionId || rec?.title || "";
      const priority =
        rec?.priority != null
          ? priorityToScore(rec.priority)
          : rec?.severity
            ? priorityToScore(rec.severity)
            : complianceStateToPriorityScore(rec?.complianceState);

      return {
        ...rec,
        id,
        priority,
      };
    })
    .filter((r) => String(r.id || "").trim().length > 0);
}

// Normalizes various backend result shapes into a single UI-friendly summary.
export function extractComplianceSummary(backendResult) {
  if (!backendResult) return null;

  // Legacy/alternate shape: backendResult.complianceResults
  const legacy = backendResult.complianceResults;
  if (legacy && typeof legacy === "object") {
    const pie = legacy.piePercentages || legacy.piePercent || null;
    return {
      weightedScore: toNumber(legacy.weightedScore, 0),
      compliance: legacy.compliance ?? null,
      distribution: legacy.distribution ?? null,
      piePercentages: pie
        ? {
            YES: toNumber(pie.YES ?? pie.yes, 0),
            PARTIAL: toNumber(pie.PARTIAL ?? pie.partial, 0),
            NO: toNumber(pie.NO ?? pie.no, 0),
            NA: toNumber(pie.NA ?? pie.na, 0),
          }
        : null,
      counts: legacy.counts ?? null,
      sector: legacy.sector ?? backendResult?.smeProfile?.sector ?? null,
      recommendations: normalizeRecommendations(legacy.recommendations || backendResult.recommendations),
      numerator: legacy.numerator ?? null,
      denominator: legacy.denominator ?? null,
      applicableControls: legacy.applicableControls ?? null,
      totalControls: legacy.totalControls ?? null,
      timestamp: legacy.timestamp ?? backendResult.timestamp ?? null,
    };
  }

  // Current backend shape used by this repo: { scores, recommendations, smeProfile, timestamp }
  const scores = backendResult.scores || {};
  const breakdownPercent = scores?.complianceBreakdown?.percent || {};
  const breakdownCounts = scores?.complianceBreakdown?.counts || null;

  const piePercentages = {
    YES: toNumber(breakdownPercent.fullyCompliant, 0),
    PARTIAL: toNumber(breakdownPercent.partiallyCompliant, 0),
    NO: toNumber(breakdownPercent.nonCompliant, 0),
    // N/A is tracked per-stage in newer builds; overall may be absent.
    NA: toNumber(breakdownPercent.notApplicable, 0),
  };

  return {
    weightedScore: toNumber(scores?.overall?.percent, 0),
    compliance: null,
    distribution: null,
    piePercentages,
    counts: breakdownCounts,
    sector: backendResult?.smeProfile?.sector ?? null,
    recommendations: normalizeRecommendations(backendResult.recommendations),
    numerator: null,
    denominator: null,
    applicableControls: breakdownCounts?.total ?? null,
    totalControls: breakdownCounts?.total ?? null,
    timestamp: backendResult.timestamp ?? null,
  };
}
