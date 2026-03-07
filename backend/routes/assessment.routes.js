import { Router } from "express";
import { analyzeAssessment } from "../services/assessment.service.js";
import path from "path";
import { fileURLToPath } from "url";
import { readJsonArray, ensureJsonFile, writeJson } from "../utils/jsonStore.js";
import {
  generateRecommendations,
  buildControlStatusSummary,
  buildAnswersForExport,
} from "../utils/recommendations.js";
import { calculateAllScores } from "../utils/scoring.js";
import {
  isFirestoreEnabled,
  getAssessmentResultFromFirestore,
} from "../utils/firestore.js";

// Assessment API routes.
// Note: results can be stored in JSON (default) or Firestore (optional), and older
// stored results may be hydrated (backfilled) when fetched.

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resultsPath = path.join(__dirname, "..", "data", "results.json");
const assessmentsPath = path.join(__dirname, "..", "data", "assessments.json");

// These helpers detect older saved result formats.
// The project evolved over time, so older stored formats may be upgraded on read.
function hasEmptyRecommendations(result) {
  return !Array.isArray(result?.recommendations) || result.recommendations.length === 0;
}

function hasLegacyRecommendationsShape(result) {
  if (!Array.isArray(result?.recommendations) || result.recommendations.length === 0) return false;
  // Legacy items look like: { stageId, severity, title, description, actions, ... }
  // Current items look like: { controlId, stageId, complianceState, recommendation }
  return result.recommendations.some(
    (r) => r && typeof r === "object" && !("recommendation" in r) && !("controlId" in r)
  );
}

function hasGenericFallbackRecommendations(result) {
  if (!Array.isArray(result?.recommendations) || result.recommendations.length === 0) return false;

  return result.recommendations.some((r) => {
    const text = String(r?.recommendation ?? "");
    return (
      text.startsWith("Implement and document controls for ") ||
      text.startsWith("Strengthen and formalize your implementation of ")
    );
  });
}

function hasOutdatedPeopleControlTemplates(result) {
  if (!Array.isArray(result?.recommendations) || result.recommendations.length === 0) return false;

  const peopleIds = new Set([
    "A.6.1",
    "A.6.2",
    "A.6.3",
    "A.6.4",
    "A.6.5",
    "A.6.6",
    "A.6.7",
    "A.6.8",
  ]);

  // Earlier templates included ISO/IEC 27002 phrasing; we now use improved wording.
  return result.recommendations.some((r) => {
    const id = String(r?.controlId ?? "").trim();
    if (!peopleIds.has(id)) return false;
    const text = String(r?.recommendation ?? "");
    return /ISO\/IEC\s*27002/i.test(text);
  });
}

function hasOutdatedTechnologicalControlTemplates(result) {
  if (!Array.isArray(result?.recommendations) || result.recommendations.length === 0) return false;

  const techIds = new Set([
    "A.8.1",
    "A.8.2",
    "A.8.3",
    "A.8.4",
    "A.8.5",
    "A.8.6",
    "A.8.7",
    "A.8.8",
    "A.8.9",
    "A.8.10",
    "A.8.11",
    "A.8.12",
    "A.8.13",
    "A.8.14",
    "A.8.15",
    "A.8.16",
    "A.8.17",
    "A.8.18",
    "A.8.19",
    "A.8.20",
    "A.8.21",
    "A.8.22",
    "A.8.23",
    "A.8.24",
    "A.8.25",
    "A.8.26",
    "A.8.27",
    "A.8.28",
    "A.8.29",
    "A.8.30",
    "A.8.31",
    "A.8.32",
    "A.8.33",
    "A.8.34",
  ]);

  return result.recommendations.some((r) => {
    const id = String(r?.controlId ?? "").trim();
    if (!techIds.has(id)) return false;
    const text = String(r?.recommendation ?? "");
    return /ISO\/IEC\s*27002/i.test(text);
  });
}

