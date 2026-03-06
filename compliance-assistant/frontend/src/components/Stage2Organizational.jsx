import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import orgData from "../data/organizational.json";

// Stage 2 (Organizational) questionnaire.
// Stores answers in localStorage and applies gateway logic to hide/clear dependent questions.
function Stage2Organizational() {
  const navigate = useNavigate();

  const controls = useMemo(
    () =>
      Object.entries(orgData).map(([key, value]) => ({
        id: key,
        control: value.control,
        questions: value.questions,
        gatewayFor: value.gatewayFor || null,
      })),
    [orgData]
  );

  const gatewayControl = controls.find((c) => c.gatewayFor && c.id === "A5.19_Gateway");
  const gatewayQuestionId = gatewayControl ? gatewayControl.questions[0].id : null;
  const supplierControlIds = gatewayControl ? gatewayControl.gatewayFor : [];

  const incidentIntroQ1Id = "A5.24.Q1";
  const incidentIntroQ2Id = "A5.24.Q2";
  const incidentFollowUpControlIds = ["A5.25", "A5.26", "A5.27", "A5.28"];

  // Load saved answers from localStorage.
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("stage2");
    return saved ? JSON.parse(saved) : {};
  });
  const [missingIds, setMissingIds] = useState([]);
  const [showValidationError, setShowValidationError] = useState(false);

  // Persist answers to localStorage.
  useEffect(() => {
    localStorage.setItem("stage2", JSON.stringify(answers));
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

  const isQuestionVisible = (q, nextAnswers) => {
    const cond = q?.showIf;
    if (!cond) return true;
    return nextAnswers?.[cond.questionId] === cond.equals;
  };

  const clearHiddenConditionalAnswers = (nextAnswers) => {
    controls.forEach((control) => {
      (control.questions || []).forEach((q) => {
        if (!isQuestionVisible(q, nextAnswers)) {
          delete nextAnswers[q.id];
        }
      });
    });
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };

      // Gateway: if supplier management is not applicable, clear dependent answers.
      if (questionId === gatewayQuestionId && prev[questionId] !== value) {
        clearAnswersForControls(supplierControlIds, next);
      }

      // Gateway: incident management — if "no", auto-set follow-ups to "no" so they score as not compliant.
      // If "yes", clear them so the user can answer fresh.
      if (questionId === incidentIntroQ1Id && prev[questionId] !== value) {
        if (value === "yes") {
          clearAnswersForControls(incidentFollowUpControlIds, next);
        } else {
          setAnswersNoForControls(incidentFollowUpControlIds, next);
        }
      }

      // Clear any answers that became hidden due to conditional visibility.
      clearHiddenConditionalAnswers(next);

      return next;
    });

    if (missingIds.includes(questionId)) {
      setMissingIds((prev) => prev.filter((id) => id !== questionId));
    }
    setShowValidationError(false);
  };

  const validateAndNext = () => {
    const newMissing = [];

    const gatewayAnswer = gatewayQuestionId ? answers[gatewayQuestionId] : null;
    const supplierEnabled = gatewayAnswer === "yes";

    const incidentEnabled = answers?.[incidentIntroQ1Id] === "yes";

    controls.forEach((control) => {
      const isSupplierControl = supplierControlIds.includes(control.id);
      if (isSupplierControl && !supplierEnabled) return;

      const isIncidentFollowUp = incidentFollowUpControlIds.includes(control.id);
      if (isIncidentFollowUp && !incidentEnabled) return;

      control.questions.forEach((q) => {
        if (!isQuestionVisible(q, answers)) return;
        if (q?.optional) return;
        if (!answers[q.id]) newMissing.push(q.id);
      });
    });

    if (newMissing.length > 0) {
      setMissingIds(newMissing);
      setShowValidationError(true);
      return;
    }

    // ✅ GO TO PEOPLE (Stage 3)
    navigate("/assessment/people");
  };

  const handleBack = () => {
    navigate("/assessment/mandatory");
  };

  const { answeredCount, totalRequired } = useMemo(() => {
    let total = 0;
    let answered = 0;

    const gatewayAnswer = gatewayQuestionId ? answers[gatewayQuestionId] : null;
    const supplierEnabled = gatewayAnswer === "yes";

    const incidentEnabled = answers?.[incidentIntroQ1Id] === "yes";

    controls.forEach((control) => {
      const isSupplierControl = supplierControlIds.includes(control.id);
      if (isSupplierControl && !supplierEnabled) return;

      const isIncidentFollowUp = incidentFollowUpControlIds.includes(control.id);
      if (isIncidentFollowUp && !incidentEnabled) return;

      control.questions.forEach((q) => {
        if (!isQuestionVisible(q, answers)) return;
        if (q?.optional) return;
        total += 1;
        if (answers[q.id]) answered += 1;
      });
    });

    return { answeredCount: answered, totalRequired: total };
  }, [answers, controls, gatewayQuestionId, supplierControlIds]);

  const incidentIntroAnswer = answers?.[incidentIntroQ1Id] || null;
  const incidentEnabled = incidentIntroAnswer === "yes";

  const progressPercent =
    totalRequired === 0 ? 0 : Math.round((answeredCount / totalRequired) * 100);

  return (
    <div style={{ padding: "40px 20px", width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <h1 style={{ fontSize: "2.2rem", marginBottom: "8px", color: "#f1f5f9" }}>
          Stage 2, Organizational Controls
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "1rem" }}>
          Answer all required questions on this page.
        </p>

        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.95rem",
              marginBottom: "6px",
              color: "#94a3b8",
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
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: "999px",
                background: "linear-gradient(90deg, #2563eb, #14b8a6)",
              }}
            />
          </div>
        </div>

        {/* fixed height */}
        <div
          style={{
            background: "white",
            padding: "28px",
            borderRadius: "20px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            height: "650px",
            overflowY: "auto",
          }}
        >
          {controls.map((control, controlIdx) => {
            const isSupplierControl = supplierControlIds.includes(control.id);
            const isGateway = control.id === "A5.19_Gateway";

            const gatewayAnswer = gatewayQuestionId ? answers[gatewayQuestionId] : null;
            const supplierEnabled = gatewayAnswer === "yes";

            if (isSupplierControl && !supplierEnabled) return null;

            // Show A5.24 first; reveal A5.25–A5.28 only after A5.24 is completed.
            if (incidentFollowUpControlIds.includes(control.id) && !incidentEnabled) return null;

            return (
              <section
                key={control.id}
                style={{
                  marginBottom: "28px",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", marginBottom: "12px", color: "#0F172A" }}>
                  {controlIdx + 1}. {control.control}
                </h2>

                {control.questions.map((q, qIdx) => {
                  if (!isQuestionVisible(q, answers)) return null;

                  const isGatewayQuestion = Boolean(isGateway || q?.isGateway);
                  const selected = answers[q.id];
                  const isMissing = missingIds.includes(q.id);
                  const questionLabel = `${String.fromCharCode(97 + qIdx)})`;

                  const baseButtonStyle = {
                    flex: 1,
                    padding: "8px",
                    borderRadius: "999px",
                    border: "1px solid transparent",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "0.9rem",
                    outline: "none",
                    fontWeight: 700,
                  };

                  return (
                    <div
                      key={q.id}
                      style={{
                        marginBottom: "18px",
                        padding: "16px",
                        borderRadius: "12px",
                        backgroundColor: "#f9fafb",
                        border: isMissing
                          ? "1px solid #fca5a5"
                          : "1px solid #e5e7eb",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <p style={{ fontSize: "0.98rem", marginBottom: "8px", fontWeight: 600, color: "#0F172A" }}>
                        <span style={{ marginRight: "8px" }}>{questionLabel}</span>
                        {q.question}
                      </p>
                      <p style={{ fontSize: "0.85rem", marginBottom: "14px", color: "#6b7280", lineHeight: "1.4" }}>
                        {q.explanation}
                      </p>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleAnswer(q.id, "yes")}
                          style={{
                            ...baseButtonStyle,
                            background:
                              selected === "yes"
                                ? "linear-gradient(135deg, #16a34a, #4ade80)"
                                : "#f3f4f6",
                            color: selected === "yes" ? "white" : "#6b7280",
                            border:
                              selected === "yes"
                                ? "2px solid #16a34a"
                                : "1px solid #d1d5db",
                          }}
                        >
                          Yes
                        </button>

                        {!isGatewayQuestion && (
                          <button
                            onClick={() => handleAnswer(q.id, "partial")}
                            style={{
                              ...baseButtonStyle,
                              background:
                                selected === "partial"
                                  ? "linear-gradient(135deg, #facc15, #fcd34d)"
                                  : "#f3f4f6",
                              color: selected === "partial" ? "#111827" : "#6b7280",
                              border:
                                selected === "partial"
                                  ? "2px solid #d97706"
                                  : "1px solid #d1d5db",
                            }}
                          >
                            Partial
                          </button>
                        )}

                        <button
                          onClick={() => handleAnswer(q.id, "no")}
                          style={{
                            ...baseButtonStyle,
                            background:
                              selected === "no"
                                ? "linear-gradient(135deg, #dc2626, #f87171)"
                                : "#f3f4f6",
                            color: selected === "no" ? "white" : "#6b7280",
                            border:
                              selected === "no"
                                ? "2px solid #dc2626"
                                : "1px solid #d1d5db",
                          }}
                        >
                          No
                        </button>
                      </div>

                      {isMissing && (
                        <p style={{ fontSize: "0.8rem", color: "#b91c1c", marginTop: "8px" }}>
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

        <div style={{ display: "flex", flexDirection: "column", marginTop: "20px", gap: "10px" }}>
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
              fontWeight: 600,
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
              fontWeight: 700,
            }}
          >
            Continue to Stage 3 →
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stage2Organizational;
