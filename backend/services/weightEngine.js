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
  "5": 2, "CL5_LEADERSHIP": 2, "CL5_1": 2, "CL5_2": 2,
  "6": 2, "CL6_PLANNING": 2, "CL6_1": 2, "CL6_2": 2,
  "7": 2, "CL7_SUPPORT": 2, "CL7_1": 2, "CL7_2": 2,
  "8": 2, "CL8_OPERATION": 2, "CL8_1": 2, "CL8_2": 2,
  "9": 2, "CL9_EVALUATION": 2, "CL9_1": 2, "CL9_2": 2,
  "10": 2, "CL10_IMPROVEMENT": 2, "CL10_1": 2, "CL10_2": 2,
  
  // GLOBAL RULE: All other Annex A controls default to 1.0
  // (They don't need to be listed here if the lookup defaults to 1)
};

/**
 * Sector-specific weight overrides.
 * Keys MUST match the exact sector strings from smeProfileOptions.json.
 * Maps controlId -> weight (1.5 for Important, 2.0 for Critical).
 */
const SECTOR_MODIFIERS = {
  // Banking / Finance / Insurance
  "Banking / Finance / Insurance": {
    "A.8.24": 2, "A.8.15": 2, "A.8.16": 2, "A.8.13": 2, "A.5.30": 2, "A.5.33": 2, // Critical
    "A.8.2": 1.5, "A.8.18": 1.5, "A.5.12": 1.5, "A.5.34": 1.5 // Important
  },

  // IT / Software Development
  "IT / Software Development": {
    "A.5.7": 2, "A.8.25": 2, "A.8.27": 2, "A.8.28": 2, "A.8.29": 2, "A.8.31": 2, // Critical
    "A.8.26": 1.5, "A.8.33": 1.5 // Important
  },

  // Healthcare
  "Healthcare": {
    "A.8.24": 2, "A.8.3": 2, "A.5.34": 2, "A.5.29": 2, "A.5.30": 2, "A.8.13": 2, // Critical
    "A.8.15": 1.5, "A.8.16": 1.5, "A.8.14": 1.5 // Important
  },

  // Manufacturing
  "Manufacturing": {
    "A.7.1": 2, "A.7.2": 2, "A.5.19": 2, // Critical
    "A.7.3": 1.5, "A.7.4": 1.5, "A.5.20": 1.5, "A.5.21": 1.5, "A.5.22": 1.5 // Important
  },

  // Other / General — ALL controls = 1.0 (defaults applied)
  "Other": {}
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

/**
 * Normalizes control IDs for lookup.
 * Some IDs might be passed as "A5.1" instead of "A.5.1".
 */
function normalizeId(id) {
  if (typeof id !== "string") return id;
  const match = /^A(\d+)\.(\d+)(?:\.(\d+))?$/.exec(id);
  if (match) {
    const a = match[1];
    const b = match[2];
    const c = match[3];
    return c ? `A.${a}.${b}.${c}` : `A.${a}.${b}`;
  }
  return id;
}

export function getControlWeight(rawId, industry = "Standard") {
  const controlId = normalizeId(rawId);
  
  // Resolve sector aliases
  const resolvedSector = SECTOR_ALIASES[industry] || industry;
  
  // 1. Check Sector-Specific Override
  const sectorWeights = SECTOR_MODIFIERS[resolvedSector];
  if (sectorWeights && sectorWeights[controlId]) {
    return sectorWeights[controlId];
  }
  
  // 2. Check Global Mandatory/Default Weights
  if (DEFAULT_WEIGHTS[controlId]) {
    return DEFAULT_WEIGHTS[controlId];
  }
  
  // 3. Global Default for everything else
  return 1.0;
}

export function calculateWeightedScore(scores, weights) {
  if (scores.length === 0) return 0;
  
  const weightedSum = scores.reduce((sum, score, idx) => sum + (score * weights[idx]), 0);
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  
  return weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 0;
}
