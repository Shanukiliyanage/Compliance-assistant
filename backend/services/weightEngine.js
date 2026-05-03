/**
 * Weight Engine
 * Handles sector-based weights for controls.
 * Standard = 1
 * Important = 1.5
 * Critical = 2
 */

const DEFAULT_WEIGHTS = {
  // Mandatory Clauses (Always Critical)
  "4": 2, "5": 2, "6": 2, "7": 2, "8": 2, "9": 2, "10": 2,
  
  // Organizational
  "A5.1": 1.5, "A5.15": 2, "A5.19": 1.5, "A5.24": 2, "A5.37": 1.5,
  
  // People
  "A6.1": 1.5, "A6.3": 1.5, "A6.8": 1.5,
  
  // Physical
  "A7.1": 1.5, "A7.10": 1,
  
  // Technological
  "A8.1": 2, "A8.2": 2, "A8.5": 2, "A8.8": 2, "A8.12": 2, "A8.15": 1.5, "A8.20": 2, "A8.24": 2, "A8.28": 1.5
};

// Sector-specific overrides (Example logic)
const SECTOR_MODIFIERS = {
  "Healthcare": ["A5.1", "A8.11", "A8.12", "A8.24"], // Data privacy focus
  "Financial Services": ["A8.2", "A8.10", "A8.12", "A8.20"], // Transaction security focus
  "Technology": ["A8.25", "A8.26", "A8.27", "A8.28"] // SDLC focus
};

export function getControlWeight(controlId, industry = "Standard") {
  let weight = DEFAULT_WEIGHTS[controlId] || 1;
  
  // Apply sector modifier
  if (SECTOR_MODIFIERS[industry]?.includes(controlId)) {
    weight = 2; // Bump to Critical if sector-critical
  }
  
  return weight;
}

export function calculateWeightedScore(scores, weights) {
  if (scores.length === 0) return 0;
  
  const weightedSum = scores.reduce((sum, score, idx) => sum + (score * weights[idx]), 0);
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  
  return weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 0;
}
