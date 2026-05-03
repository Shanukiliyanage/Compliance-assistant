import { calculateScores } from "./scoringEngine.js";
import { generateRecommendations } from "./recommendationEngine.js";

/**
 * Summary Engine
 * Generates the full report payload for the dashboard.
 */
export function getFullSummary(answers, smeProfile = {}) {
  const scoring = calculateScores(answers, smeProfile);
  const recommendations = generateRecommendations(scoring.details, smeProfile.sector);

  const charts = {
    annexA: {
      yes: scoring.summary.stage2.yes + scoring.summary.stage3.yes + scoring.summary.stage4.yes + scoring.summary.stage5.yes,
      partial: scoring.summary.stage2.partial + scoring.summary.stage3.partial + scoring.summary.stage4.partial + scoring.summary.stage5.partial,
      no: scoring.summary.stage2.no + scoring.summary.stage3.no + scoring.summary.stage4.no + scoring.summary.stage5.no,
      na: scoring.summary.stage2.na + scoring.summary.stage3.na + scoring.summary.stage4.na + scoring.summary.stage5.na,
      total: 93
    },
    questionBreakdown: {
        mandatory: scoring.questionSummary.stage1,
        annexA: scoring.questionSummary.annexA
    }
  };

  return {
    assessmentId: null, 
    timestamp: new Date().toISOString(),
    smeProfile,
    scores: {
        ...scoring.summary,
        complianceScores: scoring.complianceScores,
        weightedScores: scoring.weightedScores,
        complianceBreakdownMandatory: {
            counts: scoring.questionSummary.stage1
        },
        complianceBreakdownAnnexA: {
            counts: scoring.questionSummary.annexA
        }
    },
    recommendations: recommendations.slice(0, 10),
    allRecommendations: recommendations,
    excludedControls: scoring.excludedControls,
    charts
  };
}