function tryBackfillRecommendationsFromJson(result) {
  // If recommendations are missing/outdated, regenerate them from stored answers.
  if (
    !result ||
    (!hasEmptyRecommendations(result) &&
      !hasLegacyRecommendationsShape(result) &&
      !hasGenericFallbackRecommendations(result) &&
      !hasOutdatedPeopleControlTemplates(result) &&
      !hasOutdatedTechnologicalControlTemplates(result))
  ) {
    return result;
  }

  // Prefer answers embedded in the stored result (Firestore may include it).
  const embeddedAnswers = result.answers && typeof result.answers === "object" ? result.answers : null;

  // Otherwise look up answers by assessmentId
  const assessmentId = result.assessmentId;
  if (!assessmentId) return result;

  ensureJsonFile(assessmentsPath, []);
  const assessments = readJsonArray(assessmentsPath);
  const match = assessments.find((a) => a && a.assessmentId === assessmentId) || null;
  const answers = embeddedAnswers || (match && match.answers);
  if (!answers || typeof answers !== "object") return result;

  const orgName = String(result?.smeProfile?.organizationName || match?.smeProfile?.organizationName || "").trim();
  const recommendations = generateRecommendations(answers, {
    orgName: orgName || "The organization",
  });

  // If still empty, keep as-is.
  if (!Array.isArray(recommendations) || recommendations.length === 0) return result;

  return { ...result, recommendations };
}

function tryBackfillScoresFromJson(result) {
  // If scores are missing, recompute them from stored answers.
  if (!result) return result;

  // Prefer answers embedded in the result
  const embeddedAnswers = result.answers && typeof result.answers === "object" ? result.answers : null;

  // Otherwise look up answers by assessmentId
  const assessmentId = result.assessmentId;
  if (!assessmentId) return result;

  ensureJsonFile(assessmentsPath, []);
  const assessments = readJsonArray(assessmentsPath);
  const match = assessments.find((a) => a && a.assessmentId === assessmentId) || null;
  const answers = embeddedAnswers || (match && match.answers);
  if (!answers || typeof answers !== "object") return result;

  const nextScores = calculateAllScores(answers);
  if (!nextScores || typeof nextScores !== "object") return result;

  return { ...result, scores: nextScores };
}

