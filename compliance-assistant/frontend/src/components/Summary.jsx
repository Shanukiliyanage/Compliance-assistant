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

  // --- DATA EXTRACTION ---
  const extractStageStats = (stageKey) => {
    let source = assessment.scores?.[stageKey] || assessment.scores?.stageScores?.[stageKey] || {};
    
    // Use new flat summary structure if available
    const yesCount = Number(source?.yes ?? source?.breakdown?.counts?.yes ?? 0);
    const partialCount = Number(source?.partial ?? source?.breakdown?.counts?.partial ?? 0);
    const noCount = Number(source?.no ?? source?.breakdown?.counts?.no ?? 0);
    const naCount = Number(source?.na ?? source?.notApplicableCount ?? 0);

    const total = yesCount + partialCount + noCount + naCount;
    
    // Return counts for the chart and percentages for the box
    const getPct = (val) => total === 0 ? 0 : parseFloat(((val / total) * 100).toFixed(1));

    return {
      counts: { yes: yesCount, partial: partialCount, no: noCount, na: naCount },
      percentages: {
        yes: getPct(yesCount),
        partial: getPct(partialCount),
        no: getPct(noCount),
        na: getPct(naCount)
      }
    };
  };

  const stages = [
    { key: "stage1", title: "Mandatory Clauses" },
    { key: "stage2", title: "Organizational Controls" },
    { key: "stage3", title: "People Controls" },
    { key: "stage4", title: "Physical Controls" },
    { key: "stage5", title: "Technological Controls" },
  ];

  // Prepare all stage data first to ensure sync
  const stageDataMap = {};
  stages.forEach(s => {
    stageDataMap[s.key] = extractStageStats(s.key);
  });

  // Chart data sync
  const mandatoryChartData = stageDataMap.stage1.counts;
  const annexAChartData = {
    yes: stageDataMap.stage2.counts.yes + stageDataMap.stage3.counts.yes + stageDataMap.stage4.counts.yes + stageDataMap.stage5.counts.yes,
    partial: stageDataMap.stage2.counts.partial + stageDataMap.stage3.counts.partial + stageDataMap.stage4.counts.partial + stageDataMap.stage5.counts.partial,
    no: stageDataMap.stage2.counts.no + stageDataMap.stage3.counts.no + stageDataMap.stage4.counts.no + stageDataMap.stage5.counts.no,
    na: stageDataMap.stage2.counts.na + stageDataMap.stage3.counts.na + stageDataMap.stage4.counts.na + stageDataMap.stage5.counts.na,
  };

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
                stats={stageDataMap[stage.key].percentages} 
                isMandatory={stage.key === "stage1"} 
              />
            ))}
          </div>
        </div>

        {/* PIE CHARTS */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
          <PieChartCard title="Mandatory Controls Distribution" data={mandatoryChartData} showNA={false} />
          <PieChartCard title="Annex A Controls Distribution" data={annexAChartData} showNA={true} />
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
