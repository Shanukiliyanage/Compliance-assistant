import React from 'react';
import { Pie } from "react-chartjs-2";

const COLORS = {
  yes: "#16a34a",
  partial: "#f59e0b",
  no: "#dc2626",
  na: "#9ca3af"
};

const PieChartCard = ({ title, data, showNA = false }) => {
  const pieData = {
    labels: showNA ? ["Yes", "Partial", "No", "N/A"] : ["Yes", "Partial", "No"],
    datasets: [
      {
        data: showNA ? [data.yes, data.partial, data.no, data.na] : [data.yes, data.partial, data.no],
        backgroundColor: showNA ? [COLORS.yes, COLORS.partial, COLORS.no, COLORS.na] : [COLORS.yes, COLORS.partial, COLORS.no],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#4b5563",
          font: { weight: 'bold' }
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}%`
        }
      }
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
      minWidth: "300px"
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

export default PieChartCard;
