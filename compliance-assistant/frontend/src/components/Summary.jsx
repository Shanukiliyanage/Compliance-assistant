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
          // Perform a fresh analysis if in live mode
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

  const stageNames = {
    stage1: "Mandatory Clauses",
    stage2: "Organizational Controls",
    stage3: "People Controls",
    stage4: "Physical Controls",
    stage5: "Technological Controls",
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

  const { scores, charts, weightedScores } = assessment;

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
          {weightedScores && (
            <div style={{ marginTop: "20px", padding: "15px", background: "rgba(37, 99, 235, 0.1)", borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.3)" }}>
              <span style={{ color: "#94a3b8", marginRight: "10px" }}>Weighted Compliance Score:</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#14b8a6" }}>{weightedScores.overall.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* STAGE COMPLIANCE BOXES */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "20px", color: "#f1f5f9", fontWeight: 700 }}>Stage Compliance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {scores && Object.entries(scores).map(([key, counts]) => {
              // Convert raw counts to percentages for the box
              const total = counts.yes + counts.partial + counts.no + (counts.na || 0);
              const getPct = (val) => total === 0 ? 0 : Math.round((val / total) * 100);
              const stats = {
                yes: getPct(counts.yes),
                partial: getPct(counts.partial),
                no: getPct(counts.no),
                na: getPct(counts.na || 0)
              };
              return (
                <ComplianceBox key={key} title={stageNames[key] || key} stats={stats} isMandatory={key === "stage1"} />
              );
            })}
          </div>
        </div>

        {/* PIE CHARTS */}
        {charts && (
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
            <PieChartCard title="Mandatory Controls Distribution" data={charts.mandatory} showNA={false} />
            <PieChartCard title="Annex A Controls Distribution" data={charts.annexA} showNA={true} />
          </div>
        )}

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
