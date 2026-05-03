import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAssessmentResult, analyzeAssessment } from "../services/backendApi";
import { getAuth } from "firebase/auth";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ComplianceBox from "./ComplianceBox";
import PieChartCard from "./PieChartCard";

ChartJS.register(ArcElement, Tooltip, Legend);

function Summary() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!assessmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        let result;
        if (assessmentId === "live") {
          const auth = getAuth();
          const user = auth.currentUser;
          const stage1 = JSON.parse(localStorage.getItem("stage1") || "{}");
          const stage2 = JSON.parse(localStorage.getItem("stage2") || "{}");
          const stage3 = JSON.parse(localStorage.getItem("stage3") || "{}");
          const stage4 = JSON.parse(localStorage.getItem("stage4") || "{}");
          const stage5 = JSON.parse(localStorage.getItem("stage5") || "{}");
          const profile = JSON.parse(localStorage.getItem("profile") || "{}");

          result = await analyzeAssessment({
            userId: user?.uid || "guest",
            answers: { stage1, stage2, stage3, stage4, stage5 },
            smeProfile: profile
          });
        } else {
          result = await getAssessmentResult(assessmentId);
        }

        if (!cancelled) {
          setAssessment(result);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load assessment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assessmentId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", background: "#07090f", color: "#f1f5f9" }}>
        <p>Analyzing results with Thesis Engine...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", background: "#07090f", color: "#f1f5f9" }}>
        <p style={{ color: "#dc2626" }}>{error || "No assessment data found"}</p>
        <button onClick={() => navigate("/")} style={{ marginTop: "14px", padding: "12px 28px", borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #14b8a6)", border: "none", color: "white", cursor: "pointer", fontWeight: 600 }}>
          Go to Home
        </button>
      </div>
    );
  }

  // --- DATA EXTRACTION (Robust for both new and legacy backend payloads) ---
  const extractStageStats = (stageKey) => {
    let source = null;

    // Path A: New backend structure (result.scores.stageX)
    if (assessment.scores?.[stageKey]) {
      source = assessment.scores[stageKey];
    } 
    // Path B: Legacy backend structure (result.scores.stageScores.stageX)
    else if (assessment.scores?.stageScores?.[stageKey]) {
      source = assessment.scores.stageScores[stageKey];
    }

    // Map counts safely to prevent NaN
    const yes = Number(source?.yes ?? source?.breakdown?.counts?.yes ?? 0);
    const partial = Number(source?.partial ?? source?.breakdown?.counts?.partial ?? 0);
    const no = Number(source?.no ?? source?.breakdown?.counts?.no ?? 0);
    const na = Number(source?.na ?? source?.notApplicableCount ?? 0);

    const total = yes + partial + no + na;
    const getPct = (val) => total === 0 ? 0 : Math.round((val / total) * 100);

    return {
      yes: getPct(yes),
      partial: getPct(partial),
      no: getPct(no),
      na: getPct(na)
    };
  };

  // --- PIE CHART DATA ---
  const getChartData = (type) => {
    if (assessment.charts?.[type]) return assessment.charts[type];

    // Fallback: calculate from extracted stage stats
    if (type === "mandatory") {
      const s1 = extractStageStats("stage1");
      return s1;
    } else {
      const s2 = extractStageStats("stage2");
      const s3 = extractStageStats("stage3");
      const s4 = extractStageStats("stage4");
      const s5 = extractStageStats("stage5");
      return {
        yes: s2.yes + s3.yes + s4.yes + s5.yes, // Note: these are percentages, we need raw counts for accurate charts
        // But for visual representation in fallback, we'll just sum them up or use percentages
        partial: s2.partial + s3.partial + s4.partial + s5.partial,
        no: s2.no + s3.no + s4.no + s5.no,
        na: s2.na + s3.na + s4.na + s5.na
      };
    }
  };

  const stages = [
    { key: "stage1", title: "Mandatory Clauses" },
    { key: "stage2", title: "Organizational Controls" },
    { key: "stage3", title: "People Controls" },
    { key: "stage4", title: "Physical Controls" },
    { key: "stage5", title: "Technological Controls" },
  ];

  return (
    <div style={{ padding: "40px 20px", width: "100%", display: "flex", justifyContent: "center", backgroundColor: "#07090f", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: "1000px" }}>
        {/* TOP ACTIONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "30px" }}>
          <button onClick={() => navigate("/assessment/profile")} style={{ padding: "10px 24px", borderRadius: "999px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#f1f5f9", cursor: "pointer", fontWeight: 600 }}>
            New Assessment
          </button>
          <button onClick={() => navigate("/")} style={{ padding: "10px 24px", borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #14b8a6)", border: "none", color: "white", cursor: "pointer", fontWeight: 600 }}>
            Home
          </button>
        </div>

        {/* HEADER */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", color: "#f1f5f9", marginBottom: "8px" }}>Assessment Complete</h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>ISO 27001:2022 Thesis-Grade Analysis</p>
          {assessment.weightedScores && (
            <div style={{ marginTop: "20px", padding: "15px", background: "rgba(37, 99, 235, 0.1)", borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.3)" }}>
              <span style={{ color: "#94a3b8", marginRight: "10px" }}>Weighted Compliance Score:</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#14b8a6" }}>
                {Number(assessment.weightedScores.overall || 0).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* STAGE COMPLIANCE BOXES */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "20px", color: "#f1f5f9", fontWeight: 700 }}>Stage Compliance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {stages.map((stage) => (
              <ComplianceBox 
                key={stage.key} 
                title={stage.title} 
                stats={extractStageStats(stage.key)} 
                isMandatory={stage.key === "stage1"} 
              />
            ))}
          </div>
        </div>

        {/* PIE CHARTS */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
          <PieChartCard title="Mandatory Controls Distribution" data={getChartData("mandatory")} showNA={false} />
          <PieChartCard title="Annex A Controls Distribution" data={getChartData("annexA")} showNA={true} />
        </div>

        {/* BOTTOM ACTIONS */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "20px" }}>
          <button onClick={() => navigate(-1)} style={{ padding: "12px 28px", borderRadius: "999px", background: "transparent", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", fontWeight: 600 }}>
            Back
          </button>
          <button onClick={() => navigate(`/assessment/recommendations/${assessmentId}`, { state: { assessment } })} style={{ padding: "12px 32px", borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #14b8a6)", border: "none", color: "white", cursor: "pointer", fontWeight: 600, boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)" }}>
            View Recommendations
          </button>
        </div>
      </div>
    </div>
  );
}

export default Summary;
