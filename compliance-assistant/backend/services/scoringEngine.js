import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getApplicability } from "./gatewayEngine.js";
import { getControlWeight } from "./weightEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadJson = (filename) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", filename), "utf8"));

const mandatoryData = loadJson("mandatory.json");
const organizationalData = loadJson("organizational.json");
const peopleData = loadJson("people.json");
const physicalData = loadJson("physical.json");
const technologicalData = loadJson("technological.json");

/**
 * MASTER SCORING MODEL (Question Level)
 * Yes = 1.0, Partial = 0.5, No = 0.0, Implicit No = 0.0
 */
function getResponseScore(val) {
  const v = String(val || "").toLowerCase().trim();
  if (v === "yes") return 1.0;
  if (v === "partial") return 0.5;
  return 0.0;
}

/**
 * CONTROL STATUS CLASSIFICATION (Control Level)
 * If average score == 1 -> Yes
 * If average score > 0 and < 1 -> Partial
 * If average score == 0 -> No
 */
function classifyStatus(score) {
  if (score >= 0.99) return "yes";
  if (score > 0) return "partial";
  return "no";
}

/**
 * COMPLIANCE % FORMULA: (Y + 0.5P) / (Y + P + N) * 100
 * @param {Object} counts { yes, partial, no }
 */
function calculateCompliancePercent(counts) {
  const { yes: Y, partial: P, no: N } = counts;
  const denominator = Y + P + N;
  if (denominator === 0) return 0;
  return ((Y + 0.5 * P) / denominator) * 100;
}

