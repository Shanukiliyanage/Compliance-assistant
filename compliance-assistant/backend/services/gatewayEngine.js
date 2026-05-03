/**
 * Gateway Engine
 * Handles applicability logic for the assessment based on standardized compliance rules.
 * Determines which controls should be excluded (True N/A) vs which are failed (Implicit No).
 */

const GATEWAY_QUESTIONS = {
  SUPPLIER: "A5.19.GW1",
  CLOUD: "A5.23.Q1",
  INCIDENT: "A5.24.Q1",
  NETWORK: "A8.20_Q1",
  SDLC: "SDLC_GATE_Q1"
};

const TRUE_NA_MAP = {
  SUPPLIER: ["A5.19", "A5.20", "A5.21", "A5.22"],
  CLOUD: ["A5.23"],
  SDLC: ["A8.25", "A8.26", "A8.27", "A8.28", "A8.29", "A8.31", "A8.33"]
};

const IMPLICIT_NO_MAP = {
  INCIDENT: ["A5.25", "A5.26", "A5.27", "A5.28"],
  NETWORK: ["A8.21", "A8.22"]
};

function isYes(val) {
  return String(val || "").toLowerCase().trim() === "yes";
}

/**
 * Returns the applicability sets based on the provided answers.
 * @param {Object} answers 
 * @returns {Object} { naControls: Set, implicitNoControls: Set }
 */
export function getApplicability(answers) {
  const stage2 = answers.stage2 || {};
  const stage5 = answers.stage5 || {};

  const isSupplierApplicable = isYes(stage2[GATEWAY_QUESTIONS.SUPPLIER]);
  const isCloudApplicable = isYes(stage2[GATEWAY_QUESTIONS.CLOUD]);
  const isIncidentPlanned = isYes(stage2[GATEWAY_QUESTIONS.INCIDENT]);
  const isNetworkSecured = isYes(stage5[GATEWAY_QUESTIONS.NETWORK]);
  const isSdlcApplicable = isYes(stage5[GATEWAY_QUESTIONS.SDLC]);

  const naControls = new Set();
  const implicitNoControls = new Set();

  // True N/A Logic (Remove from denominator)
  if (!isSupplierApplicable) {
    TRUE_NA_MAP.SUPPLIER.forEach(id => naControls.add(id));
  }
  if (!isCloudApplicable) {
    TRUE_NA_MAP.CLOUD.forEach(id => naControls.add(id));
  }
  if (!isSdlcApplicable) {
    TRUE_NA_MAP.SDLC.forEach(id => naControls.add(id));
  }

  // Implicit No Logic (Score 0, keep in denominator)
  if (!isIncidentPlanned) {
    IMPLICIT_NO_MAP.INCIDENT.forEach(id => implicitNoControls.add(id));
  }
  if (!isNetworkSecured) {
    IMPLICIT_NO_MAP.NETWORK.forEach(id => implicitNoControls.add(id));
  }

  // Add explicit N/A answers from Annex A stages
  ["stage2", "stage3", "stage4", "stage5"].forEach(stageKey => {
    const stageAnswers = answers[stageKey] || {};
    Object.entries(stageAnswers).forEach(([qId, val]) => {
      const v = String(val || "").toLowerCase().trim();
      if (v === "n/a" || v === "not applicable") {
        // Normalize QId to ControlId (e.g., A5.1.Q1 -> A5.1)
        const parts = qId.split(".");
        if (parts.length >= 2) {
          const controlId = parts[0] + "." + parts[1];
          naControls.add(controlId);
        }
      }
    });
  });

  return { naControls, implicitNoControls };
}
