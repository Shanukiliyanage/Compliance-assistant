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
      padding: "20px 16px",
      borderRadius: "16px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        color: "#0F172A",
        marginBottom: "12px",
        fontSize: "0.95rem",
        fontWeight: 800,
      }}>
        {title}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Yes</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 800, color: COLORS.yes }}>{stats.yes}%</span>
            {counts && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>({counts.yes}/{counts.total})</div>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Partial</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 800, color: COLORS.partial }}>{stats.partial}%</span>
            {counts && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>({counts.partial}/{counts.total})</div>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>No</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 800, color: COLORS.no }}>{stats.no}%</span>
            {counts && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>({counts.no}/{counts.total})</div>}
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
