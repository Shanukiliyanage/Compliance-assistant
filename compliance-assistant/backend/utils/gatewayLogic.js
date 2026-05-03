// ISO 27001 strict parent-child gateway logic implementation
// Applies explicit gateway rules to control objects before scoring

/**
 * Gateway rule definitions (explicit, not generalized)
 */
const GATEWAY_RULES = [
  {
    parent: "A.5.19",
    type: "CONTEXTUAL",
    children: ["A.5.20", "A.5.21", "A.5.22"],
  },
  {
    parent: "A.5.23",
    type: "CONTEXTUAL",
    children: ["A.5.23.1", "A.5.23.2", "A.5.23.3"], // Replace with actual cloud follow-ups
  },
  {
    parent: "A.8.25",
    type: "CONTEXTUAL",
    children: ["A.8.26", "A.8.27", "A.8.28", "A.8.29", "A.8.31", "A.8.33"],
  },
  {
    parent: "A.5.24",
    type: "MANDATORY",
    children: ["A.5.25", "A.5.26", "A.5.27", "A.5.28"],
  },
  {
    parent: "A.8.20",
    type: "MANDATORY",
    children: ["A.8.21"],
  },
];

/**
 * Applies strict parent-child gateway logic to controls.
 * @param {Array} controls - Array of control objects {id, status, isApplicable, isImplicitNo}
 * @returns {Array} New array with gateway logic applied
 */
export function applyGatewayLogic(controls) {
  // Build a map for fast lookup
  const controlMap = new Map(controls.map(c => [c.id, { ...c }]));

  for (const rule of GATEWAY_RULES) {
    const parent = controlMap.get(rule.parent);
    if (!parent) continue;
    const parentStatus = String(parent.status || "").toUpperCase();
    if (parentStatus !== "NO") continue;

    for (const childId of rule.children) {
      const child = controlMap.get(childId);
      if (!child) continue;
      if (rule.type === "CONTEXTUAL") {
        child.isApplicable = false; // TRUE N/A
        child.isImplicitNo = false;
      } else if (rule.type === "MANDATORY") {
        child.isApplicable = true;
        child.isImplicitNo = true; // IMPLICIT NO
      }
      controlMap.set(childId, child);
    }
  }

  // Return new array with updated controls
  return Array.from(controlMap.values());
}
