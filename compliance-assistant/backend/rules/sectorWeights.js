// Sector-specific control weight profiles.
//
// Weight 2   = Critical   (directly governs core sector risk)
// Weight 1.5 = Important  (notable sector relevance, detection/compliance)
// Weight 1   = Normal     (standard, sector-neutral)
//
// Any control not listed here defaults to weight 1.
// Control IDs must match the normalised form used by scoring.js (e.g. "A.5.12").

export const SECTOR_WEIGHTS = {
  Manufacturing: {
    // ── Critical (Weight = 2) ─────────────────────────────────────────────
    "A.7.1":  2,   // Physical security (access control mechanisms)
    "A.7.2":  2,   // Physical entry (server room access restriction)

    // ── Important (Weight = 1.5) ──────────────────────────────────────────
    "A.7.3":  1.5, // Securing offices, rooms and facilities (visitor escort)
    "A.7.4":  1.5, // Physical security monitoring (CCTV)

    // ── Normal (Weight = 1) ───────────────────────────────────────────────
    "A.7.5":  1,   // Protection against environmental threats
    "A.7.11": 1,   // Supporting utilities
  },

  Healthcare: {
    // ── Critical (Weight = 2) ─────────────────────────────────────────────
    "A.5.12": 2,   // Classification of information
    "A.8.24": 2,   // Use of cryptography
    "A.8.3":  2,   // Information access restriction

    // ── Important (Weight = 1.5) ──────────────────────────────────────────
    "A.8.15": 1.5, // Logging
    "A.8.16": 1.5, // Monitoring activities
    "A.5.34": 1.5, // Privacy and protection of PII

    // ── Normal (Weight = 1) ───────────────────────────────────────────────
    "A.5.13": 1,   // Labelling of information
    "A.5.31": 1,   // Legal, statutory, regulatory requirements
  },
};

/**
 * Returns the weight for a specific control in a given sector.
 * Falls back to 1 if the sector or control is not listed.
 *
 * @param {string} controlId  Normalised control ID, e.g. "A.5.12"
 * @param {string|null} sector  Sector name as stored in smeProfile.sector
 * @returns {number}
 */
export function getControlWeight(controlId, sector) {
  if (!sector) return 1;
  const profile = SECTOR_WEIGHTS[sector];
  if (!profile) return 1;
  return profile[controlId] ?? 1;
}
