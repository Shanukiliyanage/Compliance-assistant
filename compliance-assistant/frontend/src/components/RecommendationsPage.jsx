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
  const id = String(controlId || "").trim();
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
    const questionId = rec.questionId ? String(rec.questionId) : "";
    const clauseTitle = mandatoryClauseTitles[controlId];

    // Prefer question text (more specific than control id).
    const questionTitle =
      questionId && stageId && textIndex?.get
        ? String(textIndex.get(`${stageId}::${questionId}`) || "")
        : "";

    return {
      stageId,
      controlId,
      questionId,
      complianceState,
      priority,
      title:
        questionTitle ||
        clauseTitle ||
        (questionId ? `Question ${questionId}` : controlId ? `Control ${controlId}` : "Recommendation"),
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

        const data = await getAssessmentResult(assessmentId);
        setAssessment(data);
        try {
          localStorage.setItem("assessmentResult", JSON.stringify(data));
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
              const complianceState = avg === 1 ? "FULLY_COMPLIANT" : avg >= 0.5 ? "PARTIALLY_COMPLIANT" : "NOT_COMPLIANT";
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
            : `${escapeHtml(control.controlId)} — ${escapeHtml(control.controlName || "")}`;
          body += `<h3>${heading}</h3>`;
          body += `<p><strong>Status:</strong> ${escapeHtml(complianceLabel(status?.complianceState) || "")}</p>`;
          if (priorityLabel && priorityLabel !== "NONE") {
            body += `<p><strong>Priority:</strong> ${escapeHtml(priorityLabel)}</p>`;
          }

          const qs = Array.isArray(control.questions) ? control.questions : [];
          if (qs.length) {
            body += `<table><thead><tr><th style="width:55%">Question</th><th style="width:15%">Answer</th><th>Recommendation</th></tr></thead><tbody>`;
            for (const q of qs) {
              const qid = q?.id;
              const answerValue = answers?.[stageId]?.[qid];
              const questionText = q?.question || q?.text || "";
              const applicable = isQuestionApplicable(stageId, control.controlId, q, answers);
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
              const rowRecommendationText = rowStatus?.recommendation
                ? String(rowStatus.recommendation)
                : "";

              body += `<tr>`;
              body += `<td>${escapeHtml(questionText)}</td>`;
              body += `<td>${escapeHtml(answerLabel)}</td>`;
              body += `<td>${escapeHtml(!applicable || isNotApplicableAnswer ? "N/A" : showRecForAnswer ? (rowRecommendationText || "-") : "-")}</td>`;
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
      @media print { body { margin: 12mm; } }
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
        <li><strong>Test cases:</strong> We manually tested sample answer sets (e.g., all YES, mixed, gateway exclusions) to confirm expected scores and recommendations.</li>
        <li><strong>Repeatability:</strong> The same inputs always produce the same outputs (deterministic rules).</li>
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
    // Used to show nicer titles like: "Control A.5.1 — Policies for information security".
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
    return recs.map((r) => {
      const normalized = normalizeRecommendation(r, controlNameIndex);
      const name =
        normalized.stageId && normalized.controlId
          ? controlNameIndex.get(`${normalized.stageId}::${normalized.controlId}`)
          : "";

      if (name && normalized.controlId) {
        const baseTitle = `Control ${normalized.controlId}`;
        const shouldReplaceTitle =
          !normalized.title ||
          normalized.title === baseTitle ||
          normalized.title === "Recommendation" ||
          normalized.title.startsWith(baseTitle);

        if (shouldReplaceTitle) {
          return {
            ...normalized,
            title: `${baseTitle} — ${name}`,
          };
        }
      }

      return normalized;
    });
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
        backgroundColor: "#FAF5EF",
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

          <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "1.1rem" }}>
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
                  borderLeft: `4px solid ${getCompliancePill(normalized.complianceState).borderColor}`,
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

                  {getPriorityPill(normalized.priority).label && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        backgroundColor: getPriorityPill(normalized.priority).bgColor,
                        color: getPriorityPill(normalized.priority).textColor,
                      }}
                    >
                      {getPriorityPill(normalized.priority).label}
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
