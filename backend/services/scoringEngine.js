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
 * MASTER SCORING MODEL
 * Yes = 1.0, Partial = 0.5, No = 0.0
 */
function getResponseScore(val) {
  const v = String(val || "").toLowerCase().trim();
  if (v === "yes") return 1.0;
  if (v === "partial") return 0.5;
  return 0.0;
}

/**
 * CONTROL STATUS CLASSIFICATION
 * If score == 1 -> Yes
 * If score > 0 and < 1 -> Partial
 * If score == 0 -> No
 */
function classifyStatus(score) {
  if (score >= 0.99) return "yes";
  if (score > 0) return "partial";
  return "no";
}

export function calculateScores(answers, smeProfile = {}) {
  const naControls = getApplicability(answers);
  const industry = smeProfile.industry || "Standard";

  const results = {
    summary: {
      stage1: { yes: 0, partial: 0, no: 0, na: 0, total: 7 },
      stage2: { yes: 0, partial: 0, no: 0, na: 0, total: 37 },
      stage3: { yes: 0, partial: 0, no: 0, na: 0, total: 8 },
      stage4: { yes: 0, partial: 0, no: 0, na: 0, total: 14 },
      stage5: { yes: 0, partial: 0, no: 0, na: 0, total: 34 },
    },
    details: {}, 
    weightedScores: {}
  };

  console.log("\n==================================================");
  console.log("DASHBOARD PERCENTAGE CALCULATION AUDIT");
  console.log("==================================================");

  // --- STAGE 1: MANDATORY (7 Clauses) ---
  const stage1Answers = answers.stage1 || {};
  const s1Groups = { "4": [], "5": [], "6": [], "7": [], "8": [], "9": [], "10": [] };
  
  console.log("--- STAGE 1 DATA LOOKUP AUDIT ---");
  mandatoryData.forEach(q => {
    const clauseId = String(q.clause || "").split(".")[0];
    if (s1Groups[clauseId]) {
      // Robust lookup: try clause string, q.id number, and q.id string
      const rawValue = stage1Answers[String(q.clause).trim()] || 
                       stage1Answers[q.clause] || 
                       stage1Answers[String(q.id)] || 
                       stage1Answers[q.id] || 
                       "missing";
                       
      const score = getResponseScore(rawValue);
      console.log(`  Clause ${q.clause} (ID:${q.id}): Received='${rawValue}', Score=${score}`);
      s1Groups[clauseId].push(score);
    }
  });

  Object.entries(s1Groups).forEach(([clauseId, scores]) => {
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const status = classifyStatus(avg);
    results.summary.stage1[status]++;
    results.details[clauseId] = { score: avg, status, weight: getControlWeight(clauseId, industry), type: "clause" };
    console.log(`  -> Clause ${clauseId} Final Status: ${status.toUpperCase()} (Avg: ${avg.toFixed(2)})`);
  });
  
  logStageAudit("Mandatory Clauses", results.summary.stage1);

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

        if (naControls.has(controlId)) {
            results.summary[stage.key].na++;
            results.details[controlId] = { score: 0, status: "na", weight: 0, type: "control" };
            return;
        }

        const qs = c.questions || (Array.isArray(c) && c[1] ? c[1].questions : []);
        const scores = qs.map(q => getResponseScore(stageAnswers[q.id]));
        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const status = classifyStatus(avg);
        
        results.summary[stage.key][status]++;
        results.details[controlId] = { score: avg, status, weight: getControlWeight(controlId, industry), type: "control" };
    });
    
    logStageAudit(stage.label, results.summary[stage.key]);
  });

  // Calculate Weighted Scores for thesis-grade overall compliance
  const calculateWeightedStageScore = (stageKey) => {
    const ids = stageKey === "stage1" ? ["4","5","6","7","8","9","10"] : Object.keys(results.details).filter(k => k.startsWith("A."));
    if (stageKey === "annexA") {
        const annexAIds = Object.keys(results.details).filter(k => k.startsWith("A."));
        let sum = 0, weight = 0;
        annexAIds.forEach(id => {
            if (results.details[id].status !== "na") {
                sum += (results.details[id].score * results.details[id].weight);
                weight += results.details[id].weight;
            }
        });
        return weight > 0 ? (sum / weight) * 100 : 0;
    } else {
        const s1Ids = ["4","5","6","7","8","9","10"];
        let sum = 0, weight = 0;
        s1Ids.forEach(id => {
            sum += (results.details[id].score * results.details[id].weight);
            weight += results.details[id].weight;
        });
        return weight > 0 ? (sum / weight) * 100 : 0;
    }
  };

  results.weightedScores.stage1 = calculateWeightedStageScore("stage1");
  results.weightedScores.annexA = calculateWeightedStageScore("annexA");
  results.weightedScores.overall = (results.weightedScores.stage1 + results.weightedScores.annexA) / 2;

  console.log("==================================================");
  return results;
}

function logStageAudit(name, s) {
  const T = s.total;
  const Yp = ((s.yes / T) * 100).toFixed(1);
  const Pp = ((s.partial / T) * 100).toFixed(1);
  const Np = ((s.no / T) * 100).toFixed(1);
  const NAp = ((s.na / T) * 100).toFixed(1);
  
  console.log(`${name.padEnd(20)} | Y:${s.yes} (${Yp}%) | P:${s.partial} (${Pp}%) | N:${s.no} (${Np}%) | NA:${s.na} (${NAp}%) | T:${T}`);
}
