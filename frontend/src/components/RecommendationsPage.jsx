import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAssessmentReport, getAssessmentResult } from "../services/backendApi";

import mandatoryData from "../data/mandatory.json";
import organizationalData from "../data/organizational.json";
import peopleData from "../data/people.json";
import physicalData from "../data/physical.json";
import technologicalData from "../data/technological.json";

// Recommendations page for a completed assessment (stage filtering + report download).

const stageNames = {
  stage1: "Mandatory Clauses",
  stage2: "Organizational Controls",
  stage3: "People Controls",
  stage4: "Physical Controls",
  stage5: "Technological Controls",
};

const mandatoryClauseTitles = {
  CL4_CONTEXT: "Clause 4: Context of the Organization",
  CL5_LEADERSHIP: "Clause 5: Leadership",
  CL6_PLANNING: "Clause 6: Planning",
  CL7_SUPPORT: "Clause 7: Support",
  CL8_OPERATION: "Clause 8: Operation",
  CL9_EVALUATION: "Clause 9: Performance Evaluation",
  CL10_IMPROVEMENT: "Clause 10: Improvement",
};

const stage1ClauseOrder = {
  CL4_CONTEXT: 4,
  CL5_LEADERSHIP: 5,
  CL6_PLANNING: 6,
  CL7_SUPPORT: 7,
  CL8_OPERATION: 8,
  CL9_EVALUATION: 9,
  CL10_IMPROVEMENT: 10,
};

// Safety helper for the printable HTML report.
// Prevents user-provided strings from being treated as HTML.
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAnswerLabel(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "yes") return "YES";
  if (v === "no") return "NO";
  if (v === "partial" || v === "partially") return "PARTIAL";
  if (v === "not applicable" || v === "n/a" || v === "na") return "N/A";
  return String(value ?? "");
}

function complianceLabel(complianceState) {
  switch (String(complianceState)) {
    case "NOT_APPLICABLE":
      return "N/A";
    case "FULLY_COMPLIANT":
      return "YES";
    case "NOT_COMPLIANT":
      return "NO";
    case "PARTIALLY_COMPLIANT":
      return "PARTIAL";
    default:
      return String(complianceState || "");
  }
}

function normalizePriority(value, complianceState) {
  const v = String(value || "").trim().toUpperCase();
  if (v === "HIGH" || v === "MEDIUM" || v === "LOW" || v === "NONE") return v;

  // Backfill if backend didn't send priority
  const cs = String(complianceState || "").toUpperCase();
  if (cs === "NOT_COMPLIANT") return "HIGH";
  if (cs === "PARTIALLY_COMPLIANT") return "MEDIUM";
  return "NONE";
}

function getMajorClause(value) {
  const m = /^\s*(\d+)/.exec(String(value ?? ""));
  return m ? Number(m[1]) : NaN;
}

function getMandatoryItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.default)) return data.default;

  if (data && typeof data === "object") {
    const flattened = [];
    for (const v of Object.values(data)) {
      if (Array.isArray(v?.questions)) flattened.push(...v.questions);
    }
    if (flattened.length) return flattened;
  }

  return [];
}

function extractClause(value) {
  const s = String(value ?? "").trim();
  const m = /^(\d+(?:\.\d+)+)/.exec(s);
  return m ? m[1] : "";
}

function canonicalizeAnnexId(id) {
  const raw = String(id || "").trim();
  // Only canonicalize simple Annex IDs like A5.1, A7.14, A8.23.1
  if (!/^A\d+\.\d+(?:\.\d+)?$/.test(raw)) return raw;
  const m = /^A(\d+)\.(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!m) return raw;
  if (m[3] != null) return `A.${Number(m[1])}.${Number(m[2])}.${Number(m[3])}`;
  return `A.${Number(m[1])}.${Number(m[2])}`;
}

const STAGE2_SUPPLIER_GATEWAY_KEY = "A5.19_Gateway";
const STAGE2_SUPPLIER_GATEWAY_QID =
  organizationalData?.[STAGE2_SUPPLIER_GATEWAY_KEY]?.questions?.[0]?.id || null;
const STAGE2_SUPPLIER_DEPENDENT_CONTROLS = (
  organizationalData?.[STAGE2_SUPPLIER_GATEWAY_KEY]?.gatewayFor || []
).map(canonicalizeAnnexId);

const STAGE2_INCIDENT_INTRO_Q1_ID = "A5.24.Q1";
const STAGE2_INCIDENT_FOLLOWUP_CONTROLS = ["A5.25", "A5.26", "A5.27", "A5.28"].map(
  canonicalizeAnnexId
);

const STAGE5_NETWORK_GATEWAY_KEY = "A8.20";
const STAGE5_NETWORK_GATEWAY_QID =
  technologicalData?.[STAGE5_NETWORK_GATEWAY_KEY]?.questions?.[0]?.id || null;
const STAGE5_NETWORK_DEPENDENT_CONTROLS = (
  technologicalData?.[STAGE5_NETWORK_GATEWAY_KEY]?.gatewayFor || []
).map(canonicalizeAnnexId);

const STAGE5_SDLC_GATEWAY_KEY = "SDLC_Gateway";
const STAGE5_SDLC_GATEWAY_QID =
  technologicalData?.[STAGE5_SDLC_GATEWAY_KEY]?.questions?.[0]?.id || null;
