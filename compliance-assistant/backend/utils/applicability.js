// Applicability utilities.
// Computes which controls are NOT_APPLICABLE based on gateway and explicit NA answers.

function isYesAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "yes";
}

function isNotApplicableAnswer(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "not applicable" || v === "n/a" || v === "na";
}

function normalizeControlId(key) {
  const k = String(key || "").trim();
  const stripped = k
    .replace(/[-_.]Q\d+$/i, "")
    .replace(/[._-]GW\d+$/i, "");

  const m2 = /^A(\d+)\.(\d+)$/.exec(stripped);
  if (m2) return `A.${Number(m2[1])}.${Number(m2[2])}`;

  const m3 = /^A(\d+)\.(\d+)\.(\d+)$/.exec(stripped);
  if (m3) return `A.${Number(m3[1])}.${Number(m3[2])}.${Number(m3[3])}`;

  return stripped;
}

function addRange(set, prefix, from, to) {
  for (let i = from; i <= to; i += 1) {
    set.add(`${prefix}${i}`);
  }
}

// Returns a Set of canonical controlIds (example: "A.5.19") marked NOT_APPLICABLE.
export function getNotApplicableControlIds(stageId, stageAnswers) {
  const stage = stageAnswers || {};
  const notApplicable = new Set();

  // Explicit NA answers should mark the corresponding Annex A control as NOT_APPLICABLE.
  // Per your requirement, we only allow explicit N/A handling for Annex A stages (2–5).
  if (stageId !== "stage1") {
    for (const [key, value] of Object.entries(stage)) {
      if (!isNotApplicableAnswer(value)) continue;
      const controlId = normalizeControlId(key);
      if (controlId) notApplicable.add(controlId);
    }
  }

  if (stageId === "stage2") {
    // Supplier-related follow-up controls only apply if supplier relationships exist.
    // If GW1 is not YES, treat A.5.19–A.5.22 as not applicable.
    if (!isYesAnswer(stage["A5.19.GW1"])) {
      addRange(notApplicable, "A.5.", 19, 22);
    }

    // Cloud risk management applies only if the org uses cloud services.
    if (!isYesAnswer(stage["A5.23.Q1"])) {
      notApplicable.add("A.5.23");
    }

    // Incident follow-up controls apply only if incident management is in scope.
    if (!isYesAnswer(stage["A5.24.Q1"])) {
      addRange(notApplicable, "A.5.", 25, 28);
    }
  }

  if (stageId === "stage5") {
    // Secure development controls apply only if SDLC/software development is in scope.
    if (!isYesAnswer(stage["SDLC_GATE_Q1"])) {
      // Exclude the SDLC-dependent controls.
      ["A.8.25", "A.8.26", "A.8.27", "A.8.28", "A.8.29", "A.8.31", "A.8.33"].forEach((id) =>
        notApplicable.add(id)
      );
    }
  }

  return notApplicable;
}
