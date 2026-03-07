import { useState, useMemo } from "react";
import incidentData from "../data/incident.json";
// uncomment if using react-router-dom:
// import { useNavigate } from "react-router-dom";

// incident management questions - follow-ups only show if the gateway question is yes
function StageIncidentManagement() {
  // const navigate = useNavigate();

  const controls = useMemo(
    () =>
      Object.entries(incidentData).map(([key, value]) => ({
        id: key,
        control: value.control,
        questions: value.questions,
        gatewayFor: value.gatewayFor || null
      })),
    []
  );

  const gatewayControl = controls.find((c) => c.id === "A5.24_Gateway");
  const gatewayQuestionId = gatewayControl
    ? gatewayControl.questions[0].id
    : null;
  const gatewayTargets = gatewayControl ? gatewayControl.gatewayFor : [];

  const [answers, setAnswers] = useState({});
  const [missingIds, setMissingIds] = useState([]);
  const [showValidationError, setShowValidationError] = useState(false);

  const clearAnswersForControls = (controlIds, nextAnswers) => {
    controls.forEach((c) => {
      if (!controlIds.includes(c.id)) return;
      (c.questions || []).forEach((q) => {
        delete nextAnswers[q.id];
      });
    });
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: value
      };

      // if gateway flips to no, clear the dependent answers
      if (questionId === gatewayQuestionId && prev[questionId] !== value) {
        clearAnswersForControls(gatewayTargets, next);
      }

      return next;
    });

    if (missingIds.includes(questionId)) {
      setMissingIds((prev) => prev.filter((id) => id !== questionId));
    }
    setShowValidationError(false);
  };

  const validateAndNext = () => {
    const newMissing = [];

    const gwAnswer = gatewayQuestionId ? answers[gatewayQuestionId] : null;
    const incidentsEnabled = gwAnswer === "yes";

    controls.forEach((control) => {
      const isGatewayTarget = gatewayTargets.includes(control.id);

      if (isGatewayTarget && !incidentsEnabled) {
        return;
      }

      control.questions.forEach((q) => {
        const value = answers[q.id];
        if (!value) {
          newMissing.push(q.id);
        }
      });
    });

    if (newMissing.length > 0) {
      setMissingIds(newMissing);
      setShowValidationError(true);
      return;
    }

    console.log("Incident management stage complete, go to next stage");
    // navigate("/assessment/next") if using routing
  };

  const handleBack = () => {
    console.log("Back to previous stage");
    // navigate("/assessment/organizational") if using routing
  };

  const { answeredCount, totalRequired } = useMemo(() => {
    let total = 0;
    let answered = 0;

    const gwAnswer = gatewayQuestionId ? answers[gatewayQuestionId] : null;
    const incidentsEnabled = gwAnswer === "yes";

    controls.forEach((control) => {
      const isGatewayTarget = gatewayTargets.includes(control.id);

      if (isGatewayTarget && !incidentsEnabled) {
        return;
      }

      control.questions.forEach((q) => {
        total += 1;
        if (answers[q.id]) {
          answered += 1;
        }
      });
    });

    return { answeredCount: answered, totalRequired: total };
  }, [answers, controls, gatewayQuestionId, gatewayTargets]);

  const progressPercent =
    totalRequired === 0
      ? 0
      : Math.round((answeredCount / totalRequired) * 100);

  if (!controls.length) {
    return (
      <div
        style={{
          padding: "40px 20px",
          maxWidth: "800px",
          margin: "0 auto"
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>
          Incident management
        </h1>
        <p style={{ color: "#94a3b8" }}>
          No incident management controls found. Please check incident.json.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "40px 20px",
        maxWidth: "1200px",
        margin: "0 auto"
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "8px", color: "#f1f5f9" }}>
        Stage, Information security incident management
      </h1>

      <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "1rem" }}>
        Answer all questions related to how your organization prepares for,
        handles, and learns from information security incidents.
      </p>

      {/* Progress bar */}
      <div
        style={{
          marginBottom: "24px",
          maxWidth: "900px",
          marginInline: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.95rem",
            marginBottom: "6px",
            color: "#94a3b8"
          }}
        >
          <span>
            Answered {answeredCount} of {totalRequired}
          </span>
          <span>{progressPercent}% complete</span>
        </div>

        <div
          style={{
            width: "100%",
            height: "10px",
            borderRadius: "999px",
            backgroundColor: "#e5e7eb",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #2563eb, #14b8a6)"
            }}
          ></div>
        </div>
      </div>

      {/* Centered scrollable form */}
      <div
        style={{
          background: "white",
          padding: "28px",
          borderRadius: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
          maxHeight: "650px",
          overflowY: "auto",
          maxWidth: "900px",
          margin: "0 auto"
        }}
      >
        {controls.map((control) => {
          const isGateway = control.id === "A5.24_Gateway";
          const isGatewayTarget = gatewayTargets.includes(control.id);

          const gwAnswer = gatewayQuestionId ? answers[gatewayQuestionId] : null;
          const incidentsEnabled = gwAnswer === "yes";

          if (isGatewayTarget && !incidentsEnabled) {
            return null;
          }

          return (
            <section
              key={control.id}
              style={{
                marginBottom: "28px",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "24px"
              }}
            >
              <h2 style={{ fontSize: "1.2rem", marginBottom: "12px", color: "#0F172A" }}>
                {control.control}
              </h2>

              {control.questions.map((q) => {
                const selected = answers[q.id];
                const isMissing = missingIds.includes(q.id);

                const baseButtonStyle = {
                  flex: 1,
                  padding: "8px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  fontSize: "0.9rem"
                };

                return (
                  <div
                    key={q.id}
                    style={{
                      marginBottom: "20px",
                      padding: "12px",
                      borderRadius: "12px",
                      backgroundColor: "#f9fafb",
                      border: isMissing
                        ? "1px solid #f97373"
                        : "1px solid transparent"
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.98rem",
                        marginBottom: "6px",
                        fontWeight: 500
                      }}
                    >
                      {q.question}
                    </p>

                    <p
                      style={{
                        fontSize: "0.85rem",
                        marginBottom: "10px",
                        color: "#6b7280"
                      }}
                    >
                      {q.explanation}
                    </p>

                    <div style={{ display: "flex", gap: "10px" }}>
                      {/* Yes */}
                      <button
                        onClick={() => handleAnswer(q.id, "yes")}
                        style={{
                          ...baseButtonStyle,
                          background:
                            selected === "yes"
                              ? "linear-gradient(135deg, #16a34a, #22c55e)"
                              : "linear-gradient(135deg, #16a34a, #4ade80)"
                        }}
                      >
                        Yes
                      </button>

                      {/* Partial only for non gateway */}
                      {!isGateway && (
                        <button
                          onClick={() => handleAnswer(q.id, "partial")}
                          style={{
                            ...baseButtonStyle,
                            background:
                              selected === "partial"
                                ? "linear-gradient(135deg, #eab308, #facc15)"
                                : "linear-gradient(135deg, #facc15, #fcd34d)"
                          }}
                        >
                          Partial
                        </button>
                      )}

                      {/* No */}
                      <button
                        onClick={() => handleAnswer(q.id, "no")}
                        style={{
                          ...baseButtonStyle,
                          background:
                            selected === "no"
                              ? "linear-gradient(135deg, #b91c1c, #ef4444)"
                              : "linear-gradient(135deg, #dc2626, #f87171)"
                        }}
                      >
                        No
                      </button>
                    </div>

                    {isMissing && (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#b91c1c"
                        }}
                      >
                        This question is required.
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      {/* Back and Next buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "900px",
          margin: "20px auto 0 auto",
          gap: "10px",
        }}
      >
        {showValidationError && (
          <p style={{ margin: 0, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#b91c1c", fontSize: "0.875rem", fontWeight: 500 }}>
            Please answer all questions before continuing. Unanswered questions are highlighted.
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={handleBack}
          style={{
            padding: "10px 20px",
            borderRadius: "999px",
            background: "white",
            border: "2px solid #2563eb",
            cursor: "pointer",
            color: "#2563eb",
            fontSize: "0.95rem",
            fontWeight: 500
          }}
        >
          Back
        </button>

        <button
          onClick={validateAndNext}
          style={{
            padding: "10px 24px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #2563eb, #14b8a6)",
            border: "none",
            cursor: "pointer",
            color: "white",
            fontSize: "0.95rem",
            fontWeight: 500
          }}
        >
          Next
        </button>
        </div>
      </div>
    </div>
  );
}

export default StageIncidentManagement;