const STAGE5_SDLC_DEPENDENT_CONTROLS = (
  technologicalData?.[STAGE5_SDLC_GATEWAY_KEY]?.gatewayFor || []
).map(canonicalizeAnnexId);

// Decide if a question should be shown / counted.
// Some controls are “gateway controlled”: if the gateway question is NO, the follow-up controls are not applicable.
function isQuestionApplicable(stageId, controlId, question, answersByStage) {
  const stageAnswers = answersByStage?.[stageId] || {};

  // Question-level conditional visibility
  const cond = question?.showIf;
  if (cond?.questionId && Object.prototype.hasOwnProperty.call(cond, "equals")) {
    if (stageAnswers?.[cond.questionId] !== cond.equals) return false;
  }

  // Stage-level gateway visibility
  if (stageId === "stage2") {
    if (STAGE2_SUPPLIER_DEPENDENT_CONTROLS.includes(controlId)) {
      const enabled = !STAGE2_SUPPLIER_GATEWAY_QID || stageAnswers?.[STAGE2_SUPPLIER_GATEWAY_QID] === "yes";
      if (!enabled) return false;
    }

    if (STAGE2_INCIDENT_FOLLOWUP_CONTROLS.includes(controlId)) {
      const enabled = stageAnswers?.[STAGE2_INCIDENT_INTRO_Q1_ID] === "yes";
      if (!enabled) return false;
    }
  }

  if (stageId === "stage5") {
    if (STAGE5_NETWORK_DEPENDENT_CONTROLS.includes(controlId)) {
      const enabled = !STAGE5_NETWORK_GATEWAY_QID || stageAnswers?.[STAGE5_NETWORK_GATEWAY_QID] === "yes";
      if (!enabled) return false;
    }

    if (STAGE5_SDLC_DEPENDENT_CONTROLS.includes(controlId)) {
      const enabled = !STAGE5_SDLC_GATEWAY_QID || stageAnswers?.[STAGE5_SDLC_GATEWAY_QID] === "yes";
      if (!enabled) return false;
    }
  }

  return true;
}


function getStage1Controls() {
  // mandatory.json is an array; keys are clause strings like "4.1".
  const items = getMandatoryItems(mandatoryData);
  const clauseMap = {
    4: { controlId: "CL4_CONTEXT", controlName: "Clause 4: Context of the Organization", questions: [] },
    5: { controlId: "CL5_LEADERSHIP", controlName: "Clause 5: Leadership", questions: [] },
    6: { controlId: "CL6_PLANNING", controlName: "Clause 6: Planning", questions: [] },
    7: { controlId: "CL7_SUPPORT", controlName: "Clause 7: Support", questions: [] },
    8: { controlId: "CL8_OPERATION", controlName: "Clause 8: Operation", questions: [] },
    9: { controlId: "CL9_EVALUATION", controlName: "Clause 9: Performance Evaluation", questions: [] },
    10: { controlId: "CL10_IMPROVEMENT", controlName: "Clause 10: Improvement", questions: [] },
  };

  for (const q of items) {
    const clause = String(q?.clause ?? extractClause(q?.id) ?? "").trim();
    const major = getMajorClause(clause);
    if (!Number.isFinite(major)) continue;
    const group = clauseMap[major];
    if (!group) continue;
    group.questions.push({
      id: String(q?.clause ? clause : (q?.id ?? clause)).trim(),
      question: q?.question ?? q?.text,
      explanation: q?.explanation ?? q?.helpText,
    });
  }

  return Object.values(clauseMap);
}

function mapStageObjectToControls(stageObject) {
  // Converts stage JSON (object keyed by controlId) into a consistent array shape.
  return Object.entries(stageObject || {}).map(([controlId, entry]) => ({
    controlId: canonicalizeAnnexId(controlId),
    controlName: entry?.control || controlId,
    questions: Array.isArray(entry?.questions) ? entry.questions : [],
  }));
}

function getAllStageControls() {
  // Builds a single “control list” for every stage so we can:
  // - display control names
  // - print all questions + answers in the report
  return {
    stage1: getStage1Controls(),
    stage2: mapStageObjectToControls(organizationalData),
    stage3: Array.isArray(peopleData?.controls)
      ? peopleData.controls.map((c) => ({
          controlId: c?.controlId,
          controlName: c?.controlName,
          questions: Array.isArray(c?.questions) ? c.questions : [],
        }))
      : [],
    stage4: mapStageObjectToControls(physicalData),
    stage5: mapStageObjectToControls(technologicalData),
  };
}

function parseAnnexControlOrder(controlId) {
  const id = String(controlId || "").trim();
  // Matches: A.5.14, A.7.3, A.5.23.1
  const m = /^A\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(id);
  if (!m) return null;
  const parts = [Number(m[1]), Number(m[2])];
  if (m[3] != null) parts.push(Number(m[3]));
  return parts.every((n) => Number.isFinite(n)) ? parts : null;
}

function parseMandatoryQuestionOrder(controlId) {
  // Matches: 4.1, 6.1.3, 10.2
  const id = String(controlId || "")
    .trim()
    .replace(/[._-]Q\d+$/i, "");
  const m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(id);
  if (!m) return null;
  const parts = [Number(m[1])];
  if (m[2] != null) parts.push(Number(m[2]));
  if (m[3] != null) parts.push(Number(m[3]));
  return parts.every((n) => Number.isFinite(n)) ? parts : null;
}

