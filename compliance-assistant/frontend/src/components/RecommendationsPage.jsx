import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAssessmentReport, getAssessmentResult } from "../services/backendApi";

// Recommendations page for a completed assessment.
// Consumes backend recommendations as the single source of truth.

const PriorityBadge = ({ priority }) => {
  const p = String(priority || "").toUpperCase();
  let colors = { bg: "#f3f4f6", text: "#64748b", label: "LOW" };
  
  if (p === "CRITICAL" || priority > 1.5) colors = { bg: "#fee2e2", text: "#dc2626", label: "CRITICAL" };
  else if (p === "HIGH" || priority > 1.0) colors = { bg: "#ffedd5", text: "#ea580c", label: "HIGH" };
  else if (p === "MEDIUM" || priority > 0.5) colors = { bg: "#fef3c7", text: "#d97706", label: "MEDIUM" };

  return (
    <span style={{ 
      background: colors.bg, 
      color: colors.text, 
      padding: "4px 12px", 
      borderRadius: "999px", 
      fontSize: "12px", 
      fontWeight: 700,
      letterSpacing: "0.05em"
    }}>
      {colors.label}
    </span>
  );
};

const RecommendationCard = ({ rec }) => (
  <div style={{
    background: "white",
    padding: "30px",
    borderRadius: "24px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    border: "1px solid #f1f5f9",
    marginBottom: "24px",
    transition: "transform 0.2s"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#6366f1", marginBottom: "4px" }}>
          {rec.id.startsWith('A') ? 'ANNEX A CONTROL' : 'MANDATORY CLAUSE'}
        </div>
        <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
          {rec.control}
        </h3>
      </div>
      <PriorityBadge priority={rec.riskLevel || rec.priority} />
    </div>
    
    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
       <span style={{ background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", color: "#64748b", border: "1px solid #e2e8f0" }}>
         Status: <span style={{ fontWeight: 700, color: rec.score > 0 ? "#d97706" : "#dc2626" }}>{rec.score > 0 ? "PARTIAL" : "NO"}</span>
       </span>
    </div>

    <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", borderLeft: "4px solid #6366f1" }}>
      <p style={{ margin: 0, color: "#334155", lineHeight: 1.6, fontSize: "15px", fontWeight: 500 }}>
        {rec.recommendation}
      </p>
    </div>
  </div>
);

export default function RecommendationsPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await getAssessmentResult(assessmentId);
        setAssessment(result);
      } catch (err) {
        setError("Error loading assessment: " + (err?.message || String(err)));
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId]);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const report = await getAssessmentReport(assessmentId);
      const profile = report.smeProfile || {};
      const companyName = profile.organizationName || "Organization";
      const date = new Date(report.timestamp).toLocaleDateString();
      const scores = report.scores || {};
      
      const compliance = (scores.complianceScores?.overall ?? 0).toFixed(1);
      const risk = (scores.weightedScores?.overall ?? 0).toFixed(1);
      const applicableCount = 93 - (report.excludedControls?.length || 0);
      const highGaps = report.recommendations?.filter(r => r.priority > 1.5).length || 0;

      // Build printable HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${companyName} - Compliance Assessment Report</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #f1f5f9; }
            .metric-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .metric-card { padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
            .metric-val { font-size: 24px; font-weight: 800; color: #6366f1; }
            .section { margin-bottom: 40px; }
            .rec-card { margin-bottom: 20px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; page-break-inside: avoid; }
            .badge { padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .critical { background: #fee2e2; color: #dc2626; }
            .high { background: #ffedd5; color: #ea580c; }
            .medium { background: #fef3c7; color: #d97706; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #f1f5f9; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Compliance Assessment Report</h1>
            <h2>${companyName}</h2>
            <p>Sector: ${profile.sector || "General"} | Date: ${date} | ID: ${assessmentId}</p>
          </div>

          <div class="section">
            <h3>Executive Summary</h3>
            <div class="metric-grid">
              <div class="metric-card">
                <div>Compliance Score</div>
                <div class="metric-val">${compliance}%</div>
              </div>
              <div class="metric-card">
                <div>Weighted Risk</div>
                <div class="metric-val">${risk}%</div>
              </div>
              <div class="metric-card">
                <div>High Priority Gaps</div>
                <div class="metric-val">${highGaps}</div>
              </div>
            </div>
            <p>This report provides a standardized analysis based on ISO 27001 requirements. The organization is currently at an <strong>${compliance}%</strong> compliance level.</p>
          </div>

          <div class="section">
            <h3>Remediation Recommendations</h3>
            ${report.recommendations.map(r => `
              <div class="rec-card">
                <div style="display:flex; justify-content:space-between;">
                  <strong>${r.id}: ${r.control}</strong>
                  <span class="badge ${r.priority > 1.5 ? 'critical' : r.priority > 1.0 ? 'high' : 'medium'}">${r.riskLevel || 'MEDIUM'}</span>
                </div>
                <div style="margin-top:10px; font-size:14px; color:#64748b;">Current Status: ${r.score > 0 ? 'PARTIAL' : 'NO'}</div>
                <p style="margin-top:15px; padding:15px; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">${r.recommendation}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>Excluded Controls (True N/A)</h3>
            <table>
              <thead>
                <tr><th>ID</th><th>Control Name</th><th>Reason for Exclusion</th></tr>
              </thead>
              <tbody>
                ${report.excludedControls.map(e => `
                  <tr><td>${e.id}</td><td>${e.name}</td><td>${e.reason}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="text-align:center; margin-top:50px; color:#94a3b8; font-size:12px;">
            Generated by Shield360 Engine • Verified Rule-Based Analysis
          </div>
        </body>
        </html>
      `;

      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 500);
    } catch (err) {
      alert("Failed to generate report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div style={{ padding: "100px", textAlign: "center", color: "white", background: "#07090f", minHeight: "100vh" }}>Loading...</div>;
  if (error || !assessment) return <div style={{ padding: "100px", textAlign: "center", color: "white", background: "#07090f", minHeight: "100vh" }}>{error || "No data found"}</div>;

  const profile = assessment.smeProfile || {};
  const companyName = profile.organizationName || "Organization";
  const recommendations = assessment.allRecommendations || assessment.recommendations || [];

  return (
    <div style={{ padding: "60px 20px", backgroundColor: "#07090f", minHeight: "100vh", color: "#f1f5f9" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
           <button onClick={() => navigate(-1)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
             ← Back to Summary
           </button>
           <button 
             onClick={handleDownloadReport} 
             disabled={downloading}
             style={{ 
               padding: "12px 28px", 
               borderRadius: "100px", 
               border: "none", 
               background: "white", 
               color: "#1e293b", 
               cursor: "pointer", 
               fontWeight: 700,
               boxShadow: "0 4px 15px rgba(255,255,255,0.1)"
             }}
           >
             {downloading ? "Generating..." : "Download PDF Report"}
           </button>
        </div>

        <div style={{ marginBottom: "50px" }}>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, marginBottom: "10px" }}>Recommendations</h1>
          <p style={{ fontSize: "1.2rem", color: "#94a3b8" }}>Personalized remediation plan for <strong>{companyName}</strong></p>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          {recommendations.length > 0 ? (
            recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} rec={rec} />
            ))
          ) : (
            <div style={{ padding: "100px", textAlign: "center", background: "#1e293b", borderRadius: "24px" }}>
               <h3 style={{ fontSize: "1.5rem" }}>No Recommendations Found</h3>
               <p style={{ color: "#94a3b8" }}>The organization is fully compliant with all assessed controls.</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: "50px", textAlign: "center" }}>
           <p style={{ color: "#475569", fontSize: "14px" }}>
             Priority based on sector-weighted risk analysis (Weight × [1 - Score])
           </p>
        </div>

      </div>
    </div>
  );
}
