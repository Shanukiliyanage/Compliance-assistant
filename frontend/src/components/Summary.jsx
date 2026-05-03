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

/* ─────────────── Helpers ─────────────── */

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
  const sumCounts = counts.reduce((a, b) => a + b, 0);
  if (sumCounts === 0) return counts.map(() => 0);

  const actualTotal = sumCounts > 0 && sumCounts !== total ? sumCounts : total;
  const raws = counts.map((c) => (c / actualTotal) * 100);
  const floors = raws.map(Math.floor);
  const remainders = raws.map((r, i) => r - floors[i]);
  let toDistribute = 100 - floors.reduce((a, b) => a + b, 0);
  
  toDistribute = Math.max(0, Math.min(toDistribute, counts.length));
  
  const order = remainders
    .map((r, i) => [r, i])
    .sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < toDistribute; k++) floors[order[k][1]] += 1;
  return floors;
}

/* ─────────────── Per-Stage Percentage Builder ─────────────── */

function buildStagePercentages(stageCounts, isMandatory = false) {
  if (!stageCounts) return { yes: 0, partial: 0, no: 0, na: 0, total: 0, yesCount: 0, partialCount: 0, noCount: 0, naCount: 0 };

  const yesCount = Number(stageCounts.yes ?? 0);
  const partialCount = Number(stageCounts.partial ?? 0);
  const noCount = Number(stageCounts.no ?? 0);
  const naCount = Number(stageCounts.na ?? 0);
  const total = Number(stageCounts.total ?? (yesCount + partialCount + noCount + naCount));

  if (isMandatory) {
    // Mandatory: 3-way (Yes, Partial, No) — no N/A
    const applicable = yesCount + partialCount + noCount;
    const [yesPct, partialPct, noPct] = largestRemainderRound([yesCount, partialCount, noCount], applicable || total);
    return { yes: yesPct, partial: partialPct, no: noPct, na: 0, total: applicable || total, yesCount, partialCount, noCount, naCount: 0 };
  } else {
    // Annex A stages: 4-way (Yes, Partial, No, N/A)
    const fullTotal = yesCount + partialCount + noCount + naCount;
    const [yesPct, partialPct, noPct, naPct] = largestRemainderRound([yesCount, partialCount, noCount, naCount], fullTotal || total);
    return { yes: yesPct, partial: partialPct, no: noPct, na: naPct, total: fullTotal || total, yesCount, partialCount, noCount, naCount };
  }
}

/* ─────────────── Color Constants ─────────────── */

const COLORS = {
  yes: "#16a34a",
  partial: "#f59e0b",
  no: "#dc2626",
  na: "#9ca3af"
};

/* ─────────────── ComplianceBox — One card per stage ─────────────── */

const ComplianceBox = ({ title, stats, isMandatory = false }) => (
  <div style={{
    background: "white",
    padding: "28px 22px",
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  }}>
    <div style={{
      color: "#0F172A",
      marginBottom: "16px",
      fontSize: "1rem",
      fontWeight: 800,
    }}>
      {title}
    </div>

    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>Yes</span>
        <span style={{ fontWeight: 800, color: COLORS.yes, fontSize: "1rem" }}>{stats.yes}%</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>Partial</span>
        <span style={{ fontWeight: 800, color: COLORS.partial, fontSize: "1rem" }}>{stats.partial}%</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>No</span>
        <span style={{ fontWeight: 800, color: COLORS.no, fontSize: "1rem" }}>{stats.no}%</span>
      </div>
      {!isMandatory && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>Not applicable</span>
          <span style={{ fontWeight: 800, color: COLORS.na, fontSize: "1rem" }}>{stats.na}%</span>
        </div>
      )}
    </div>
  </div>
);

/* ─────────────── PieChartCard ─────────────── */

