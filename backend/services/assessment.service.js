// assessment analysis - scores answers, generates recommendations, saves the result

import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

import { calculateAllScores } from "../utils/scoring.js";
import { generateRecommendations } from "../utils/recommendations.js";
import { readJsonArray, writeJson, ensureJsonFile } from "../utils/jsonStore.js";
import {
  isFirestoreEnabled,
  saveAssessmentResultToFirestore,
} from "../utils/firestore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assessmentsPath = path.join(__dirname, "..", "data", "assessments.json");
const resultsPath = path.join(__dirname, "..", "data", "results.json");

export function analyzeAssessment({ userId, answers, smeProfile }) {
  // supports answers as an object (current) or array (legacy)
  const answersType = Array.isArray(answers)
    ? "array"
    : answers && typeof answers === "object"
      ? "object"
      : "other";

  if (!userId) {
    return {
      status: 400,
      body: { error: "Missing userId" },
    };
  }

  if (answersType === "other") {
    return {
      status: 400,
      body: { error: "Missing or invalid answers (expected object or array)" },
    };
  }

  const assessmentId = uuidv4();
  const timestamp = new Date().toISOString();

  if (process.env.DEBUG_BACKEND) {
    console.log("[analyze] userId:", userId);
    console.log("[analyze] answers type:", answersType);
  }

  const scores = calculateAllScores(answers);
  if (process.env.DEBUG_BACKEND) {
    console.log("[analyze] scores:", scores);
  }

  // recommendations are personalized with the org name
  const orgName = String(smeProfile?.organizationName || "").trim();
  const recommendations = generateRecommendations(answers, {
    orgName: orgName || "The organization",
  });
  if (process.env.DEBUG_BACKEND) {
    console.log("[analyze] recommendations count:", recommendations.length);
  }

  // result object returned to the frontend
  const result = {
    assessmentId,
    userId,
    timestamp,
    smeProfile: smeProfile || {},
    scores,
    recommendations,
  };

  // persistence
  // - Firestore if FIRESTORE_ENABLED=1
  // - local JSON files as fallback
  if (isFirestoreEnabled()) {
    // Firestore is async - JSON storage is the fallback
    saveAssessmentResultToFirestore({ ...result, answers }).catch((err) => {
      console.error("[firestore] save failed, falling back to JSON:", err);
    });
  }

  // local JSON storage
  ensureJsonFile(assessmentsPath, []);
  ensureJsonFile(resultsPath, []);

  const assessments = readJsonArray(assessmentsPath);
  assessments.push({
    assessmentId,
    userId,
    timestamp,
    smeProfile: smeProfile || {},
    answers,
  });
  writeJson(assessmentsPath, assessments);

  const results = readJsonArray(resultsPath);
  results.push(result);
  writeJson(resultsPath, results);

  return { status: 200, body: result };
}
