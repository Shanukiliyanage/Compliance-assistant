// Simple landing screen with a CTA that starts the assessment flow.
function LandingPage() {
  return (
    <div className="page-landing">
      {/* LEFT SIDE */}
      <div className="landing-left">
        <div className="badge">ISO 27001:2022 • Self Assessment</div>

        <h1 className="landing-heading">
          Welcome to the ISO 27001 Compliance Assistant
        </h1>

        <p className="landing-text">
          This tool will help you understand your alignment with ISO 27001 using
          simple questions. No technical expertise needed.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => (window.location.href = "/assessment")}
        >
          Start Assessment
        </button>

        <p className="hint-text">Takes less than 10 minutes</p>
      </div>

      {/* RIGHT SIDE */}
      <div className="landing-right">
        {/* Background blobs */}
        <div className="blob blob-red"></div>
        <div className="blob blob-teal"></div>
        <div className="blob blob-yellow"></div>
      </div>
    </div>
  );
}

export default LandingPage;
