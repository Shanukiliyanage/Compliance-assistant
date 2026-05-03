/**
 * Gateway Engine
 * Handles applicability logic for the assessment.
 * Determines which controls should be excluded (True N/A) vs which are failed (Implicit No).
 */

const GATEWAY_QUESTIONS = {
  SUPPLIER: "A5.19.GW1",
  CLOUD: "A5.23.Q1",
  INCIDENT: "A5.24.Q1",
  NETWORK: "A8.20_Q1",
  SDLC: "SDLC_GATE_Q1"
};

const DEPENDENT_CONTROLS = {
  SUPPLIER: ["A5.19", "A5.20", "A5.21", "A5.22"],
  CLOUD: ["A5.23"],
  SDLC: ["A8.25", "A8.26", "A8.27", "A8.28", "A8.29", "A8.31", "A8.33"]
};

function isYes(val) {
  return String(val || "").toLowerCase() === "yes";
}

export function getApplicability(answers) {
  const stage2 = answers.stage2 || {};
  const stage5 = answers.stage5 || {};

  const isSupplierApplicable = isYes(stage2[GATEWAY_QUESTIONS.SUPPLIER]);
  const isCloudApplicable = isYes(stage2[GATEWAY_QUESTIONS.CLOUD]);
  const isSdlcApplicable = isYes(stage5[GATEWAY_QUESTIONS.SDLC]);

  const naControls = new Set();

  if (!isSupplierApplicable) {
    DEPENDENT_CONTROLS.SUPPLIER.forEach(id => naControls.add(id));
  }
  if (!isCloudApplicable) {
    DEPENDENT_CONTROLS.CLOUD.forEach(id => naControls.add(id));
  }
  if (!isSdlcApplicable) {
    DEPENDENT_CONTROLS.SDLC.forEach(id => naControls.add(id));
  }

  // Add explicit N/A answers from Annex A stages
  ["stage2", "stage3", "stage4", "stage5"].forEach(stageKey => {
    const stageAnswers = answers[stageKey] || {};
    Object.entries(stageAnswers).forEach(([qId, val]) => {
      if (String(val).toLowerCase() === "n/a" || String(val).toLowerCase() === "not applicable") {
        const controlId = qId.split(".")[0] + "." + qId.split(".")[1]; // Basic normalization
        naControls.add(controlId);
      }
    });
  });

  return naControls;
}

export function isControlApplicable(controlId, naControls) {
  return !naControls.has(controlId);
}
