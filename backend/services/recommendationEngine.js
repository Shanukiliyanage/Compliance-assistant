import { generateRecommendations as detailedGenerate } from "../utils/recommendations.js";

/**
 * Recommendation Engine Wrapper
 * Provides backward compatibility while using the new detailed rulebook logic.
 */
export function generateRecommendations(answersOrDetails) {
  // If called with details (older style), try to infer answers or just return detailed rules.
  // Current callers in assessment.routes.js and summaryEngine.js pass answers.
  return detailedGenerate(answersOrDetails);
}
