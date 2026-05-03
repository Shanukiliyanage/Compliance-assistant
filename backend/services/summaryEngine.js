/**
 * Summary Engine
 * Aggregates all analysis results for the dashboard.
 */
import { calculateScores } from "./scoringEngine.js";
import { generateRecommendations } from "./recommendationEngine.js";

export function getFullSummary(answers, smeProfile) {
  const scoring = calculateScores(answers, smeProfile);
  const recommendations = generateRecommendations(scoring.details);
  
  return {
    assessmentId: null, // To be filled by service
    timestamp: new Date().toISOString(),
    smeProfile,
    scores: scoring.summary,
    weightedScores: scoring.weightedScores,
    recommendations: recommendations.slice(0, 10), // Top 10 risks
    allRecommendations: recommendations,
    charts: {
      mandatory: {
        yes: scoring.summary.stage1.yes,
        partial: scoring.summary.stage1.partial,
        no: scoring.summary.stage1.no
      },
      annexA: {
        yes: scoring.summary.stage2.yes + scoring.summary.stage3.yes + scoring.summary.stage4.yes + scoring.summary.stage5.yes,
        partial: scoring.summary.stage2.partial + scoring.summary.stage3.partial + scoring.summary.stage4.partial + scoring.summary.stage5.partial,
        no: scoring.summary.stage2.no + scoring.summary.stage3.no + scoring.summary.stage4.no + scoring.summary.stage5.no,
        na: scoring.summary.stage2.na + scoring.summary.stage3.na + scoring.summary.stage4.na + scoring.summary.stage5.na
      }
    }
  };
}
