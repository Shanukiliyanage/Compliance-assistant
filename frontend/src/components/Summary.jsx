import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAssessmentReport, getAssessmentResult } from "../services/backendApi";

// Summary page for a completed assessment (scores, breakdown charts, and report download).

import mandatoryData from "../data/mandatory.json";
import organizationalData from "../data/organizational.json";
import peopleData from "../data/people.json";
import physicalData from "../data/physical.json";
import technologicalData from "../data/technological.json";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function getMandatoryItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.default)) return data.default;

  // Legacy shape support
  if (data && typeof data === "object") {
    const flattened = [];
    for (const v of Object.values(data)) {
      if (Array.isArray(v?.questions)) flattened.push(...v.questions);
    }
    if (flattened.length) return flattened;
  }

  return [];
}

function isAnnexControlKey(key, prefix) {
  if (typeof key !== "string") return false;
  if (!key.startsWith(prefix + ".")) return false;
  const rest = key.slice(prefix.length + 1);
  if (!rest) return false;
  if (rest.includes("_")) return false;
  const n = Number(rest);
  return Number.isInteger(n) && String(n) === rest;
}

function countAnnexControls(stageObject, prefix) {
  return Object.keys(stageObject || {}).filter((k) => isAnnexControlKey(k, prefix)).length;
}

function getMaturityLevelFromPercent(overallPercent) {
  const n = Number(overallPercent);
  const percent = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;

  if (percent <= 20) return "Initial";
  if (percent <= 40) return "Basic";
  if (percent <= 60) return "Developing";
  if (percent <= 80) return "Managed";
  return "Optimized";
}

function buildThreeWaySummary(counts, total) {
  if (!counts) return null;

  const fullyCount = Number(counts.yes ?? 0);
  const partialCount = Number(counts.partial ?? 0);
  const nonAssessed = Number(counts.no ?? 0);
  const assessedTotal = Number(counts.total ?? fullyCount + partialCount + nonAssessed);

  const t = Number(total || 0);
  const missing = Math.max(0, t - assessedTotal);
  const nonCount = nonAssessed + missing;

  return {
    total: t,
    fullyCount,
    partialCount,
    nonCount,
    fullyPercent: t ? Math.round((fullyCount / t) * 100) : 0,
    partialPercent: t ? Math.round((partialCount / t) * 100) : 0,
    nonPercent: t ? Math.round((nonCount / t) * 100) : 0,
  };
}

function buildAnnexSummaryWithNotApplicable(counts, total, notApplicableCount) {
  if (!counts) return null;

  const t = Number(total || 0);
  const na = Math.max(0, Number(notApplicableCount || 0));

  const fullyCount = Math.max(0, Number(counts.yes ?? 0));
  const partialCount = Math.max(0, Number(counts.partial ?? 0));

  // Backend breakdown for Annex A is computed on the "applicable" set only
  // (expected total minus NOT_APPLICABLE controls). So we derive the remaining
  // "Not compliant" bucket against the full 93 total.
  const nonCount = Math.max(0, t - na - fullyCount - partialCount);

  return {
    total: t,
    fullyCount,
    partialCount,
    nonCount,
    notApplicableCount: na,
    fullyPercent: t ? Math.round((fullyCount / t) * 100) : 0,
    partialPercent: t ? Math.round((partialCount / t) * 100) : 0,
    nonPercent: t ? Math.round((nonCount / t) * 100) : 0,
    notApplicablePercent: t ? Math.round((na / t) * 100) : 0,
  };
}

function buildPieData(summary) {
  if (!summary) return null;
  return {
    labels: [
      `Fully compliant (${summary.fullyCount})`,
      `Partially compliant (${summary.partialCount})`,
      `Not compliant (${summary.nonCount})`,
    ],
    datasets: [
      {
        data: [summary.fullyCount, summary.partialCount, summary.nonCount],
        backgroundColor: ["#16a34a", "#facc15", "#dc2626"],
        borderWidth: 0,
      },
    ],
  };
}

function buildAnnexPieData(summary) {
  if (!summary) return null;
  return {
    labels: [
      `Fully compliant (${summary.fullyCount})`,
      `Partially compliant (${summary.partialCount})`,
      `Not compliant (${summary.nonCount})`,
      `Not applicable (${summary.notApplicableCount})`,
    ],
    datasets: [
      {
        data: [
          summary.fullyCount,
          summary.partialCount,
          summary.nonCount,
          summary.notApplicableCount,
        ],
        backgroundColor: ["#16a34a", "#facc15", "#dc2626", "#6b7280"],
        borderWidth: 0,
      },
    ],
  };
}

