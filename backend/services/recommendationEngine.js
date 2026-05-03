/**
 * Recommendation Engine
 * Generates priority-based recommendations.
 * Priority = weight * (1 - score)
 */

const RECOMMENDATION_TEMPLATES = {
  "4": "Define and document the internal and external context of your organization to align security with business goals.",
  "5": "Demonstrate leadership commitment by establishing a clear security policy and assigning specific roles.",
  "6": "Implement a formal risk assessment and treatment process to identify and mitigate threats effectively.",
  "A5.1": "Establish a comprehensive set of information security policies approved by management.",
  "A5.19": "Define and implement security requirements for all third-party supplier relationships.",
  "A5.24": "Establish a formal information security incident management process, including reporting and response.",
  "A8.2": "Restrict and control access to privileged utility programs and administrative rights.",
  "A8.5": "Implement strong authentication methods (MFA) for access to critical systems.",
  "A8.20": "Apply network security controls like firewalls and segmentation to protect data in transit."
};

function getRiskLevel(priority) {
  if (priority > 1.5) return "CRITICAL";
  if (priority > 1.0) return "HIGH";
  if (priority > 0.5) return "MEDIUM";
  return "LOW";
}

export function generateRecommendations(details) {
  const recommendations = [];

  Object.entries(details).forEach(([id, data]) => {
    if (data.score < 1) {
      const priority = data.weight * (1 - data.score);
      const riskLevel = getRiskLevel(priority);
      
      recommendations.push({
        id,
        control: id,
        priority: Number(priority.toFixed(2)),
        riskLevel,
        recommendation: RECOMMENDATION_TEMPLATES[id] || `Strengthen compliance for control ${id} to reduce organizational risk.`,
        score: data.score,
        weight: data.weight
      });
    }
  });

  // Sort by priority descending
  return recommendations.sort((a, b) => b.priority - a.priority);
}
