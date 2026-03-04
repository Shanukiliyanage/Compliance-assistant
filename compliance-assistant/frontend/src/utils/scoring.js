// Simple client-side scoring helper.
// Note: the backend provides the authoritative ISO control scoring.

// Calculates a single stage score from answers.
// Input: { questionId: "yes" | "partial" | "no" }
// Output: { raw, max, percent }
function calculateStageScore(stageAnswers) {
  if (!stageAnswers) {
    return { raw: 0, max: 0, percent: 0 };
  }

  let raw = 0;
  let maxScore = 0;

  // Convert answers into points.
  Object.values(stageAnswers).forEach((answer) => {
    // Each question is worth 2 points (yes=2, partial=1, no=0).
    maxScore += 2;
    if (answer === "yes") raw += 2;
    else if (answer === "partial") raw += 1;
  });

  // Convert to percentage.
  const percent = maxScore > 0 ? Math.round((raw / maxScore) * 100) : 0;

  return { raw, max: maxScore, percent };
}

// Calculates scores for all stages.
// Input: { stage1: {...}, stage2: {...}, ... }
// Output: { stageScores, overall }
function calculateAllScores(allAnswers) {
  // allAnswers format: { stage1: {...}, stage2: {...}, ..., stage5: {...} }
  const stageScores = {};
  let totalRaw = 0;
  let totalMax = 0;

  // Loop through each stage and score it.
  Object.keys(allAnswers).forEach((stageKey) => {
    const stageScore = calculateStageScore(allAnswers[stageKey]);
    stageScores[stageKey] = stageScore;
    totalRaw += stageScore.raw;
    totalMax += stageScore.max;
  });

  // Calculate overall percentage.
  const overallPercent =
    totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0;

  return {
    stageScores,
    overall: { raw: totalRaw, max: totalMax, percent: overallPercent },
  };
}

// Simple recommendations based on stage percentages.
function generateRecommendations(scores) {
  const recommendations = [];

  // Create stage-level messages.
  Object.entries(scores.stageScores).forEach(([stageId, score]) => {
    if (score.percent < 50) {
      recommendations.push({
        stage: stageId,
        severity: "high",
        message: `${stageId} has ${score.percent}% compliance. Focus on improving this area.`,
      });
    } else if (score.percent < 75) {
      recommendations.push({
        stage: stageId,
        severity: "medium",
        message: `${stageId} has ${score.percent}% compliance. There is room for improvement.`,
      });
    }
  });

  // Overall message.
  if (scores.overall.percent < 50) {
    recommendations.push({
      stage: "overall",
      severity: "high",
      message: `Overall compliance is ${scores.overall.percent}%. Significant improvements needed.`,
    });
  }

  return recommendations;
}

export { calculateStageScore, calculateAllScores, generateRecommendations };
