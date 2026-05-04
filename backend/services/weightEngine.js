/**
 * Weight Engine
 * Handles sector-based weights for controls.
 * Standard = 1
 * Important = 1.5
 * Critical = 2
 *
 * Sector weights affect ONLY scoring calculations and recommendation priority.
 * They must NEVER influence the frontend UI layout, card structure, or chart design.
 */

const DEFAULT_WEIGHTS = {
  // Mandatory Clauses (Always Critical for ALL sectors)
  "4": 2, "CL4_1": 2, "CL4_2": 2, "CL4_3": 2,
  "5": 2, "6": 2, "7": 2, "8": 2, "9": 2, "10": 2,
  
  // Organizational
  "A5.1": 1.5, "A5.15": 2, "A5.19": 1.5, "A5.24": 2, "A5.37": 1.5,
  
  // People
  "A6.1": 1.5, "A6.3": 1.5, "A6.8": 1.5,
  
  // Physical
  "A7.1": 1.5, "A7.10": 1,
  
  // Technological
  "A8.1": 2, "A8.2": 2, "A8.5": 2, "A8.8": 2, "A8.12": 2, "A8.15": 1.5, "A8.20": 2, "A8.24": 2, "A8.28": 1.5
};

/**
 * Sector-specific weight overrides.
 * Keys MUST match the exact sector strings from smeProfileOptions.json.
 * Controls listed here get bumped to Critical (weight = 2) for that sector.
 */
const SECTOR_MODIFIERS = {
  // Banking / Finance / Insurance — Transaction security, data integrity, access control
  "Banking / Finance / Insurance": [
    "A5.1", "A5.15", "A5.19", "A5.24",
    "A8.2", "A8.5", "A8.10", "A8.12", "A8.20", "A8.24"
  ],

  // IT / Software Development — SDLC, vulnerability management, network security
  "IT / Software Development": [
    "A8.1", "A8.2", "A8.5", "A8.8", "A8.9", "A8.12",
    "A8.20", "A8.24", "A8.25", "A8.26", "A8.27", "A8.28"
  ],

  // Healthcare — Data privacy, access control, encryption, physical security
  "Healthcare": [
    "A5.1", "A5.15", "A5.34",
    "A7.1", "A7.2", "A7.4",
    "A8.2", "A8.5", "A8.11", "A8.12", "A8.24"
  ],

  // Manufacturing — Physical security, operational technology, supply chain
  "Manufacturing": [
    "A5.19", "A5.20", "A5.21", "A5.22",
    "A7.1", "A7.2", "A7.3", "A7.4", "A7.8",
    "A8.1", "A8.9", "A8.20"
  ],

  // Retail / E-commerce — Payment security, customer data, web security
  "Retail / E-commerce": [
    "A5.1", "A5.15", "A5.19",
    "A8.2", "A8.5", "A8.8", "A8.12", "A8.20", "A8.24", "A8.28"
  ],

  // Other / General — Use default weights only
  "Other": []
};

// Legacy sector name mapping for backward compatibility
const SECTOR_ALIASES = {
  "Financial Services": "Banking / Finance / Insurance",
  "Finance": "Banking / Finance / Insurance",
  "Technology": "IT / Software Development",
  "IT": "IT / Software Development",
  "General SME": "Other",
  "Standard": "Other",
  "General": "Other"
};

export function getControlWeight(controlId, industry = "Standard") {
  let weight = DEFAULT_WEIGHTS[controlId] || 1;
  
  // Resolve sector aliases
  const resolvedSector = SECTOR_ALIASES[industry] || industry;
  
  // Apply sector modifier — bump to Critical if sector-critical
  if (SECTOR_MODIFIERS[resolvedSector]?.includes(controlId)) {
    weight = 2;
  }
  
  return weight;
}

export function calculateWeightedScore(scores, weights) {
  if (scores.length === 0) return 0;
  
  const weightedSum = scores.reduce((sum, score, idx) => sum + (score * weights[idx]), 0);
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  
  return weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 0;
}