function compareLexicographicNumberArrays(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    if (av == null && bv == null) return 0;
    if (av == null) return -1;
    if (bv == null) return 1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function compareBySeverity(a, b) {
  // Sort NOT_COMPLIANT before PARTIALLY_COMPLIANT.
  // (If backend didn’t provide complianceState, fall back to old "severity" field.)
  const rank = (rec) => {
    const cs = String(rec?.complianceState || "").toUpperCase();
    if (cs === "NOT_COMPLIANT") return 0;
    if (cs === "PARTIALLY_COMPLIANT") return 1;
    // Fallback for older shapes
    return String(rec?.severity).toLowerCase() === "high" ? 0 : 1;
  };
  return rank(a) - rank(b);
}

function parseQuestionNumberFromId(value) {
  // Matches suffixes like ".Q2", "_Q2", "-Q2".
  const s = String(value || "").trim();
  const m = /[._-]Q(\d+)$/i.exec(s);
  return m ? Number(m[1]) : null;
}

function getStageIdFromRecommendation(rec) {
  if (!rec || typeof rec !== "object") return "";

  const raw = rec.stageId || rec.stage || rec.stageKey || rec.stageName;
  if (!raw) return "";

  const s = String(raw).trim().toLowerCase();

  // Common variants
  if (s === "stage1" || s === "1" || s.includes("mandatory")) return "stage1";
  if (s === "stage2" || s === "2" || s.includes("organiz")) return "stage2";
  if (s === "stage3" || s === "3" || s.includes("people")) return "stage3";
  if (s === "stage4" || s === "4" || s.includes("physical")) return "stage4";
  if (s === "stage5" || s === "5" || s.includes("technolog")) return "stage5";

  // If backend already gave stageId but in different case
  if (s.startsWith("stage")) return s;

  return "";
}

function normalizeRecommendation(rec, textIndex) {
  // Normalizes backend vs older UI recommendation formats into one shape for rendering.
  // Support both old UI shape and current backend shape:
  // - backend: { controlId, stageId, complianceState, recommendation }
  // - older:  { severity, title/message, description, stage }
  if (!rec || typeof rec !== "object") {
    return {
      stageId: "",
      controlId: "",
      complianceState: "",
      title: "Recommendation",
      subtitle: "",
      description: "",
      stageLabel: "",
    };
  }

  if (typeof rec.recommendation === "string") {
    const complianceState = String(rec.complianceState || "");
    const priority = normalizePriority(rec.priority, complianceState);
    const stageId = getStageIdFromRecommendation(rec);
    const stageLabel = stageId ? stageNames[stageId] || String(rec.stageId) : "";

    const controlId = rec.controlId ? String(rec.controlId) : "";
    // Skip stale/malformed recommendations with no real control identifier.
    if (!controlId || controlId === "undefined") return null;
    const questionId = rec.questionId ? String(rec.questionId) : "";
    const clauseTitle = mandatoryClauseTitles[controlId];

    // Prefer question text (more specific than control id).
    const questionTitle =
      questionId && stageId && textIndex?.get
        ? String(textIndex.get(`${stageId}::${questionId}`) || "")
        : "";

    const parseQuestionNumber = (qid) => {
      const s = String(qid || "").trim();
      const m = /(?:^|[._-])Q(\d+)$/i.exec(s);
      return m ? Number(m[1]) : null;
    };

    // Stage 1 legacy ids like "6.1.Q2" need mapping to the real clause question text.
    // We keep the *displayed control* as the base ("6.1"), but fetch the correct question
    // from mandatory.json (e.g. 6.1.Q2 maps to clause 6.2).
    const stage1LegacyMap = {
      "4.1": { 1: "4.2", 2: "4.3", 3: "4.1" },
      "5.1": { 1: "5.1", 2: "5.2" },
      "6.1": { 1: "6.1", 2: "6.2" },
      "7.1": { 1: "7.1", 2: "7.2", 3: "7.3" },
      "8.1": { 1: "8.1", 2: "8.2" },
      "9.1": { 1: "9.1", 2: "9.2" },
      "10.1": { 1: "10.1", 2: "10.2" },
    };

    // Stage 1: show full clause title (e.g. "Clause 5: Leadership"), not sub-numbers.
    if (stageId === "stage1") {
      const idStr = String(controlId || "").trim();

      const clauseFullTitles = {
        "4": "Clause 4: Context of the Organization",
        "5": "Clause 5: Leadership",
        "6": "Clause 6: Planning",
        "7": "Clause 7: Support",
        "8": "Clause 8: Operation",
        "9": "Clause 9: Performance Evaluation",
        "10": "Clause 10: Improvement",
      };

      // Build question ordinal map (clause id → 1-based position within its clause group)
      // so that "4.2" shows as Q1, "4.3" as Q2, "5.1" as Q1, etc.
      const clauseOrdinalMap = (() => {
        const items = getMandatoryItems(mandatoryData);
        const grouped = {};
        for (const q of items) {
          const cl = String(q?.clause ?? "").trim();
          const maj = getMajorClause(cl);
          if (!Number.isFinite(maj)) continue;
          if (!grouped[maj]) grouped[maj] = [];
          grouped[maj].push(cl);
        }
        const map = {};
        for (const list of Object.values(grouped)) {
          list.forEach((cl, idx) => { map[cl] = idx + 1; });
        }
        return map;
      })();

      // Path A: question-level ids like "5.1.Q2" or "6.1.Q1".
      const m = /^(\d+)\.(\d+)[._-]Q(\d+)$/i.exec(idStr);
      if (m) {
        const majorClause = m[1];
        const base = `${m[1]}.${m[2]}`;
        const qn = Number(m[3]);
        const mappedClause = stage1LegacyMap?.[base]?.[qn] || base;
        const mappedQuestionText =
          mappedClause && textIndex?.get
            ? String(textIndex.get(`${stageId}::${mappedClause}`) || "")
            : "";
        const displayQn = clauseOrdinalMap[mappedClause] ?? qn;

        return {
          stageId,
          controlId,
          questionId: idStr,
          complianceState,
          priority,
          title: clauseFullTitles[majorClause] || `Clause ${majorClause}:`,
          subtitle: mappedQuestionText ? `Q${displayQn} - ${mappedQuestionText}` : `Q${displayQn}`,
          description: rec.recommendation,
          stageLabel,
        };
      }

      // Path B: plain clause ids like "5.1", "5.2", "4.2", "4.3".
      const n = /^(\d+)\.(\d+)$/.exec(idStr);
      if (n) {
        const majorClause = n[1];
        const displayQn = clauseOrdinalMap[idStr] ?? Number(n[2]);
        const qText = textIndex?.get ? String(textIndex.get(`${stageId}::${idStr}`) || "") : "";
        return {
          stageId,
          controlId,
          questionId: idStr,
          complianceState,
          priority,
          title: clauseFullTitles[majorClause] || `Clause ${majorClause}:`,
          subtitle: qText ? `Q${displayQn} - ${qText}` : `Q${displayQn}`,
          description: rec.recommendation,
          stageLabel,
        };
      }
    }

    return {
      stageId,
      controlId,
      questionId,
      complianceState,
      priority,
      title: controlId ? `Control ${controlId}.` : clauseTitle || "Recommendation",
      subtitle: questionTitle
        ? `${parseQuestionNumber(questionId) ? `Q${parseQuestionNumber(questionId)} - ` : ""}${questionTitle}`
        : "",
      description: rec.recommendation,
      stageLabel,
    };
  }

  const stageId = getStageIdFromRecommendation(rec);
  const inferredComplianceState =
    typeof rec.complianceState === "string" && rec.complianceState
      ? String(rec.complianceState)
      : String(rec.severity || "").toLowerCase() === "high"
        ? "NOT_COMPLIANT"
        : "PARTIALLY_COMPLIANT";
  const priority = normalizePriority(rec.priority, inferredComplianceState);
  return {
    stageId,
    controlId: rec.controlId ? String(rec.controlId) : "",
    complianceState: inferredComplianceState,
    priority,
    title: rec.title || rec.message || "Recommendation",
    subtitle: "",
    description: rec.description || "",
    stageLabel: stageId ? stageNames[stageId] || "" : (rec.stageLabel || rec.stage || rec.stageName || ""),
  };
}

function getPriorityPill(priority) {
  const p = String(priority || "").toUpperCase();
  if (p === "HIGH") return { label: "HIGH PRIORITY", bgColor: "#fee2e2", textColor: "#dc2626" };
  if (p === "MEDIUM") return { label: "MEDIUM PRIORITY", bgColor: "#fef3c7", textColor: "#d97706" };
  return { label: "", bgColor: "#f3f4f6", textColor: "#0F172A" };
}

function getCompliancePill(complianceState) {
  // UI styling helper: decides the pill label + colors based on compliance state.
  const cs = String(complianceState || "").toUpperCase();
  if (cs === "NOT_COMPLIANT") {
    return {
      label: "NOT COMPLIANT",
      borderColor: "#dc2626",
      bgColor: "#fee2e2",
      textColor: "#dc2626",
    };
  }
  if (cs === "PARTIALLY_COMPLIANT") {
    return {
      label: "PARTIALLY COMPLIANT",
      borderColor: "#f59e0b",
      bgColor: "#fef3c7",
      textColor: "#d97706",
    };
  }
  return {
    label: "",
    borderColor: "#e5e7eb",
    bgColor: "#f3f4f6",
    textColor: "#0F172A",
  };
}

export default function RecommendationsPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // assessment = the result object returned by backend (scores + recommendations + metadata)
  const [assessment, setAssessment] = useState(location?.state?.assessment || null);
  const [selectedStage, setSelectedStage] = useState("stage1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else if (assessmentId) {
      navigate(`/assessment/summary/${assessmentId}`);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        // Quick UX: show cached result immediately if it matches this assessmentId.
        // Still fetch fresh data from backend right after.
        const cached = localStorage.getItem("assessmentResult");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!assessmentId || parsed?.assessmentId === assessmentId) {
            setAssessment(parsed);
          }
        }

        if (!assessmentId) {
          setError("Assessment ID not found");
          return;
        }

        const [result, report] = await Promise.all([
          getAssessmentResult(assessmentId),
          getAssessmentReport(assessmentId).catch(() => null),
        ]);

        const merged = {
          ...(result && typeof result === "object" ? result : {}),
          ...(report && typeof report === "object" ? { report } : {}),
        };

        // Prefer live recommendations from the report endpoint.
        if (report && Array.isArray(report?.recommendations)) {
          merged.recommendations = report.recommendations;
        }

        setAssessment(merged);
        try {
          localStorage.setItem("assessmentResult", JSON.stringify(merged));
        } catch {
          // Ignore storage failures (e.g., privacy mode)
        }
      } catch (err) {
        // Do not fall back to cached localStorage results here.
        // Cached results can be stale and show outdated recommendation templates.
        setAssessment(null);
        setError("Error loading assessment: " + (err?.message || String(err)));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  const handleDownloadReport = async () => {
    // Fetch a “report” from backend (answers + per-control compliance + recommendations),
    // then build a printable HTML page and trigger the browser print dialog.
    setDownloading(true);
    setError("");

    try {
      const report = await getAssessmentReport(assessmentId);
      const controlsByStage = getAllStageControls();
      const answers = report?.answers || {};

      // Use the same per-question recommendation source as the UI.
      // The report endpoint returns controlStatuses, which may be aggregated by control.
      // `report.recommendations` is computed live from answers (preferred).
      const recommendationIndex = new Map();
      let recommendationSource = Array.isArray(report?.recommendations)
        ? report.recommendations
        : Array.isArray(assessment?.recommendations)
          ? assessment.recommendations
          : [];
      if (!recommendationSource.length) {
        try {
          const fresh = await getAssessmentResult(assessmentId);
          recommendationSource = Array.isArray(fresh?.recommendations)
            ? fresh.recommendations
            : [];
        } catch {
          // Ignore: export will fall back to controlStatuses.
        }
      }

      for (const r of recommendationSource) {
        if (!r || typeof r !== "object") continue;
        const stageId = String(r.stageId || "").trim();
        if (!stageId) continue;

        const recText = r.recommendation != null ? String(r.recommendation) : "";
        if (!recText.trim()) continue;

        // stage1: backend uses `controlId` as the question id (e.g. "6.1" or "6.1.Q2")
        // stage2-5: backend sets `{ controlId: baseControlId, questionId: originalQuestionId }`
        const qid = String((r.questionId || r.controlId) ?? "").trim();
        if (!qid) continue;
        recommendationIndex.set(`${stageId}::${qid}`, recText);
      }

      const parseQuestionNumberForReport = (qid) => {
        const s = String(qid || "").trim();
        const m = /(?:^|[._-])Q(\d+)$/i.exec(s) || /_Q(\d+)$/i.exec(s);
        return m ? Number(m[1]) : null;
      };

      const badgeClassForLabel = (label) => {
        switch (String(label || "").trim().toUpperCase()) {
          case "YES":
            return "badge badge-yes";
          case "NO":
            return "badge badge-no";
          case "PARTIAL":
            return "badge badge-partial";
          case "N/A":
            return "badge badge-na";
          case "HIGH":
            return "badge badge-no";
          case "MEDIUM":
            return "badge badge-partial";
          case "LOW":
            return "badge badge-low";
          default:
            return "badge";
        }
      };

      const getRecommendationForQuestionRow = ({ stageId, qidStr }) => {
        const keyStage = String(stageId || "").trim();
        const qKey = String(qidStr || "").trim();
        if (!keyStage || !qKey) return "";

        const direct = recommendationIndex.get(`${keyStage}::${qKey}`);
        if (direct) return direct;

        // Gateway questions (e.g. A5.19.GW1) typically correspond to the control's Q1.
        const gwAlias = qKey.replace(/\.GW\d+$/i, ".Q1");
        if (gwAlias !== qKey) {
          const hit = recommendationIndex.get(`${keyStage}::${gwAlias}`);
          if (hit) return hit;
        }

        if (keyStage === "stage1") {
          const clause = extractClause(qKey) || qKey;
          if (clause !== qKey) {
            const clauseHit = recommendationIndex.get(`${keyStage}::${clause}`);
            if (clauseHit) return clauseHit;
          }

          // Legacy variants some data used.
          const q1 = recommendationIndex.get(`${keyStage}::${clause}.Q1`);
          if (q1) return q1;
          const q2 = recommendationIndex.get(`${keyStage}::${clause}.Q2`);
          if (q2) return q2;
          const q3 = recommendationIndex.get(`${keyStage}::${clause}.Q3`);
          if (q3) return q3;
        }

        return "";
      };

      const formatQuestionCellHtml = ({ stageId, control, qid, questionText }) => {
        // Match the on-screen “written way”:
        // Control X.
        // Qn - <question>
        const qidStr = String(qid || "").trim();
        const qText = String(questionText || "").trim();

        if (stageId === "stage1") {
          const clauseId = extractClause(qidStr) || qidStr;
          const label = clauseId ? `Control ${clauseId}.` : "Control";
          return `${escapeHtml(label)}<br/><span style="color:#111827">${escapeHtml(`Q1 - ${qText || clauseId || ""}`)}</span>`;
        }

        const controlId = String(control?.controlId || "").trim();
        const qn = parseQuestionNumberForReport(qidStr);
        const label = controlId ? `Control ${controlId}.` : "Control";
        const qLine = qText ? `${qn ? `Q${qn} - ` : ""}${qText}` : qidStr;
        return `${escapeHtml(label)}<br/><span style="color:#111827">${escapeHtml(qLine)}</span>`;
      };

      const statusIndex = new Map(
        (report?.controlStatuses || []).map((s) => [`${s.stageId}::${s.controlId}`, s])
      );

      const orgName = report?.smeProfile?.organizationName || "";
      const generatedAt = new Date().toLocaleString();

      let body = "";
      const stageOrder = ["stage1", "stage2", "stage3", "stage4", "stage5"];

      for (const stageId of stageOrder) {
        const stageControls = controlsByStage[stageId] || [];
        if (!stageControls.length) continue;

        body += `<h2>${escapeHtml(stageNames[stageId] || stageId)}</h2>`;

        for (const control of stageControls) {
          if (!control?.controlId) continue;
          let status = statusIndex.get(`${stageId}::${control.controlId}`);

          // Stage 1 is displayed as clause groups (CL7_SUPPORT), but backend can return per-question
          // statuses instead (e.g., "7.3" or "7.3.Q1"). If the clause status is missing, compute it
          // from the questions under this clause.
          if (stageId === "stage1" && !status && Array.isArray(control?.questions)) {
            const scoreFor = (cs) => {
              const s = String(cs || "").toUpperCase();
              if (s === "FULLY_COMPLIANT") return 1;
              if (s === "PARTIALLY_COMPLIANT") return 0.5;
              if (s === "NOT_COMPLIANT") return 0;
              return null;
            };

            const scores = [];
            for (const q of control.questions) {
              const qid = String(q?.id || "").trim();
              if (!qid) continue;
              const qidClause = extractClause(qid) || qid;
              const s =
                statusIndex.get(`${stageId}::${qid}`) ||
                (qidClause !== qid ? statusIndex.get(`${stageId}::${qidClause}`) : null);
              const v = scoreFor(s?.complianceState);
              if (v != null) scores.push(v);
            }

            if (scores.length) {
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
              const complianceState = avg === 1 ? "FULLY_COMPLIANT" : avg > 0 ? "PARTIALLY_COMPLIANT" : "NOT_COMPLIANT";
              status = {
                stageId,
                controlId: control.controlId,
                complianceState,
                priority: normalizePriority(null, complianceState),
                recommendation: null,
              };
            }
          }

          const recommendationText = status?.recommendation ? String(status.recommendation) : "";
          const priorityLabel = normalizePriority(status?.priority, status?.complianceState);

          body += `<section class="control">`;
          const isStage1Clause = stageId === "stage1" && /^CL\d+_/i.test(String(control.controlId));
          const heading = isStage1Clause
            ? `${escapeHtml(control.controlName || "")}`
            : `${escapeHtml(control.controlId)} - ${escapeHtml(control.controlName || "")}`;
          body += `<h3>${heading}</h3>`;
          const statusLabel = complianceLabel(status?.complianceState) || "";
          body += `<p><strong>Status:</strong> <span class="${badgeClassForLabel(statusLabel)}">${escapeHtml(statusLabel)}</span></p>`;
          if (priorityLabel && priorityLabel !== "NONE") {
            body += `<p><strong>Priority:</strong> <span class="${badgeClassForLabel(priorityLabel)}">${escapeHtml(priorityLabel)}</span></p>`;
          }

          const qs = Array.isArray(control.questions) ? control.questions : [];
          if (qs.length) {
            body += `<table><thead><tr><th style="width:55%">Question</th><th style="width:15%">Answer</th><th>Recommendation</th></tr></thead><tbody>`;
            for (const q of qs) {
              const qid = q?.id;
              const applicableByRules = isQuestionApplicable(stageId, control.controlId, q, answers);
              let answerValue = answers?.[stageId]?.[qid];
              // If a question was hidden by a gateway/showIf rule, treat it as NOT APPLICABLE
              // in the exported report (so we don't show irrelevant recommendations).
              if ((answerValue == null || answerValue === "") && !applicableByRules) {
                answerValue = "na";
              }
              const questionText = q?.question || q?.text || "";
              const answerLabel = normalizeAnswerLabel(answerValue);
              const showRecForAnswer = answerLabel === "NO" || answerLabel === "PARTIAL";
              const isNotApplicableAnswer = answerLabel === "N/A";

              // Stage 1 is grouped for display (Clause 4–10), but recommendations must be per-question.
              const qidStr = String(qid || "").trim();
              const qidClause = extractClause(qidStr) || qidStr;
              const rowStatus =
                stageId === "stage1" && qidStr
                  ? statusIndex.get(`${stageId}::${qidStr}`) ||
                    (qidClause !== qidStr ? statusIndex.get(`${stageId}::${qidClause}`) : null) ||
                    status
                  : status;
              // Prefer per-question recommendation; fallback to backend controlStatus.
              let rowRecommendationText = getRecommendationForQuestionRow({
                stageId,
                qidStr: qidStr || qidClause,
              });
              if (!rowRecommendationText) rowRecommendationText = rowStatus?.recommendation ? String(rowStatus.recommendation) : "";

              body += `<tr>`;
              body += `<td>${formatQuestionCellHtml({ stageId, control, qid, questionText })}</td>`;
              body += `<td><span class="${badgeClassForLabel(answerLabel)}">${escapeHtml(answerLabel)}</span></td>`;
              body += `<td>${escapeHtml(isNotApplicableAnswer ? "-" : showRecForAnswer ? (rowRecommendationText || "-") : "-")}</td>`;
              body += `</tr>`;
            }
            body += `</tbody></table>`;
          } else {
            // If there are no questions to render, still show recommendation at control level.
            body += `<p><strong>Recommendation:</strong> ${escapeHtml(recommendationText || "-")}</p>`;
          }

          body += `</section>`;
        }
      }

      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Compliance Assessment Report</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
      h1 { margin: 0 0 8px; }
      h2 { margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
      .meta { color: #444; margin-bottom: 18px; }
      .control { margin: 14px 0 18px; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0 8px; }
      th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
      th { background: #f5f5f5; text-align: left; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; line-height: 1.4; border: 2px solid #e5e7eb; background: #f9fafb; color: #111827; white-space: nowrap; }
      /* Strong, print-friendly color coding for YES/NO/PARTIAL */
      .badge-yes { background: #dcfce7; border-color: #166534; color: #166534; box-shadow: inset 6px 0 0 #16a34a; }
      .badge-no { background: #fee2e2; border-color: #991b1b; color: #991b1b; box-shadow: inset 6px 0 0 #dc2626; }
      .badge-partial { background: #fef9c3; border-color: #854d0e; color: #854d0e; box-shadow: inset 6px 0 0 #ca8a04; }
      .badge-na { background: #e5e7eb; border-color: #d1d5db; color: #374151; }
      .badge-low { background: #dbeafe; border-color: #bfdbfe; color: #1e40af; }
      @media print {
        body { margin: 12mm; }
        /* Ask the browser to preserve colors when printing to PDF */
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <h1>Compliance Assessment Report</h1>
    <div class="meta">
      <div><strong>Assessment ID:</strong> ${escapeHtml(assessmentId)}</div>
      <div><strong>Organization:</strong> ${escapeHtml(orgName)}</div>
      <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
    </div>

    <h2>Validation (How we checked it)</h2>
    <div class="meta">
      <ul>
        <li><strong>ISO alignment:</strong> Questions are grouped by ISO clauses (Stage 1) and Annex A controls (Stages 2–5).</li>
        <li><strong>Rule checks:</strong> Control compliance is computed consistently from YES/PARTIAL/NO answers, then scoring/recommendations use that output.</li>
      </ul>
    </div>
    ${body}
    <script>
      window.print();
    </script>
  </body>
</html>`;

      const w = window.open("", "_blank");
      if (!w) throw new Error("Popup blocked. Please allow popups to download the report.");
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err) {
      setError("Error generating report: " + (err?.message || String(err)));
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const controlNameIndex = useMemo(() => {
    // Lookup table: (stageId + controlId) -> controlName.
    // Used to show nicer titles like: "Control A.5.1 - Policies for information security".
    const index = new Map();
    const controlsByStage = getAllStageControls();

    for (const [stageId, controls] of Object.entries(controlsByStage || {})) {
      for (const c of controls || []) {
        if (!c?.controlId) continue;
        const name = String(c?.controlName || "").trim();
        if (!name) continue;
        index.set(`${stageId}::${String(c.controlId).trim()}`, name);

        // Add a lookup from each question id (e.g., "4.1", "A5.1.Q1") to the question text.
        if (Array.isArray(c?.questions)) {
          for (const q of c.questions) {
            const qid = String(q?.id || "").trim();
            const qText = String(q?.question || q?.text || "").trim();
            if (qid && qText) index.set(`${stageId}::${qid}`, qText);
          }
        }
      }
    }

    return index;
  }, []);

  const normalizedRecommendations = useMemo(() => {
    // Convert raw backend recommendations into a stable UI shape.
    const recs = Array.isArray(assessment?.recommendations) ? assessment.recommendations : [];
    return recs.map((r) => normalizeRecommendation(r, controlNameIndex)).filter(Boolean);
  }, [assessment, controlNameIndex]);

  const stageCounts = useMemo(() => {
    // Used for stage tab badges: "Stage 2 (3)".
    const counts = { stage1: 0, stage2: 0, stage3: 0, stage4: 0, stage5: 0 };
    for (const rec of normalizedRecommendations) {
      if (rec?.stageId && counts[rec.stageId] != null) counts[rec.stageId] += 1;
    }
    return counts;
  }, [normalizedRecommendations]);

  useEffect(() => {
    // If current stage has no recs, auto-pick first stage with recs.
    const order = ["stage1", "stage2", "stage3", "stage4", "stage5"];
    if (stageCounts[selectedStage] > 0) return;
    const firstWithRecs = order.find((s) => stageCounts[s] > 0);
    if (firstWithRecs) setSelectedStage(firstWithRecs);
  }, [stageCounts, selectedStage]);

  const filtered = useMemo(() => {
    // Show only one stage at a time, and sort controls in a human-friendly order.
    const list = normalizedRecommendations.filter((r) => r.stageId === selectedStage);

    return list.sort((a, b) => {
      // Primary: stage-specific order
      if (selectedStage === "stage1") {
        const aLegacyOrder = stage1ClauseOrder[a?.controlId] ?? null;
        const bLegacyOrder = stage1ClauseOrder[b?.controlId] ?? null;
        if (aLegacyOrder != null || bLegacyOrder != null) {
          const ao = aLegacyOrder ?? 999;
          const bo = bLegacyOrder ?? 999;
          if (ao !== bo) return ao - bo;
        } else {
          const aParts = parseMandatoryQuestionOrder(a?.controlId);
          const bParts = parseMandatoryQuestionOrder(b?.controlId);
          if (aParts && bParts) {
            const c = compareLexicographicNumberArrays(aParts, bParts);
            if (c !== 0) return c;
          } else if (aParts && !bParts) {
            return -1;
          } else if (!aParts && bParts) {
            return 1;
          }
        }
        const sev = compareBySeverity(a, b);
        if (sev !== 0) return sev;

        // If multiple questions exist under the same clause (legacy ids like "6.1.Q1"),
        // keep them in Q1, Q2, Q3 order.
        const aq = parseQuestionNumberFromId(a?.questionId || a?.controlId);
        const bq = parseQuestionNumberFromId(b?.questionId || b?.controlId);
        if (aq != null || bq != null) {
          const ao = aq ?? 999;
          const bo = bq ?? 999;
          if (ao !== bo) return ao - bo;
        }

        return String(a?.title || "").localeCompare(String(b?.title || ""));
      }

      const aParts = parseAnnexControlOrder(a?.controlId);
      const bParts = parseAnnexControlOrder(b?.controlId);
      if (aParts && bParts) {
        const c = compareLexicographicNumberArrays(aParts, bParts);
        if (c !== 0) return c;
      } else if (aParts && !bParts) {
        return -1;
      } else if (!aParts && bParts) {
        return 1;
      }

      // Secondary: within the same Annex A control, order by question number (Q1, Q2, ...)
      // so that e.g. A5.1.Q1 appears before A5.1.Q2.
      const aq = parseQuestionNumberFromId(a?.questionId || a?.controlId);
      const bq = parseQuestionNumberFromId(b?.questionId || b?.controlId);
      if (aq != null || bq != null) {
        const ao = aq ?? 999;
        const bo = bq ?? 999;
        if (ao !== bo) return ao - bo;
      }

      const sev = compareBySeverity(a, b);
      if (sev !== 0) return sev;
      return String(a?.title || "").localeCompare(String(b?.title || ""));
    });
  }, [normalizedRecommendations, selectedStage]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "red" }}>
        <p>{error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "40px 20px",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        backgroundColor: "#07090f",
        minHeight: "100vh",
      }}
    >
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={handleBack}
            style={{
              padding: "12px 24px",
              borderRadius: "999px",
              background: "white",
              border: "2px solid #2563eb",
              color: "#2563eb",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Back
          </button>

          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1.1rem" }}>
            Recommendations
          </div>

          <button
            onClick={handleDownloadReport}
            disabled={loading || downloading}
            style={{
              padding: "12px 18px",
              borderRadius: "999px",
              background: "#2563eb",
              border: "none",
              color: "white",
              cursor: downloading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "0.95rem",
              opacity: downloading ? 0.8 : 1,
            }}
            title="Opens a printable report (Save as PDF)"
          >
            {downloading ? "Preparing…" : "Download Report"}
          </button>
        </div>

        <div style={{ marginTop: "22px", marginBottom: "18px" }}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {(["stage1", "stage2", "stage3", "stage4", "stage5"]).map((stageId) => {
              const active = selectedStage === stageId;
              return (
                <button
                  key={stageId}
                  onClick={() => setSelectedStage(stageId)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: active ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    background: active ? "white" : "#f3f4f6",
                    color: "#0F172A",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}
                >
                  {stageNames[stageId]} ({stageCounts[stageId] || 0})
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                borderLeft: "4px solid #e5e7eb",
              }}
            >
              <p style={{ color: "#0F172A", fontWeight: 700, marginBottom: "6px" }}>
                No recommendations for this stage
              </p>
              <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                Select another stage to view its recommendations.
              </p>
            </div>
          ) : (
            filtered.map((normalized, idx) => (
              <div
                key={`${selectedStage}-${normalized.controlId || normalized.title || "rec"}-${idx}`}
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                  borderLeft: `4px solid ${normalized.stageId === "stage1" ? "#dc2626" : getCompliancePill(normalized.complianceState).borderColor}`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backgroundColor: getCompliancePill(normalized.complianceState).bgColor,
                      color: getCompliancePill(normalized.complianceState).textColor,
                    }}
                  >
                    {getCompliancePill(normalized.complianceState).label}
                  </span>

                  {getPriorityPill(normalized.stageId === "stage1" ? "HIGH" : normalized.priority).label && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        backgroundColor: getPriorityPill(normalized.stageId === "stage1" ? "HIGH" : normalized.priority).bgColor,
                        color: getPriorityPill(normalized.stageId === "stage1" ? "HIGH" : normalized.priority).textColor,
                      }}
                    >
                      {getPriorityPill(normalized.stageId === "stage1" ? "HIGH" : normalized.priority).label}
                    </span>
                  )}

                  {normalized.stageLabel && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        backgroundColor: "#f3f4f6",
                        color: "#0F172A",
                      }}
                    >
                      {normalized.stageLabel}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    color: "#0F172A",
                    fontSize: "1rem",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  {normalized.title}
                </p>

                {normalized.subtitle && (
                  <p
                    style={{
                      color: "#0F172A",
                      fontSize: "0.95rem",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    {normalized.subtitle}
                  </p>
                )}

                {normalized.description && (
                  <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    {normalized.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
