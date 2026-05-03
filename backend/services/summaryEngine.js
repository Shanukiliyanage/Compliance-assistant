/**
 * Summary Engine
 * Aggregates all analysis results for the dashboard with 100% mathematical sync.
 */
import { calculateScores } from "./scoringEngine.js";
import { generateRecommendations } from "./recommendationEngine.js";

export function getFullSummary(answers, smeProfile) {
  const scoring = calculateScores(answers, smeProfile);
  const recommendations = generateRecommendations(scoring.details);
  
  // Unified Pie Chart Aggregation (Directly from scoring summary)
  const charts = {
    mandatory: {
      yes: scoring.summary.stage1.yes,
      partial: scoring.summary.stage1.partial,
      no: scoring.summary.stage1.no,
      total: 7
    },
    annexA: {
      yes: scoring.summary.stage2.yes + scoring.summary.stage3.yes + scoring.summary.stage4.yes + scoring.summary.stage5.yes,
      partial: scoring.summary.stage2.partial + scoring.summary.stage3.partial + scoring.summary.stage4.partial + scoring.summary.stage5.partial,
      no: scoring.summary.stage2.no + scoring.summary.stage3.no + scoring.summary.stage4.no + scoring.summary.stage5.no,
      na: scoring.summary.stage2.na + scoring.summary.stage3.na + scoring.summary.stage4.na + scoring.summary.stage5.na,
      total: 37 + 8 + 14 + 34 // 93
    },
    // NEW: Question-level breakdown for accurate UI representation
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
        complianceBreakdownMandatory: {
            counts: charts.questionBreakdown.mandatory
        },
        complianceBreakdownAnnexA: {
            counts: charts.questionBreakdown.annexA
        }
    },
    weightedScores: scoring.weightedScores,
    recommendations: recommendations.slice(0, 10),
    allRecommendations: recommendations,
    charts
  };
}
