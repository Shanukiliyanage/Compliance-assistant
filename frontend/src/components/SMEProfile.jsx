import { useState } from "react";
import { useNavigate } from "react-router-dom";

// SME profile form collected before the assessment questions.
const SMEProfilePage = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    organizationName: "",
    sector: "",
    size: "",
    dataType: "",
  });

  // Update profile state from form inputs.
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  // Validate required fields, store to localStorage, then start Stage 1.
  const handleSubmit = () => {
    const orgName = String(profile.organizationName || "").trim();
    const sector = String(profile.sector || "").trim();
    const size = String(profile.size || "").trim();
    const dataType = String(profile.dataType || "").trim();

    const missing = [];
    if (!orgName) missing.push("organization name");
    if (!sector) missing.push("organization sector");
    if (!size) missing.push("number of employees");
    if (!dataType) missing.push("primary type of data handled");

    if (missing.length) {
      window.alert(`Please complete: ${missing.join(", ")}.`);
      return;
    }

    localStorage.setItem(
      "profile",
      JSON.stringify({
        ...profile,
        organizationName: orgName,
        sector,
        size,
        dataType,
      })
    );
    navigate("/assessment/mandatory");
  };

  const selectStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#0F172A",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  };

  const textInputStyle = {
    ...selectStyle,
    cursor: "text",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    color: "#0F172A",
    fontSize: "0.95rem",
    fontWeight: "600",
  };

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: "12px",
            color: "#0F172A",
          }}
        >
          About Your Organization
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem", lineHeight: "1.5" }}>
          Help us understand your organization better so we can give you the most relevant recommendations.
        </p>
      </div>

      {/* FORM CONTAINER */}
      <div
        style={{
          background: "white",
          padding: "32px",
          borderRadius: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        {/* Organization Sector */}
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Name of the Organization</label>
          <input
            type="text"
            name="organizationName"
            value={profile.organizationName}
            onChange={handleChange}
            placeholder="Enter organization name"
            required
            style={textInputStyle}
          />
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "6px" }}>
            This will appear in your assessment profile.
          </p>
        </div>

        {/* Organization Sector */}
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Organization sector</label>
          <select
            name="sector"
            value={profile.sector}
            onChange={handleChange}
            required
            style={selectStyle}
          >
            <option value="">Select your sector</option>
            <option>Banking / Finance / Insurance</option>
            <option>IT / Software Development</option>
            <option>Healthcare</option>
            <option>Education</option>
            <option>Manufacturing</option>
            <option>Retail / E-commerce</option>
            <option>Other</option>
          </select>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "6px" }}>
            This helps us contextualize the controls relevant to your industry.
          </p>
        </div>

        {/* Organization Size */}
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Number of employees</label>
          <select
            name="size"
            value={profile.size}
            onChange={handleChange}
            required
            style={selectStyle}
          >
            <option value="">Select organization size</option>
            <option>1–10</option>
            <option>11–50</option>
            <option>51–100</option>
            <option>101–250</option>
          </select>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "6px" }}>
            Helps us understand your resource constraints.
          </p>
        </div>

        {/* Data Type */}
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Primary type of data handled</label>
          <select
            name="dataType"
            value={profile.dataType}
            onChange={handleChange}
            required
            style={selectStyle}
          >
            <option value="">Select data type</option>
            <option>General business data</option>
            <option>Personal data</option>
            <option>Financial data</option>
            <option>Sensitive personal data</option>
          </select>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "6px" }}>
            Important for assessing your security requirements.
          </p>
        </div>

        <div style={{ marginBottom: "32px" }} />

        {/* BUTTONS */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "12px 28px",
              borderRadius: "999px",
              background: "#f3f4f6",
              color: "#0F172A",
              border: "1px solid #d1d5db",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#f3f4f6";
            }}
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "12px 32px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #2563eb, #14b8a6)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 12px 24px rgba(37, 99, 235, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 10px 20px rgba(37, 99, 235, 0.2)";
            }}
          >
            Save and start assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default SMEProfilePage;
