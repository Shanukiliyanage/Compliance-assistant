// figures out which controls are N/A based on gateway answers and explicit N/A selections

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

// returns a Set of controlIds marked as N/A
export function getNotApplicableControlIds(stageId, stageAnswers) {
  const stage = stageAnswers || {};
  const notApplicable = new Set();

  // explicit N/A answers only apply for stages 2-5 (Annex A)
  if (stageId !== "stage1") {
    for (const [key, value] of Object.entries(stage)) {
      if (!isNotApplicableAnswer(value)) continue;
      const controlId = normalizeControlId(key);
      if (controlId) notApplicable.add(controlId);
    }
  }

  if (stageId === "stage2") {
    // supplier controls (A.5.19-A.5.22) are N/A if there are no supplier relationships
    if (!isYesAnswer(stage["A5.19.GW1"])) {
      addRange(notApplicable, "A.5.", 19, 22);
    }

    // cloud controls are N/A if the org doesn't use cloud
    if (!isYesAnswer(stage["A5.23.Q1"])) {
      notApplicable.add("A.5.23");
    }

    // incident follow-ups are N/A if incident management isn't in scope
    if (!isYesAnswer(stage["A5.24.Q1"])) {
      addRange(notApplicable, "A.5.", 25, 28);
    }
  }

  if (stageId === "stage5") {
    // network controls are N/A if networking isn't in scope
    if (!isYesAnswer(stage["A8.20_Q1"])) {
      notApplicable.add("A.8.21");
      notApplicable.add("A.8.22");
    }

    // SDLC/dev controls are N/A if there's no software development
    if (!isYesAnswer(stage["SDLC_GATE_Q1"])) {
      // exclude dev-related controls
      ["A.8.25", "A.8.26", "A.8.27", "A.8.28", "A.8.29", "A.8.31", "A.8.33"].forEach((id) =>
        notApplicable.add(id)
      );
    }
  }

  return notApplicable;
}
