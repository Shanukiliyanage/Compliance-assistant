import React from 'react';

const COLORS = {
  yes: "#16a34a",
  partial: "#f59e0b",
  no: "#dc2626",
  na: "#9ca3af"
};

const ComplianceBox = ({ title, stats, counts, isMandatory = false }) => {
  return (
    <div style={{
      background: "white",
      padding: "32px 24px",
      borderRadius: "20px",
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
          <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "6px" }}>
            {counts && <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>{counts.yes}/{counts.total}</span>}
            <span style={{ fontWeight: 800, color: COLORS.yes, fontSize: "1rem" }}>{stats.yes}%</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>Partial</span>
          <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "6px" }}>
            {counts && <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>{counts.partial}/{counts.total}</span>}
            <span style={{ fontWeight: 800, color: COLORS.partial, fontSize: "1rem" }}>{stats.partial}%</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>No</span>
          <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "6px" }}>
            {counts && <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>{counts.no}/{counts.total}</span>}
            <span style={{ fontWeight: 800, color: COLORS.no, fontSize: "1rem" }}>{stats.no}%</span>
          </div>
        </div>
        {!isMandatory && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#6b7280" }}>Not applicable</span>
            <span style={{ fontWeight: 800, color: COLORS.na }}>{stats.na}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceBox;
