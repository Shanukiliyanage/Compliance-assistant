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
          console.log("DEBUG: Raw Stage 1 Answers from LocalStorage:", stage1);
          console.log("DEBUG: Keys present in Stage 1:", Object.keys(stage1));
          
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
          console.log("Full Assessment Payload Received:", result);
          if (result.scores?.stage1) {
             console.log("DEBUG: Stage 1 Score Breakdown:", result.scores.stage1);
          }
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

  /**
   * MASTER PERCENTAGE ENGINE
   * Every percentage in the system must go through this helper.
   * Returns both counts and toFixed(1) percentages.
   */
  const calculateStagePercentages = (stageKey) => {
    // 1. Locate the stage data in the payload (robust for legacy structures)
    const s = assessment.scores?.[stageKey] || 
              assessment.scores?.stageScores?.[stageKey] || 
              assessment.stageScores?.[stageKey] || 
              {};
    
    // 2. Extract raw counts safely
    const yesCount = Number(s.yes ?? s.breakdown?.counts?.yes ?? 0);
    const partialCount = Number(s.partial ?? s.breakdown?.counts?.partial ?? 0);
    const noCount = Number(s.no ?? s.breakdown?.counts?.no ?? 0);
    const naCount = Number(s.na ?? s.notApplicableCount ?? 0);

    // 3. Determine the denominator (T)
    // For Stage 1, it's always 7. For others, it's the sum of counts.
    let T = (stageKey === "stage1") ? 7 : (yesCount + partialCount + noCount + naCount);
    
    // Safety: prevent division by zero or negative
    if (T <= 0) T = 1;

    // 4. Calculate percentages
    const getPct = (val) => ((val / T) * 100).toFixed(1);

    const result = {
      yesCount,
      partialCount,
      noCount,
      naCount,
      yesPercent: getPct(yesCount),
      partialPercent: getPct(partialCount),
      noPercent: getPct(noCount),
      naPercent: getPct(naCount)
    };

    console.log(`[Calc] ${stageKey}: Y=${yesCount}, P=${partialCount}, N=${noCount}, NA=${naCount} | T=${T} | Y%=${result.yesPercent}`);
    return result;
  };

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

  const stages = [
    { key: "stage1", title: "Mandatory Clauses" },
    { key: "stage2", title: "Organizational Controls" },
    { key: "stage3", title: "People Controls" },
    { key: "stage4", title: "Physical Controls" },
    { key: "stage5", title: "Technological Controls" },
  ];

  // Map all data through the engine
  const stageData = {
    stage1: calculateStagePercentages("stage1"),
    stage2: calculateStagePercentages("stage2"),
    stage3: calculateStagePercentages("stage3"),
    stage4: calculateStagePercentages("stage4"),
    stage5: calculateStagePercentages("stage5"),
  };

  // Pie Chart Data - Derived from the same counts
  const mandatoryChart = {
    yes: stageData.stage1.yesPercent,
    partial: stageData.stage1.partialPercent,
    no: stageData.stage1.noPercent
  };

  // Annex A chart needs to sum up counts then convert to %
  const ay = stageData.stage2.yesCount + stageData.stage3.yesCount + stageData.stage4.yesCount + stageData.stage5.yesCount;
  const ap = stageData.stage2.partialCount + stageData.stage3.partialCount + stageData.stage4.partialCount + stageData.stage5.partialCount;
  const an = stageData.stage2.noCount + stageData.stage3.noCount + stageData.stage4.noCount + stageData.stage5.noCount;
  const ana = stageData.stage2.naCount + stageData.stage3.naCount + stageData.stage4.naCount + stageData.stage5.naCount;
  const at = ay + ap + an + ana || 1;

  const annexAChart = {
    yes: ((ay / at) * 100).toFixed(1),
    partial: ((ap / at) * 100).toFixed(1),
    no: ((an / at) * 100).toFixed(1),
    na: ((ana / at) * 100).toFixed(1)
  };

  return (
    <div style={{ padding: "60px 20px", width: "100%", display: "flex", justifyContent: "center", backgroundColor: "#07090f", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: "1200px" }}>
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
        <div style={{ marginBottom: "50px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "#f1f5f9", fontWeight: 700 }}>Stage Compliance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "20px" }}>
            {stages.map((stage) => {
              const data = stageData[stage.key];
              return (
                <div key={stage.key} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <ComplianceBox 
                    title={stage.title} 
                    stats={{
                      yes: data.yesPercent,
                      partial: data.partialPercent,
                      no: data.noPercent,
                      na: data.naPercent
                    }} 
                    counts={{
                      yes: data.yesCount,
                      partial: data.partialCount,
                      no: data.noCount,
                      total: stage.key === "stage1" ? 7 : (data.yesCount + data.partialCount + data.noCount + data.naCount)
                    }}
                    isMandatory={stage.key === "stage1"} 
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* PIE CHARTS */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
          <PieChartCard title="Mandatory Controls Distribution" data={mandatoryChart} showNA={false} />
          <PieChartCard title="Annex A Controls Distribution" data={annexAChart} showNA={true} />
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