const PieChartCard = ({ title, data, showNA = false }) => {
  const stats = {
    yes: data?.yes ?? 0,
    partial: data?.partial ?? 0,
    no: data?.no ?? 0,
    na: data?.na ?? 0,
  };

  const pieData = {
    labels: showNA ? ["Yes", "Partial", "No", "N/A"] : ["Yes", "Partial", "No"],
    datasets: [{
      data: showNA ? [stats.yes, stats.partial, stats.no, stats.na] : [stats.yes, stats.partial, stats.no],
      backgroundColor: showNA ? [COLORS.yes, COLORS.partial, COLORS.no, COLORS.na] : [COLORS.yes, COLORS.partial, COLORS.no],
      borderWidth: 0,
    }],
  };

  const options = {
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#4b5563",
          font: { weight: "bold" },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}`,
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{
      background: "white",
      padding: "24px",
      borderRadius: "20px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
      border: "1px solid #e5e7eb",
      flex: 1,
      minWidth: "300px",
    }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", color: "#0F172A", textAlign: "center", fontWeight: 700 }}>
        {title}
      </h3>
      <div style={{ height: "250px" }}>
        <Pie data={pieData} options={options} />
      </div>
    </div>
  );
};

/* ─────────────── Main Summary Component ─────────────── */

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

  /* ── Extract data from backend response ── */

  const scores = assessment?.scores || {};
  const profile = assessment?.smeProfile || {};

  // Per-stage counts from the backend scoring engine
  const stage1 = scores.stage1 || { yes: 0, partial: 0, no: 0, na: 0, total: totals.stage1Total };
  const stage2 = scores.stage2 || { yes: 0, partial: 0, no: 0, na: 0, total: totals.stage2Total };
  const stage3 = scores.stage3 || { yes: 0, partial: 0, no: 0, na: 0, total: totals.stage3Total };
  const stage4 = scores.stage4 || { yes: 0, partial: 0, no: 0, na: 0, total: totals.stage4Total };
  const stage5 = scores.stage5 || { yes: 0, partial: 0, no: 0, na: 0, total: totals.stage5Total };

  // Build display percentages for each of the 5 cards
  const mandatoryStats = buildStagePercentages(stage1, true);
  const orgStats = buildStagePercentages(stage2, false);
  const peopleStats = buildStagePercentages(stage3, false);
  const physicalStats = buildStagePercentages(stage4, false);
  const techStats = buildStagePercentages(stage5, false);

  // Aggregate for pie charts
  const mandatoryPieCounts = {
    yes: mandatoryStats.yesCount,
    partial: mandatoryStats.partialCount,
    no: mandatoryStats.noCount,
  };

  const annexACombined = {
    yes: orgStats.yesCount + peopleStats.yesCount + physicalStats.yesCount + techStats.yesCount,
    partial: orgStats.partialCount + peopleStats.partialCount + physicalStats.partialCount + techStats.partialCount,
    no: orgStats.noCount + peopleStats.noCount + physicalStats.noCount + techStats.noCount,
    na: orgStats.naCount + peopleStats.naCount + physicalStats.naCount + techStats.naCount,
  };

  /* ── Loading / Error states ── */

  if (loading) return <div style={{ padding: "100px", textAlign: "center", color: "white", background: "#07090f", minHeight: "100vh" }}>Loading...</div>;
  if (error || !assessment) return <div style={{ padding: "100px", textAlign: "center", color: "white", background: "#07090f", minHeight: "100vh" }}>{error || "No data found"}</div>;

  /* ── RENDER — SAME LAYOUT FOR EVERY SECTOR ── */

  return (
    <div style={{ padding: "60px 20px", backgroundColor: "#07090f", minHeight: "100vh", color: "#f1f5f9" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── HEADER ── */}
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

        {/* ── 5 COMPLIANCE CARDS — ALWAYS THE SAME 5 ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "16px",
          marginBottom: "40px",
        }}>
          <ComplianceBox title="Mandatory Clauses" stats={mandatoryStats} isMandatory={true} />
          <ComplianceBox title="Organizational Controls" stats={orgStats} isMandatory={false} />
          <ComplianceBox title="People Controls" stats={peopleStats} isMandatory={false} />
          <ComplianceBox title="Physical Controls" stats={physicalStats} isMandatory={false} />
          <ComplianceBox title="Technological Controls" stats={techStats} isMandatory={false} />
        </div>

        {/* ── 2 PIE CHARTS — ALWAYS THE SAME 2 ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "40px",
        }}>
          <PieChartCard title="Mandatory Controls Distribution" data={mandatoryPieCounts} showNA={false} />
          <PieChartCard title="Annex A Controls Distribution" data={annexACombined} showNA={true} />
        </div>

        {/* ── ACTION BUTTONS ── */}
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
