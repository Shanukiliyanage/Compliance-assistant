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
  const numPart = rest.split("_")[0];
  const n = Number(numPart);
  return Number.isInteger(n) && String(n) === numPart;
}

function countAnnexControls(stageObject, prefix) {
  return Object.keys(stageObject || {}).filter((k) => isAnnexControlKey(k, prefix)).length;
}

function largestRemainderRound(counts, total) {
  if (!total) return counts.map(() => 0);
  const raws = counts.map((c) => (c / total) * 100);
  const floors = raws.map(Math.floor);
  const remainders = raws.map((r, i) => r - floors[i]);
  let toDistribute = 100 - floors.reduce((a, b) => a + b, 0);
  const order = remainders
    .map((r, i) => [r, i])
    .sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < toDistribute; k++) floors[order[k][1]] += 1;
  return floors;
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

  const [fullyPercent, partialPercent, nonPercent] = largestRemainderRound(
    [fullyCount, partialCount, nonCount],
    t
  );

  return { total: t, fullyCount, partialCount, nonCount, fullyPercent, partialPercent, nonPercent };
}

function buildAnnexSummaryWithNotApplicable(counts, total, notApplicableCount) {
  if (!counts) return null;
  const t = Number(total || 0);
  const na = Math.max(0, Number(notApplicableCount || 0));
  const fullyCount = Math.max(0, Number(counts.yes ?? 0));
  const partialCount = Math.max(0, Number(counts.partial ?? 0));
  const nonCount = Math.max(0, t - na - fullyCount - partialCount);

  const [fullyPercent, partialPercent, nonPercent, notApplicablePercent] =
    largestRemainderRound([fullyCount, partialCount, nonCount, na], t);

  return {
    total: t, fullyCount, partialCount, nonCount, notApplicableCount: na,
    fullyPercent, partialPercent, nonPercent, notApplicablePercent,
  };
}

function buildPieData(summary) {
  if (!summary) return null;
  return {
    labels: [`Fully compliant (${summary.fullyCount})`, `Partially compliant (${summary.partialCount})`, `Not compliant (${summary.nonCount})`],
    datasets: [{
      data: [summary.fullyCount, summary.partialCount, summary.nonCount],
      backgroundColor: ["#16a34a", "#facc15", "#dc2626"],
      borderWidth: 0,
    }],
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
    datasets: [{
      data: [summary.fullyCount, summary.partialCount, summary.nonCount, summary.notApplicableCount],
      backgroundColor: ["#16a34a", "#facc15", "#dc2626", "#6b7280"],
      borderWidth: 0,
    }],
  };
}

const SummaryCard = ({ title, value, subtitle, icon, color }) => (
  <div style={{
    background: "white",
    padding: "24px",
    borderRadius: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "24px" }}>{icon}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e293b" }}>{value}</div>
    <div style={{ fontSize: "13px", color: "#94a3b8" }}>{subtitle}</div>
    <div style={{ height: "4px", width: "100%", background: "#f1f5f9", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: typeof value === 'string' && value.includes('%') ? value : '100%', background: color }}></div>
    </div>
  </div>
);