export function calculateScores(answers, smeProfile = {}) {
  const { naControls, implicitNoControls } = getApplicability(answers);
  const industry = smeProfile.sector || smeProfile.industry || "Standard";

  const results = {
    summary: {
      stage1: { yes: 0, partial: 0, no: 0, na: 0, total: 7 },
      stage2: { yes: 0, partial: 0, no: 0, na: 0, total: 37 },
      stage3: { yes: 0, partial: 0, no: 0, na: 0, total: 8 },
      stage4: { yes: 0, partial: 0, no: 0, na: 0, total: 14 },
      stage5: { yes: 0, partial: 0, no: 0, na: 0, total: 34 },
    },
    details: {}, 
    complianceScores: {
      stage1: 0,
      annexA: 0,
      overall: 0
    },
    weightedScores: {
      stage1: 0,
      annexA: 0,
      overall: 0
    },
    questionSummary: {
      stage1: { yes: 0, partial: 0, no: 0, total: 0 },
      annexA: { yes: 0, partial: 0, no: 0, na: 0, total: 0 }
    },
    excludedControls: []
  };

  // --- STAGE 1: MANDATORY (7 Clauses) ---
  const stage1Answers = answers.stage1 || {};
  const s1Groups = { "4": [], "5": [], "6": [], "7": [], "8": [], "9": [], "10": [] };
  
  mandatoryData.forEach(q => {
    const clauseId = String(q.clause || "").split(".")[0];
    if (s1Groups[clauseId]) {
      const rawValue = stage1Answers[String(q.clause).trim()] || 
                       stage1Answers[q.clause] || 
                       stage1Answers[String(q.id)] || 
                       stage1Answers[q.id] || 
                       "missing";
                       
      const score = getResponseScore(rawValue);
      s1Groups[clauseId].push(score);

      // Question-level tracking
      if (rawValue !== "missing") {
          results.questionSummary.stage1.total++;
          if (score >= 0.99) results.questionSummary.stage1.yes++;
          else if (score > 0) results.questionSummary.stage1.partial++;
          else results.questionSummary.stage1.no++;
      }
    }
  });

  Object.entries(s1Groups).forEach(([clauseId, scores]) => {
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const status = classifyStatus(avg);
    results.summary.stage1[status]++;
    results.details[clauseId] = { 
        score: avg, 
        status, 
        weight: getControlWeight(clauseId, industry), 
        type: "clause" 
    };
  });

  // --- ANNEX A STAGES (2-5) ---
  const annexAStages = [
    { key: "stage2", label: "Organizational", data: organizationalData },
    { key: "stage3", label: "People", data: peopleData },
    { key: "stage4", label: "Physical", data: physicalData },
    { key: "stage5", label: "Technological", data: technologicalData }
  ];

  annexAStages.forEach(stage => {
    const stageAnswers = answers[stage.key] || {};
    const controls = stage.data.controls ? (Array.isArray(stage.data.controls) ? stage.data.controls : Object.values(stage.data.controls)) : Object.entries(stage.data);

    controls.forEach(c => {
        const controlId = c.control || (Array.isArray(c) ? c[0] : null);
        if (!controlId) return;

        // 1. Check True N/A (Exclude from Denominator)
        if (naControls.has(controlId)) {
            results.summary[stage.key].na++;
            results.details[controlId] = { score: 0, status: "na", weight: 0, type: "control" };
            results.questionSummary.annexA.na++;
            results.questionSummary.annexA.total++; 
            
            // Add to excluded list with reason
            let reason = "Not applicable to business operations";
            if (controlId.startsWith("A5.19") || controlId.startsWith("A5.20") || controlId.startsWith("A5.21") || controlId.startsWith("A5.22")) {
                reason = "Organization does not use external suppliers";
            } else if (controlId.startsWith("A5.23")) {
                reason = "Organization does not use cloud services";
            } else if (controlId.startsWith("A8.25") || controlId.startsWith("A8.26") || controlId.startsWith("A8.27") || controlId.startsWith("A8.28") || controlId.startsWith("A8.29") || controlId.startsWith("A8.31") || controlId.startsWith("A8.33")) {
                reason = "Organization does not perform software development (SDLC)";
            }
            results.excludedControls.push({ id: controlId, name: c.control || controlId, reason });
            return;
        }

        // 2. Check Implicit No (Score 0, Keep in Denominator)
        if (implicitNoControls.has(controlId)) {
            results.summary[stage.key].no++;
            results.details[controlId] = { score: 0, status: "no", weight: getControlWeight(controlId, industry), type: "control" };
            results.questionSummary.annexA.no++;
            results.questionSummary.annexA.total++;
            return;
        }

        // 3. Normal Control Scoring
        const qs = c.questions || (Array.isArray(c) && c[1] ? c[1].questions : []);
        const scores = qs.map(q => getResponseScore(stageAnswers[q.id]));
        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const status = classifyStatus(avg);
        
        results.summary[stage.key][status]++;
        results.details[controlId] = { 
            score: avg, 
            status, 
            weight: getControlWeight(controlId, industry), 
            type: "control" 
        };

        // Question-level tracking
        results.questionSummary.annexA.total += scores.length;
        scores.forEach(s => {
            if (s >= 0.99) results.questionSummary.annexA.yes++;
            else if (s > 0) results.questionSummary.annexA.partial++;
            else results.questionSummary.annexA.no++;
        });
    });
  });

  // --- FINAL SCORE CALCULATIONS ---

  // A. Normal Compliance Scores (User-facing)
  results.complianceScores.stage1 = calculateCompliancePercent(results.summary.stage1);
  
  const annexACombined = {
      yes: results.summary.stage2.yes + results.summary.stage3.yes + results.summary.stage4.yes + results.summary.stage5.yes,
      partial: results.summary.stage2.partial + results.summary.stage3.partial + results.summary.stage4.partial + results.summary.stage5.partial,
      no: results.summary.stage2.no + results.summary.stage3.no + results.summary.stage4.no + results.summary.stage5.no
  };
  results.complianceScores.annexA = calculateCompliancePercent(annexACombined);
  results.complianceScores.overall = (results.complianceScores.stage1 + results.complianceScores.annexA) / 2;

  // B. Weighted Risk Scores (Internal)
  const calculateWeightedSetScore = (ids) => {
    let sum = 0, weightTotal = 0;
    ids.forEach(id => {
        const detail = results.details[id];
        if (detail && detail.status !== "na") {
            sum += (detail.score * detail.weight);
            weightTotal += detail.weight;
        }
    });
    return weightTotal > 0 ? (sum / weightTotal) * 100 : 0;
  };

  const s1Ids = ["4", "5", "6", "7", "8", "9", "10"];
  const annexAIds = Object.keys(results.details).filter(id => id.startsWith("A"));

  results.weightedScores.stage1 = calculateWeightedSetScore(s1Ids);
  results.weightedScores.annexA = calculateWeightedSetScore(annexAIds);
  results.weightedScores.overall = (results.weightedScores.stage1 + results.weightedScores.annexA) / 2;

  return results;
}