// POST /api/assessment/analyze
router.post("/analyze", (req, res) => {
  // Main submit endpoint: computes scores/recommendations and persists the result.
  try {
    const { userId, answers, smeProfile } = req.body || {};
    const result = analyzeAssessment({ userId, answers, smeProfile });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[analyze] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/assessment/result/:assessmentId
router.get("/result/:assessmentId", (req, res) => {
  // Fetch a stored assessment result (used by Summary/Recommendations pages).
  const { assessmentId } = req.params;
  if (!assessmentId) {
    return res.status(400).json({ error: "Missing assessmentId" });
  }

  const readFromJson = () => {
    // JSON storage path (fallback when Firestore is disabled/unavailable).
    ensureJsonFile(resultsPath, []);
    const results = readJsonArray(resultsPath);
    const found = results.find((r) => r && r.assessmentId === assessmentId) || null;

    // Hydrate older stored results when needed.
    let hydrated = tryBackfillRecommendationsFromJson(found);
    hydrated = tryBackfillScoresFromJson(hydrated);

    if (hydrated && hydrated !== found && !isFirestoreEnabled()) {
      // Persist updates back to JSON results.
      const idx = results.findIndex((r) => r && r.assessmentId === assessmentId);
      if (idx >= 0) {
        results[idx] = hydrated;
        writeJson(resultsPath, results);
      }
    }

    return hydrated;
  };

  if (!isFirestoreEnabled()) {
    const match = readFromJson();
    if (!match) return res.status(404).json({ error: "Assessment not found" });
    return res.json(match);
  }

  getAssessmentResultFromFirestore(assessmentId)
    .then((doc) => {
      if (doc) {
        // If Firestore includes answers, hydrate in-memory on read.
        let hydrated = tryBackfillRecommendationsFromJson(doc);
        hydrated = tryBackfillScoresFromJson(hydrated);
        return res.json(hydrated);
      }

      // Fallback for older results still in JSON
      const match = readFromJson();
      if (!match) return res.status(404).json({ error: "Assessment not found" });
      return res.json(match);
    })
    .catch((err) => {
      console.error("[firestore] read failed, falling back to JSON:", err);
      const match = readFromJson();
      if (!match) return res.status(404).json({ error: "Assessment not found" });
      return res.json(match);
    });
});

// GET /api/assessment/report/:assessmentId
// Returns: answers + per-control compliance status (including compliant controls)
router.get("/report/:assessmentId", (req, res) => {
  // Builds a report payload (profile, scores, answers, and per-control status list).
  const { assessmentId } = req.params;
  if (!assessmentId) {
    return res.status(400).json({ error: "Missing assessmentId" });
  }

  const readFromJson = () => {
    ensureJsonFile(resultsPath, []);
    ensureJsonFile(assessmentsPath, []);

    const results = readJsonArray(resultsPath);
    const assessments = readJsonArray(assessmentsPath);

    const result = results.find((r) => r && r.assessmentId === assessmentId) || null;
    const assessment = assessments.find((a) => a && a.assessmentId === assessmentId) || null;
    const answers = assessment?.answers && typeof assessment.answers === "object" ? assessment.answers : null;

    return { result, assessment, answers };
  };

  const buildPayload = ({ result, assessment, answers }) => {
    // Merge result + assessment + answers into one downloadable payload.
    if (!result) return null;
    const resolvedAnswers = answers || (result.answers && typeof result.answers === "object" ? result.answers : null);
    if (!resolvedAnswers) return null;

    const orgName = String(
      result?.smeProfile?.organizationName || assessment?.smeProfile?.organizationName || ""
    ).trim();

    // Export-specific: use the stored answers object as-is.
    // Gateway/showIf rules are handled via applicability logic so suppressed questions/controls
    // appear as N/A (and do not produce irrelevant recommendations).
    const exportAnswers = buildAnswersForExport(resolvedAnswers);

    const controlStatuses = buildControlStatusSummary(exportAnswers, {
      orgName: orgName || "The organization",
      includeSuppressed: true,
      includeGatewayQuestions: true,
    });

    // Per-question recommendations (matches UI output), including gateway-controlled follow-ups.
    const recommendations = generateRecommendations(exportAnswers, {
      orgName: orgName || "The organization",
      includeSuppressed: true,
      includeGatewayQuestions: true,
    });

    return {
      assessmentId,
      smeProfile: result.smeProfile || assessment?.smeProfile || {},
      scores: result.scores || {},
      answers: exportAnswers,
      controlStatuses,
      recommendations,
    };
  };

  if (!isFirestoreEnabled()) {
    const data = readFromJson();
    const payload = buildPayload(data);
    if (!payload) return res.status(404).json({ error: "Assessment not found" });
    return res.json(payload);
  }

  getAssessmentResultFromFirestore(assessmentId)
    .then((doc) => {
      if (doc) {
        const fromJson = readFromJson();
        const payload = buildPayload({
          result: doc,
          assessment: fromJson.assessment,
          answers:
            (doc.answers && typeof doc.answers === "object" ? doc.answers : null) ||
            fromJson.answers,
        });
        if (!payload) return res.status(404).json({ error: "Assessment not found" });
        return res.json(payload);
      }

      const data = readFromJson();
      const payload = buildPayload(data);
      if (!payload) return res.status(404).json({ error: "Assessment not found" });
      return res.json(payload);
    })
    .catch((err) => {
      console.error("[firestore] report read failed, falling back to JSON:", err);
      const data = readFromJson();
      const payload = buildPayload(data);
      if (!payload) return res.status(404).json({ error: "Assessment not found" });
      return res.json(payload);
    });
});

export default router;