function Summary() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const stage1Total = new Set(getMandatoryItems(mandatoryData).map((item) => String(item.clause || "").split(".")[0])).size;
    const stage2Total = countAnnexControls(organizationalData, "A5");
    const stage3Total = Array.isArray(peopleData?.controls) ? peopleData.controls.length : 0;
    const stage4Total = countAnnexControls(physicalData, "A7");
    const stage5Total = countAnnexControls(technologicalData, "A8");
    return { stage1Total, stage2Total, stage3Total, stage4Total, stage5Total, annexATotal: stage2Total + stage3Total + stage4Total + stage5Total };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!assessmentId) return;
      setLoading(true);
      try {
        const result = await getAssessmentResult(assessmentId);
        if (!cancelled) setAssessment(result);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load assessment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assessmentId]);

  const scores = assessment?.scores || null;
  const profile = assessment?.smeProfile || {};
  const mandatoryCounts = scores?.complianceBreakdownMandatory?.counts || null;
  const annexCounts = scores?.complianceBreakdownAnnexA?.counts || null;

  const mandatorySummary = buildThreeWaySummary(mandatoryCounts, mandatoryCounts?.total || totals.stage1Total);
  const annexNotApplicableTotal = assessment?.excludedControls?.length || 0;
  const annexSummary = buildAnnexSummaryWithNotApplicable(annexCounts, annexCounts?.total || totals.annexATotal, annexNotApplicableTotal);

  const mandatoryPieData = buildPieData(mandatorySummary);
  const annexPieData = buildAnnexPieData(annexSummary);

  const compliancePercent = (scores?.complianceScores?.overall ?? 0).toFixed(1);
  const annexPercent = (scores?.complianceScores?.annexA ?? 0).toFixed(1);
  const riskScore = (scores?.weightedScores?.overall ?? 0).toFixed(1);
  
  const applicableCount = totals.annexATotal - annexNotApplicableTotal;
  const excludedCount = annexNotApplicableTotal;

  if (loading) return <div style={{ padding: "100px", textAlign: "center", color: "white", background: "#07090f", minHeight: "100vh" }}>Loading...</div>;
  if (error || !assessment) return <div style={{ padding: "100px", textAlign: "center", color: "white", background: "#07090f", minHeight: "100vh" }}>{error || "No data found"}</div>;

  return (
    <div style={{ padding: "60px 20px", backgroundColor: "#07090f", minHeight: "100vh", color: "#f1f5f9" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, marginBottom: "10px" }}>
            {profile.organizationName || "Organization"} Compliance Results
          </h1>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "1.1rem", color: "#94a3b8" }}>
            <span>Sector: {profile.sector || profile.industry || "General"}</span>
            <span>•</span>
            <span>Date: {new Date(assessment.timestamp).toLocaleDateString()}</span>
          </div>
        </div>

        {/* TOP METRIC CARDS - ALL 8 METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <SummaryCard title="Normal Compliance" value={`${compliancePercent}%`} subtitle="Simple Average Score" icon="🛡️" color="#6366f1" />
          <SummaryCard title="Weighted Compliance" value={`${riskScore}%`} subtitle="Risk-Adjusted Score" icon="⚖️" color="#8b5cf6" />
          <SummaryCard title="Annex A Maturity" value={getMaturityLevelFromPercent(annexPercent)} subtitle={`${annexPercent}% Implementation`} icon="📊" color="#10b981" />
          <SummaryCard title="High Priority Gaps" value={assessment?.recommendations?.filter(r => r.priority > 1.5).length || 0} subtitle="Critical Remediation Items" icon="⚠️" color="#ef4444" />
          <SummaryCard title="Applicable Controls" value={applicableCount} subtitle="Total Controls in Scope" icon="✅" color="#3b82f6" />
          <SummaryCard title="Excluded Controls" value={excludedCount} subtitle="True N/A Exclusions" icon="🚫" color="#64748b" />
          <SummaryCard title="Mandatory Status" value={mandatorySummary.fullyPercent + "%"} subtitle="Full Compliance Level" icon="🔑" color="#a855f7" />
          <SummaryCard title="Annex A Status" value={annexSummary.fullyPercent + "%"} subtitle="Full Implementation Level" icon="📋" color="#ec4899" />
        </div>

        {/* CHARTS SECTION */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "30px", marginBottom: "40px" }}>
          {/* Mandatory */}
          <div style={{ background: "white", padding: "35px", borderRadius: "24px", color: "#1e293b", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "25px", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>Mandatory Clauses</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
              <div style={{ width: "220px" }}><Pie data={mandatoryPieData} options={{ plugins: { legend: { display: false } } }} /></div>
              <div style={{ flex: 1, display: "grid", gap: "12px" }}>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Fully compliant</span> <strong>{mandatorySummary.fullyPercent}%</strong></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Partially compliant</span> <strong>{mandatorySummary.partialPercent}%</strong></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Not compliant</span> <strong>{mandatorySummary.nonPercent}%</strong></div>
                 <div style={{ marginTop: "10px", padding: "10px", background: "#f8fafc", borderRadius: "12px", fontSize: "0.9rem" }}>
                    Total: {mandatorySummary.total} Clauses
                 </div>
              </div>
            </div>
          </div>

          {/* Annex A */}
          <div style={{ background: "white", padding: "35px", borderRadius: "24px", color: "#1e293b", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "25px", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>Annex A Controls</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
              <div style={{ width: "220px" }}><Pie data={annexPieData} options={{ plugins: { legend: { display: false } } }} /></div>
              <div style={{ flex: 1, display: "grid", gap: "12px" }}>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Fully compliant</span> <strong>{annexSummary.fullyPercent}%</strong></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Partially compliant</span> <strong>{annexSummary.partialPercent}%</strong></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Not compliant</span> <strong>{annexSummary.nonPercent}%</strong></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Not applicable</span> <strong>{annexSummary.notApplicablePercent}%</strong></div>
                 <div style={{ marginTop: "10px", padding: "10px", background: "#f8fafc", borderRadius: "12px", fontSize: "0.9rem" }}>
                    Total: {annexSummary.total} Controls
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", justifyContent: "center", gap: "25px", marginTop: "20px" }}>
          <button 
            onClick={() => navigate("/")} 
            style={{ 
              padding: "16px 45px", 
              borderRadius: "100px", 
              border: "1px solid #334155", 
              background: "transparent", 
              color: "white", 
              cursor: "pointer", 
              fontWeight: 700,
              fontSize: "1rem",
              transition: "all 0.2s"
            }}
          >
            Exit Assessment
          </button>
          <button 
            onClick={() => navigate(`/assessment/recommendations/${assessmentId}`)} 
            style={{ 
              padding: "16px 45px", 
              borderRadius: "100px", 
              border: "none", 
              background: "linear-gradient(135deg, #6366f1, #a855f7)", 
              color: "white", 
              cursor: "pointer", 
              fontWeight: 700,
              fontSize: "1rem",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)"
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
