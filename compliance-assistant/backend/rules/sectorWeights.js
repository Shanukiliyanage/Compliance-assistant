
// ISO/IEC 27001 Sector-Based Control Weighting System
// Weight 2.0 = Critical   (directly governs core sector risk)
// Weight 1.5 = Important  (notable sector relevance, detection/compliance)
// Weight 1.0 = Standard   (sector-neutral baseline)

export const SECTOR_WEIGHTS = {
 
  SOFTWARE_IT: {
    // Critical (DEMATEL-based high influence controls)
    "A.5.7": 2.0,
    "A.8.25": 2.0,
    "A.8.27": 2.0,
    "A.8.28": 2.0,
    "A.8.29": 2.0,
    "A.8.31": 2.0,

    // Important
    "A.8.26": 1.5,
    "A.8.33": 1.5,

    // Standard
    "A.8.4": 1.0,
  },

  HEALTHCARE: {
    // Critical (AHP-based priorities: confidentiality + availability)
    "A.8.24": 2.0,
    "A.8.3": 2.0,
    "A.5.34": 2.0,
    "A.5.29": 2.0,
    "A.5.30": 2.0,
    "A.8.13": 2.0,

    // Important
    "A.8.15": 1.5,
    "A.8.16": 1.5,
    "A.8.14": 1.5,

    // Standard
    "A.5.12": 1.0,
    "A.5.13": 1.0,
    "A.5.31": 1.0,
  },

  MANUFACTURING: {
    // Critical (physical + operational dominance)
    "A.7.1": 2.0,
    "A.7.2": 2.0,
    "A.5.19": 2.0,

    // Important
    "A.7.3": 1.5,
    "A.7.4": 1.5,
    "A.5.20": 1.5,
    "A.5.21": 1.5,
    "A.5.22": 1.5,

    // Standard
    "A.7.5": 1.0,
    "A.7.11": 1.0,
    "A.5.23": 1.0,
  },

  FINANCIAL: {
    // Critical (CILOS-TOPSIS + PRISM validated)
    "A.8.24": 2.0,
    "A.8.15": 2.0,
    "A.8.16": 2.0,
    "A.8.13": 2.0,
    "A.5.30": 2.0,
    "A.5.33": 2.0,

    // Important
    "A.8.2": 1.5,
    "A.8.18": 1.5,
    "A.5.12": 1.5,
    "A.5.34": 1.5,

    // Standard
    "A.8.11": 1.0,
    "A.8.20": 1.0,
  },
};

/**
 * Returns the weight for a specific control in a given sector.
 */
export function getControlWeight(controlId, sector) {
  if (!sector) return 1.0;

  const profile = SECTOR_WEIGHTS[sector.toUpperCase?.()];
  if (!profile) return 1.0;

  return profile[controlId] ?? 1.0;
}