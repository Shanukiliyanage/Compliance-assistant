import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAssessmentReport, getAssessmentResult } from "../services/backendApi";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { extractComplianceSummary } from "../utils/scoring";
ChartJS.register(ArcElement, Tooltip, Legend);

function Summary() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
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

  // Use thesis-grade compliance results from backend
  const complianceSummary = extractComplianceSummary(assessment);

  // Pie chart data from backend
  const pieData = complianceSummary?.piePercentages
    ? {
        labels: ["Yes", "Partial", "No", "N/A"],
        datasets: [
          {
            data: [
              complianceSummary.piePercentages.YES,
              complianceSummary.piePercentages.PARTIAL,
              complianceSummary.piePercentages.NO,
              complianceSummary.piePercentages.NA,
            ],
            backgroundColor: ["#16a34a", "#facc15", "#dc2626", "#6b7280"],
            borderWidth: 0,
          },
        ],
      }
    : null;

  // Top priority gaps (recommendations)
  const topGaps = complianceSummary?.recommendations?.slice(0, 5) || [];

  // Weighted score and sector
  const weightedScore = complianceSummary?.weightedScore ?? 0;
  const sector = complianceSummary?.sector || assessment?.smeProfile?.sector || "N/A";

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
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "center", gap: "24px" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px 32px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontWeight: 700, color: "#0F172A" }}>
              <span>Sector:&nbsp;</span>{sector}
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px 32px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontWeight: 700, color: "#0F172A" }}>
              <span>Weighted Score:&nbsp;</span>{Math.round(weightedScore)}%
            </div>
          </div>
        </div>


        {/* Thesis-grade Pie Chart (Yes/Partial/No/N/A) */}
        {pieData && (
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
              Compliance Distribution
            </h2>
            <div style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}>
              <Pie data={pieData} options={{ plugins: { legend: { position: "bottom", labels: { color: "#0F172A" } } } }} />
            </div>
          </div>
        )}


        {/* Top Priority Gaps (Recommendations) */}
        {topGaps.length > 0 && (
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", color: "#f1f5f9" }}>
              Top Priority Gaps
            </h2>
            <div style={{ display: "grid", gap: "12px" }}>
              {topGaps.map((rec, idx) => (
                <div key={rec.id || idx} style={{ background: "#fff", borderRadius: "10px", padding: "16px 20px", color: "#0F172A", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <span style={{ color: "#dc2626", fontWeight: 800, marginRight: 8 }}>#{idx + 1}</span>
                  Control <b>{rec.id}</b> &mdash; Priority: <b>{rec.priority?.toFixed(2)}</b>
                </div>
              ))}
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

export default Summary;
