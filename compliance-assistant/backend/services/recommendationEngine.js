/**
 * Recommendation Engine
 * Generates priority-based recommendations.
 * Priority = weight * (1 - score)
 */

const RECOMMENDATION_TEMPLATES = {
  "4": "Establish a formal Context of the Organization. This involves identifying internal/external issues (Clause 4.1), determining stakeholder requirements (Clause 4.2), and clearly defining the ISMS scope (Clause 4.3).",
  "5": "Strengthen Leadership commitment. Ensure top management signs off on the Information Security Policy (Clause 5.2) and that security roles, responsibilities, and authorities are formally assigned (Clause 5.3).",
  "6": "Enhance Planning and Risk Management. Implement a documented risk assessment process (Clause 6.1) that identifies threats/vulnerabilities and maps them to a formal Risk Treatment Plan (Clause 6.2).",
  "7": "Improve Support and Resources. Ensure all staff receive security awareness training (Clause 7.2.2) and that organizational competence and documented information are maintained according to standard.",
  "8": "Optimize Operations. Document and implement operational procedures for all security controls. Ensure regular evidence collection to prove that procedures are consistently followed in daily activities.",
  "9": "Formalize Performance Evaluation. Conduct regular internal audits (Clause 9.2) and ensure top management performs an annual ISMS review to evaluate KPIs and security effectiveness (Clause 9.3).",
  "10": "Commit to Continual Improvement. Establish a non-conformity and incident tracking system. Ensure that root-cause analysis is performed and corrective actions are tracked to completion.",
  
  // Annex A High Priority Templates
  "A5.1": "Establish a comprehensive set of information security policies approved by management and communicated to all relevant stakeholders.",
  "A5.19": "Define and implement security requirements for all third-party supplier relationships and regularly monitor their compliance.",
  "A5.24": "Establish a formal information security incident management process, including reporting channels and response procedures.",
  "A8.2": "Restrict and control access to privileged utility programs and administrative rights to prevent unauthorized system changes.",
  "A8.5": "Implement strong authentication methods (MFA) for access to all critical business systems and data repositories.",
  "A8.20": "Apply network security controls like firewalls, VPNs, and network segmentation to protect data in transit and isolate sensitive systems."
};

function getRiskLevel(priority) {
  if (priority > 1.5) return "CRITICAL";
  if (priority > 1.0) return "HIGH";
  if (priority > 0.5) return "MEDIUM";
  return "LOW";
}

/**
 * Generates a list of recommendations based on control scores and weights.
 * Excludes fully compliant (>= 0.99) and Not Applicable (na) controls.
 */
export function generateRecommendations(details) {
  const recommendationsMap = new Map();

  Object.entries(details).forEach(([id, data]) => {
    // 1. Exclude fully compliant and Not Applicable (True N/A) controls
    if (data.score >= 0.99 || data.status === "na") return;

    let label = data.type === "clause" || /^\d+(\.\d+)*$/.test(id) ? `Clause ${id}` : `Control ${id}`;
    let baseClause = id;
    if (data.type === "clause" || /^\d+(\.\d+)*$/.test(id)) {
        baseClause = id.split(".")[0];
    }

    const priority = (data.weight || 1.0) * (1 - data.score);
    
    recommendationsMap.set(id, {
        id: id,
        control: label,
        priority: priority,
        riskLevel: getRiskLevel(priority),
        recommendation: RECOMMENDATION_TEMPLATES[baseClause] || RECOMMENDATION_TEMPLATES[id] || `Strengthen compliance for ${label} to reduce organizational risk.`,
        score: data.score,
        weight: data.weight || 1.0
    });
  });

  return Array.from(recommendationsMap.values())
    .map(rec => ({ ...rec, priority: Number(rec.priority.toFixed(2)) }))
    .sort((a, b) => b.priority - a.priority);
}