export default function Summary() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const totals = useMemo(() => {
    const stage1Total = getMandatoryItems(mandatoryData).length;

    // ISO/IEC 27001:2022 Annex A totals are expected to be 93 in total.
    const stage2Total = countAnnexControls(organizationalData, "A5");
    const stage3Total = Array.isArray(peopleData?.controls) ? peopleData.controls.length : 0;
    const stage4Total = countAnnexControls(physicalData, "A7");
    const stage5Total = countAnnexControls(technologicalData, "A8");
    const annexATotal = stage2Total + stage3Total + stage4Total + stage5Total;

    return {
      stage1Total,
      stage2Total,
      stage3Total,
      stage4Total,
      stage5Total,
      annexATotal,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!assessmentId) return;
      setLoading(true);
      setError("");

      try {
        const result = await getAssessmentResult(assessmentId);
        if (!cancelled) setAssessment(result);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load assessment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const scores = assessment?.scores || null;

  // Backend can mark some controls as NOT_APPLICABLE; totals are adjusted accordingly.
  const adjustedTotals = useMemo(() => {
    const na2 = Number(scores?.stageScores?.stage2?.notApplicableCount ?? 0);
    const na3 = Number(scores?.stageScores?.stage3?.notApplicableCount ?? 0);
    const na4 = Number(scores?.stageScores?.stage4?.notApplicableCount ?? 0);
    const na5 = Number(scores?.stageScores?.stage5?.notApplicableCount ?? 0);

    const stage2Total = Math.max(0, totals.stage2Total - na2);
    const stage3Total = Math.max(0, totals.stage3Total - na3);
    const stage4Total = Math.max(0, totals.stage4Total - na4);
    const stage5Total = Math.max(0, totals.stage5Total - na5);

    return {
      stage1Total: totals.stage1Total,
      stage2Total,
      stage3Total,
      stage4Total,
      stage5Total,
      annexATotal: stage2Total + stage3Total + stage4Total + stage5Total,
    };
  }, [scores, totals]);

  const stageNames = {
    stage1: "Mandatory Clauses",
    stage2: "Organizational Controls",
    stage3: "People Controls",
    stage4: "Physical Controls",
    stage5: "Technological Controls",
  };

  const mandatoryCounts = scores?.complianceBreakdownMandatory?.counts || null;
  const annexCounts =
    scores?.complianceBreakdownAnnexA?.counts || scores?.complianceBreakdown?.counts || null;

  const mandatorySummary = buildThreeWaySummary(mandatoryCounts, totals.stage1Total);
  const annexNotApplicableTotal =
    Number(scores?.stageScores?.stage2?.notApplicableCount ?? 0) +
    Number(scores?.stageScores?.stage3?.notApplicableCount ?? 0) +
    Number(scores?.stageScores?.stage4?.notApplicableCount ?? 0) +
    Number(scores?.stageScores?.stage5?.notApplicableCount ?? 0);
  const annexSummary = buildAnnexSummaryWithNotApplicable(
    annexCounts,
    totals.annexATotal,
    annexNotApplicableTotal
  );

  const mandatoryPieData = buildPieData(mandatorySummary);
  const annexPieData = buildAnnexPieData(annexSummary);

  const annexAOverall = scores?.overallAnnexA || null;
  const annexAPercent = (() => {
    const totalScore = Number(annexAOverall?.totalScore ?? annexAOverall?.raw ?? 0);
    const max = Number(
      (annexAOverall?.maxPossibleScore ?? annexAOverall?.max) ?? adjustedTotals.annexATotal ?? 0
    );
    return max ? Math.round((totalScore / max) * 100) : 0;
  })();
  const annexAMaturityLevel = getMaturityLevelFromPercent(annexAPercent);

  const handleDownloadReport = async () => {
    if (!assessmentId) return;
    setDownloading(true);
    setError("");

    try {
      const report = await getAssessmentReport(assessmentId);
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assessment-${assessmentId}-report.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", background: "#07090f", color: "#f1f5f9" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", background: "#07090f", color: "#f1f5f9" }}>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "14px",
            padding: "12px 28px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #2563eb, #14b8a6)",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", background: "#07090f", color: "#f1f5f9" }}>
        <p>No assessment data found</p>
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
        {/* TOP ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate("/assessment/profile")}
            style={{
              padding: "12px 28px",
              borderRadius: "999px",
              background: "transparent",
              border: "2px solid rgba(255,255,255,0.2)",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Start New Assessment
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              padding: "12px 28px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #2563eb, #14b8a6)",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Go to Home
          </button>
        </div>

        {/* HEADER */}
        <div style={{ marginBottom: "30px", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", color: "#f1f5f9", marginBottom: "8px" }}>
            Assessment Complete
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
            Here are your ISO 27001 compliance results
          </p>
        </div>

        {/* Mandatory first */}
        {mandatorySummary && mandatoryPieData && (
          <div
            style={{
              background: "white",
              padding: "28px",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
              border: "1px solid #e5e7eb",
              marginBottom: "30px",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", marginBottom: "6px", color: "#0F172A" }}>
              Overall ISO 27001 Mandatory Clauses Compliance
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "18px" }}>
              Based on {totals.stage1Total} mandatory clauses
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: "18px",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Fully compliant</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a" }}>
                      {mandatorySummary.fullyCount} / {mandatorySummary.total} ({mandatorySummary.fullyPercent}%)
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Partially compliant</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706" }}>
                      {mandatorySummary.partialCount} / {mandatorySummary.total} ({mandatorySummary.partialPercent}%)
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Not compliant</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#dc2626" }}>
                      {mandatorySummary.nonCount} / {mandatorySummary.total} ({mandatorySummary.nonPercent}%)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}>
                <Pie data={mandatoryPieData} options={{ plugins: { legend: { position: "bottom", labels: { color: "#0F172A" } } } }} />
              </div>
            </div>
          </div>
        )}

        {/* Annex A second */}
        {annexSummary && annexPieData && (
          <div
            style={{
              background: "white",
              padding: "28px",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
              border: "1px solid #e5e7eb",
              marginBottom: "30px",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", marginBottom: "6px", color: "#0F172A" }}>
              Overall ISO 27001 Annex A Compliance
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "18px" }}>
              Based on {totals.annexATotal} total controls
            </p>
            <p style={{ color: "#0F172A", fontWeight: 700, marginBottom: "18px" }}>
              Maturity: {annexAMaturityLevel}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: "18px",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Fully compliant</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a" }}>
                      {annexSummary.fullyCount} / {annexSummary.total} ({annexSummary.fullyPercent}%)
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Partially compliant</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706" }}>
                      {annexSummary.partialCount} / {annexSummary.total} ({annexSummary.partialPercent}%)
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Not compliant</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#dc2626" }}>
                      {annexSummary.nonCount} / {annexSummary.total} ({annexSummary.nonPercent}%)
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#f9fafb" }}>
                    <p style={{ color: "#6b7280", marginBottom: "6px" }}>Not applicable</p>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#9ca3af" }}>
                      {annexSummary.notApplicableCount} / {annexSummary.total} ({annexSummary.notApplicablePercent}%)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}>
                <Pie data={annexPieData} options={{ plugins: { legend: { position: "bottom", labels: { color: "#0F172A" } } } }} />
              </div>
            </div>
          </div>
        )}

        {/* Stage Compliance */}
        {scores?.stageScores && (
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", color: "#f1f5f9" }}>
              Stage Compliance
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
              {Object.entries(scores.stageScores).map(([stageKey, stageScore]) => {
                const totalByStage = {
                  stage1: totals.stage1Total,
                  stage2: totals.stage2Total,
                  stage3: totals.stage3Total,
                  stage4: totals.stage4Total,
                  stage5: totals.stage5Total,
                };

                const isMandatoryStage = stageKey === "stage1";

                const stageTotalRaw =
                  totalByStage[stageKey] ??
                  stageScore?.breakdown?.counts?.total ??
                  0;

                const notApplicableCount = isMandatoryStage
                  ? 0
                  : Number(stageScore?.notApplicableCount ?? 0);

                // Use stageTotalRaw as the single denominator for all categories
                // so that Yes + Partial + No + Not applicable = 100%.
                const fullyCount = Math.max(0, Number(stageScore?.breakdown?.counts?.yes ?? 0));
                const partialCount = Math.max(0, Number(stageScore?.breakdown?.counts?.partial ?? 0));
                const nonCount = Math.max(0, stageTotalRaw - notApplicableCount - fullyCount - partialCount);

                const summary = stageTotalRaw
                  ? {
                      total: stageTotalRaw,
                      fullyCount,
                      partialCount,
                      nonCount,
                      fullyPercent: Math.round((fullyCount / stageTotalRaw) * 100),
                      partialPercent: Math.round((partialCount / stageTotalRaw) * 100),
                      nonPercent: Math.round((nonCount / stageTotalRaw) * 100),
                    }
                  : null;

                const notApplicablePercent = stageTotalRaw
                  ? Math.round((notApplicableCount / stageTotalRaw) * 100)
                  : 0;

                return (
                  <div
                    key={stageKey}
                    style={{
                      background: "white",
                      padding: "24px",
                      borderRadius: "16px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        color: "#0F172A",
                        marginBottom: "12px",
                        fontSize: "0.95rem",
                        fontWeight: 800,
                      }}
                    >
                      {stageNames[stageKey] || stageKey}
                    </div>

                    <div style={{ display: "grid", gap: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#6b7280" }}>Yes</span>
                        <span style={{ fontWeight: 800, color: "#16a34a" }}>
                          {Number(summary?.fullyPercent ?? 0)}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#6b7280" }}>Partial</span>
                        <span style={{ fontWeight: 800, color: "#d97706" }}>
                          {Number(summary?.partialPercent ?? 0)}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#6b7280" }}>No</span>
                        <span style={{ fontWeight: 800, color: "#dc2626" }}>
                          {Number(summary?.nonPercent ?? 0)}%
                        </span>
                      </div>

                      {!isMandatoryStage && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "#6b7280" }}>Not applicable</span>
                          <span style={{ fontWeight: 800, color: "#9ca3af" }}>
                            {Number(notApplicablePercent ?? 0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginTop: "18px",
            paddingBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "12px 28px",
              borderRadius: "999px",
              background: "transparent",
              color: "#f1f5f9",
              border: "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            Back
          </button>

          <button
            onClick={() =>
              navigate(`/assessment/recommendations/${assessmentId}`, {
                state: { assessment },
              })
            }
            style={{
              padding: "12px 28px",
              borderRadius: "999px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            View Recommendations
          </button>
        </div>
      </div>
    </div>
  );
}
