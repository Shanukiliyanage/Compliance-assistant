import mandatoryData from "../data/mandatory.json";
import organizationalData from "../data/organizational.json";
import peopleData from "../data/people.json";
import physicalData from "../data/physical.json";
import technologicalData from "../data/technological.json";

function getScore(val) {
  if (val === "yes") return 1;
  if (val === "partial") return 0.5;
  return 0; // Default to No (Implicit No)
}

function classifyScore(avg) {
  if (avg === 1) return "yes";
  if (avg > 0) return "partial";
  return "no";
}

/**
 * Shared function to calculate Mandatory Clause statistics.
 * Grouped by major Clause (4-10).
 */
export function getMandatoryStats(answers = {}) {
  const clauseGroups = {};
  
  // Group questions by major clause (e.g., "4.2" -> "4")
  mandatoryData.forEach(q => {
    const majorClause = String(q.clause || "").split(".")[0];
    if (!majorClause) return;
    
    if (!clauseGroups[majorClause]) clauseGroups[majorClause] = [];
    
    // The QuestionsPage.jsx uses q.clause as the key in localStorage
    const answer = answers[q.clause] || answers[q.id];
    clauseGroups[majorClause].push(getScore(answer));
  });

  let yesCount = 0;
  let partialCount = 0;
  let noCount = 0;

  Object.values(clauseGroups).forEach(scores => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const status = classifyScore(avg);
    if (status === "yes") yesCount++;
    else if (status === "partial") partialCount++;
    else noCount++;
  });

  const total = yesCount + partialCount + noCount;
  const getPct = (val) => total === 0 ? 0 : Number(((val / total) * 100).toFixed(1));

  return {
    yesCount,
    partialCount,
    noCount,
    yesPercent: getPct(yesCount),
    partialPercent: getPct(partialCount),
    noPercent: getPct(noCount),
    total
  };
}

export function calculateLiveSummary() {
  const stage1Answers = JSON.parse(localStorage.getItem("stage1") || "{}");
  const stage2Answers = JSON.parse(localStorage.getItem("stage2") || "{}");
  const stage3Answers = JSON.parse(localStorage.getItem("stage3") || "{}");
  const stage4Answers = JSON.parse(localStorage.getItem("stage4") || "{}");
  const stage5Answers = JSON.parse(localStorage.getItem("stage5") || "{}");

  const mStats = getMandatoryStats(stage1Answers);

  const results = {
    stage1: { 
      yes: mStats.yesCount, 
      partial: mStats.partialCount, 
      no: mStats.noCount, 
      na: 0, 
      total: mStats.total 
    },
    stage2: { yes: 0, partial: 0, no: 0, na: 0, total: 37 },
    stage3: { yes: 0, partial: 0, no: 0, na: 0, total: 8 },
    stage4: { yes: 0, partial: 0, no: 0, na: 0, total: 14 },
    stage5: { yes: 0, partial: 0, no: 0, na: 0, total: 34 },
  };

  // Stage 2: Organizational
  const s2Gateways = {
    supplier: stage2Answers["A5.19.GW1"] === "yes",
    incident: stage2Answers["A5.24.Q1"] === "yes"
  };
  const s2SupplierIds = ["A5.20", "A5.21", "A5.22"];

  Object.entries(organizationalData).forEach(([id, data]) => {
    if (id.includes("_Gateway")) return;
    if (s2SupplierIds.includes(id) && !s2Gateways.supplier) {
      results.stage2.na++;
      return;
    }
    const scores = data.questions.map(q => {
      if (q.showIf && stage2Answers[q.showIf.questionId] !== q.showIf.equals) return 0;
      return getScore(stage2Answers[q.id]);
    });
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    results.stage2[classifyScore(avg)]++;
  });

  // Stage 3: People
  const s3Controls = Array.isArray(peopleData.controls) ? peopleData.controls : Object.values(peopleData).filter(v => v.questions);
  s3Controls.forEach(c => {
    const qs = Array.isArray(c.questions) ? c.questions : Object.values(c.questions);
    const scores = qs.map(q => getScore(stage3Answers[q.id]));
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    results.stage3[classifyScore(avg)]++;
  });

  // Stage 4: Physical
  const s4Controls = Array.isArray(physicalData.controls) ? physicalData.controls : Object.values(physicalData).filter(v => v.questions);
  s4Controls.forEach(c => {
    const qs = Array.isArray(c.questions) ? c.questions : Object.values(c.questions);
    const scores = qs.map(q => getScore(stage4Answers[q.id]));
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    results.stage4[classifyScore(avg)]++;
  });

  // Stage 5: Technological
  const s5Gateways = {
    network: stage5Answers["A8.20_Q1"] === "yes",
    sdlc: stage5Answers["SDLC_GATE_Q1"] === "yes"
  };
  const s5SdlcIds = ["A8.25", "A8.26", "A8.27", "A8.28", "A8.29", "A8.31", "A8.33"];

  Object.entries(technologicalData).forEach(([id, data]) => {
    if (id === "SDLC_Gateway") return;
    if (s5SdlcIds.includes(id) && !s5Gateways.sdlc) {
      results.stage5.na++;
      return;
    }
    const scores = data.questions.map(q => {
      if (q.showIf && stage5Answers[q.showIf.questionId] !== q.showIf.equals) return 0;
      return getScore(stage5Answers[q.id]);
    });
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    results.stage5[classifyScore(avg)]++;
  });

  return results;
}
