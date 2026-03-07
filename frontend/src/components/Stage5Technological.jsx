import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import techData from "../data/technological.json";
import { analyzeAssessment } from "../services/backendApi";

// stage 5 technological questions - handles network/SDLC gateways and submits the full assessment
function Stage5Technological() {
  const navigate = useNavigate();

  const controls = useMemo(() => {
    return Object.entries(techData).map(([key, value]) => ({
      id: key,
      control: value.control,
      questions: value.questions || [],
      gatewayFor: value.gatewayFor || null,
    }));
  }, [techData]);

  // network gateway
  const networkGateway = controls.find((c) => c.id === "A8.20");
  const networkGatewayQid = networkGateway?.questions?.[0]?.id || null;
  const networkDependentIds = networkGateway?.gatewayFor || [];

  // SDLC gateway
  const sdlcGateway = controls.find((c) => c.id === "SDLC_Gateway");
  const sdlcGatewayQid = sdlcGateway?.questions?.[0]?.id || null;
  const sdlcDependentControlIds = sdlcGateway?.gatewayFor || [];

  // restore saved answers
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("stage5");
    return saved ? JSON.parse(saved) : {};
  });
  const [missingIds, setMissingIds] = useState([]);
  const [showValidationError, setShowValidationError] = useState(false);

  // auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("stage5", JSON.stringify(answers));
  }, [answers]);

  const clearAnswersForControls = (controlIds, nextAnswers) => {
    controls.forEach((c) => {
      if (!controlIds.includes(c.id)) return;
      (c.questions || []).forEach((q) => {
        delete nextAnswers[q.id];
      });
    });
  };

  const setAnswersNoForControls = (controlIds, nextAnswers) => {
    controls.forEach((c) => {
      if (!controlIds.includes(c.id)) return;
      (c.questions || []).forEach((q) => {
        nextAnswers[q.id] = "no";
      });
    });
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };

      if (questionId === networkGatewayQid) {
        // network gateway: no = auto-set dependents to no, yes = let user answer fresh
        // If "yes", clear them so user answers fresh.
        if (value === "yes") {
          clearAnswersForControls(networkDependentIds, next);
        } else {
          setAnswersNoForControls(networkDependentIds, next);
        }
      }

      if (questionId === sdlcGatewayQid) {
        // SDLC gateway - clear dependent answers if not applicable
        clearAnswersForControls(sdlcDependentControlIds, next);
      }

      return next;
    });

    if (missingIds.includes(questionId)) {
      setMissingIds((prev) => prev.filter((id) => id !== questionId));
    }
    setShowValidationError(false);
  };

  const isControlVisible = (controlId) => {
    const networkEnabled =
      !networkGatewayQid || answers[networkGatewayQid] === "yes";
    const sdlcEnabled =
      !sdlcGatewayQid || answers[sdlcGatewayQid] === "yes";

    if (networkDependentIds.includes(controlId) && !networkEnabled) return false;
    if (sdlcDependentControlIds.includes(controlId) && !sdlcEnabled)
      return false;

    return true;
  };

  const { answeredCount, totalRequired } = useMemo(() => {
    let total = 0;
    let answered = 0;

    controls.forEach((c) => {
      if (!isControlVisible(c.id)) return;
      (c.questions || []).forEach((q) => {
        total++;
        if (answers[q.id]) answered++;
      });
    });

    return { answeredCount: answered, totalRequired: total };
  }, [answers, controls]);

  const progressPercent =
    totalRequired === 0 ? 0 : Math.round((answeredCount / totalRequired) * 100);

  const handleSubmit = async () => {
    const newMissing = [];

    controls.forEach((c) => {
      if (!isControlVisible(c.id)) return;
      (c.questions || []).forEach((q) => {
        if (!answers[q.id]) newMissing.push(q.id);
      });
    });

    if (newMissing.length) {
      setMissingIds(newMissing);
      setShowValidationError(true);
      return;
    }

    try {
      // pull all stage answers from localStorage
      const stage1 = JSON.parse(localStorage.getItem("stage1") || "{}");
      const stage2 = JSON.parse(localStorage.getItem("stage2") || "{}");
      const stage3 = JSON.parse(localStorage.getItem("stage3") || "{}");
      const stage4 = JSON.parse(localStorage.getItem("stage4") || "{}");
      const stage5 = answers;

      const allAnswers = { stage1, stage2, stage3, stage4, stage5 };

      // get the current user
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in to submit.");
        return;
      }

      // get profile from localStorage
      const profile = JSON.parse(localStorage.getItem("profile") || "{}");

      const result = await analyzeAssessment({
        userId: user.uid,
        answers: allAnswers,
        smeProfile: profile,
      });

      // save result for the results page
      localStorage.setItem("assessmentResult", JSON.stringify(result));

      navigate(`/assessment/summary/${result.assessmentId}`);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      alert("Error submitting assessment: " + error.message);
    }
  };

  const handleBack = () => navigate("/assessment/physical");

  return (
    <div style={{ padding: "40px 20px", width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <h1 style={{ fontSize: "2.2rem", marginBottom: "8px", color: "#f1f5f9" }}>
          Stage 5, Technological Controls
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
          Answer all questions on this page. Every question is mandatory.
        </p>

        {/* progress */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", marginBottom: "6px", color: "#94a3b8" }}>
            <span>Answered {answeredCount} of {totalRequired}</span>
            <span>{progressPercent}% complete</span>
          </div>

          <div style={{ width: "100%", height: "10px", borderRadius: "999px", backgroundColor: "#e5e7eb" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #2563eb, #14b8a6)" }} />
          </div>
        </div>

        {/* form */}
        <div style={{ background: "white", padding: "28px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.06)", height: "650px", overflowY: "auto" }}>
          {controls.filter((c) => isControlVisible(c.id)).map((control, controlIdx) => (
            <section key={control.id} style={{ marginBottom: "28px", borderBottom: "1px solid #e5e7eb", paddingBottom: "24px" }}>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "12px", color: "#0F172A" }}>{controlIdx + 1}. {control.control}</h2>

              {control.questions.map((q, qIdx) => {
                const selected = answers[q.id];
                const isMissing = missingIds.includes(q.id);
                const questionLabel = `${String.fromCharCode(97 + qIdx)})`;

                const isGatewayQuestion =
                  q.id === networkGatewayQid || q.id === sdlcGatewayQid;

                const baseButtonStyle = {
                  flex: 1,
                  padding: "8px",
                  borderRadius: "999px",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                };

                return (
                  <div key={q.id} style={{ marginBottom: "18px", padding: "16px", borderRadius: "12px", backgroundColor: "#f9fafb", border: isMissing ? "1px solid #fca5a5" : "1px solid #e5e7eb", transition: "all 0.2s ease" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.98rem", marginBottom: "8px", color: "#0F172A" }}><span style={{ marginRight: "8px" }}>{questionLabel}</span>{q.question}</p>
                    {q.explanation && <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "14px", lineHeight: "1.4" }}>{q.explanation}</p>}

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => handleAnswer(q.id, "yes")} style={{ ...baseButtonStyle, background: selected === "yes" ? "linear-gradient(135deg, #16a34a, #4ade80)" : "#f3f4f6", color: selected === "yes" ? "white" : "#6b7280", border: selected === "yes" ? "2px solid #16a34a" : "1px solid #d1d5db" }}>Yes</button>

                      {!isGatewayQuestion && (
                        <button onClick={() => handleAnswer(q.id, "partial")} style={{ ...baseButtonStyle, background: selected === "partial" ? "linear-gradient(135deg, #facc15, #fcd34d)" : "#f3f4f6", color: selected === "partial" ? "#111827" : "#6b7280", border: selected === "partial" ? "2px solid #d97706" : "1px solid #d1d5db" }}>Partial</button>
                      )}

                      <button onClick={() => handleAnswer(q.id, "no")} style={{ ...baseButtonStyle, background: selected === "no" ? "linear-gradient(135deg, #dc2626, #f87171)" : "#f3f4f6", color: selected === "no" ? "white" : "#6b7280", border: selected === "no" ? "2px solid #dc2626" : "1px solid #d1d5db" }}>No</button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "20px", gap: "10px" }}>
          {showValidationError && (
            <p style={{ margin: 0, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#b91c1c", fontSize: "0.875rem", fontWeight: 500 }}>
              Please answer all questions before submitting. Unanswered questions are highlighted.
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={handleBack} style={{ padding: "10px 20px", borderRadius: "999px", background: "white", border: "2px solid #2563eb", color: "#2563eb" }}>
            Back
          </button>

          <button onClick={handleSubmit} style={{ padding: "10px 24px", borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #14b8a6)", border: "none", color: "white", fontWeight: 700 }}>
            Submit Assessment
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stage5Technological;
