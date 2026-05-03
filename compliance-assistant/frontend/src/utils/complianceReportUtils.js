// Utility to generate a structured compliance report summary for Mandatory Clauses and Annex A
// Input: Array of control results (from backend or frontend)
// Output: { mandatoryClauses: {...}, annexA: {...} }

/**
 * @typedef {Object} ControlResult
 * @property {string} id - Control ID (e.g., '4.2', 'A.5.12')
 * @property {string} question - Control question/description
 * @property {string} status - 'YES' | 'PARTIAL' | 'NO' | 'TRUE_NA'
 * @property {string} recommendation - Recommendation text
 */

/**
 * Generate a compliance summary for reporting.
 * @param {ControlResult[]} controls - Array of all control results
 * @returns {Object} Structured summary for Mandatory Clauses and Annex A
 */
export function generateComplianceReportSummary(controls) {
  // Helper to classify controls
  const isMandatory = (id) => /^\d+\./.test(id); // e.g., '4.2', '5.1'
  const isAnnexA = (id) => /^A\./i.test(id);     // e.g., 'A.5.12'

  function summarize(sectionControls) {
    let fullyCompliant = 0, partiallyCompliant = 0, notCompliant = 0, notApplicable = 0;
    sectionControls.forEach(ctrl => {
      if (ctrl.status === 'YES') fullyCompliant++;
      else if (ctrl.status === 'PARTIAL') partiallyCompliant++;
      else if (ctrl.status === 'NO') notCompliant++;
      else if (ctrl.status === 'TRUE_NA') notApplicable++;
    });
    return {
      total: sectionControls.length,
      fullyCompliant,
      partiallyCompliant,
      notCompliant,
      notApplicable,
      controls: sectionControls
    };
  }

  const mandatoryControls = controls.filter(ctrl => isMandatory(ctrl.id));
  const annexAControls = controls.filter(ctrl => isAnnexA(ctrl.id));

  return {
    mandatoryClauses: summarize(mandatoryControls),
    annexA: summarize(annexAControls)
  };
}
