import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import peopleData from "../data/people.json";

// stage 3 people questions - normalizes JSON, saves to localStorage, validates before moving on
function Stage3People() {
  const navigate = useNavigate();

  // display titles for people controls
  const PEOPLE_TITLES = [
    "Screening",
    "Terms and conditions of employment",
    "Information security awareness, education and training",
    "Disciplinary process",
    "Responsibilities after termination or change of employment",
    "Confidentiality or non-disclosure agreements",
    "Remote working",
    "Information security event reporting",
  ];

  // normalize possible JSON shapes into: [{ id, control, questions: [...] }]
  const controls = useMemo(() => {
    const normalizeQuestions = (qs, controlId = "CTRL") => {
      if (!qs) return [];

      if (Array.isArray(qs)) {
        return qs.map((q, i) => ({
          id: q.id || `${controlId}_Q${i + 1}`,
          question: q.question || q.text || q.q || "",
          explanation: q.explanation || q.help || q.description || "",
        }));
      }

      if (typeof qs === "object") {
        return Object.entries(qs).map(([k, v], i) => ({
          id: `${controlId}_${k || `Q${i + 1}`}`,
          question: typeof v === "string" ? v : v?.question || v?.text || "",
          explanation: v?.explanation || v?.help || "",
        }));
      }

      return [];
    };

    // format A: { controls: [...] }
    if (peopleData && Array.isArray(peopleData.controls)) {
      return peopleData.controls.map((c, idx) => {
        const controlId = c.id || c.controlId || `A6_${idx + 1}`;
        return {
          id: controlId,
          control: c.control || c.title || c.name || c.id || `Control ${idx + 1}`,
          questions: normalizeQuestions(c.questions, controlId),
        };
      });
    }

    // format B: { "A6.1": {control, questions}, ... }
    if (peopleData && typeof peopleData === "object") {
      return Object.entries(peopleData)
        .filter(([key]) => !["stage", "title", "subtitle", "controls"].includes(key))
        .map(([key, value]) => ({
          id: key,
          control: value?.control || value?.title || value?.name || key,
          questions: normalizeQuestions(value?.questions, key),
        }));
    }

    return [];
  }, [peopleData]);

  // restore saved answers
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("stage3");
    return saved ? JSON.parse(saved) : {};
  });
  const [missingIds, setMissingIds] = useState([]);
  const [showValidationError, setShowValidationError] = useState(false);

  // auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("stage3", JSON.stringify(answers));
  }, [answers]);

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (missingIds.includes(questionId)) {
      setMissingIds((prev) => prev.filter((id) => id !== questionId));
    }
    setShowValidationError(false);
  };

  const { answeredCount, totalRequired } = useMemo(() => {
    let total = 0;
    let answered = 0;

    controls.forEach((c) => {
      (c.questions || []).forEach((q) => {
        total += 1;
        if (answers[q.id]) answered += 1;
      });
    });

    return { answeredCount: answered, totalRequired: total };
  }, [answers, controls]);

  const progressPercent =
    totalRequired === 0 ? 0 : Math.round((answeredCount / totalRequired) * 100);

  const validateAndNext = () => {
    const newMissing = [];
    controls.forEach((c) =>
      (c.questions || []).forEach((q) => {
        if (!answers[q.id]) newMissing.push(q.id);
      })
    );

    if (newMissing.length) {
      setMissingIds(newMissing);
      setShowValidationError(true);
      return;
    }

    navigate("/assessment/physical");
  };

  const handleBack = () => navigate("/assessment/organizational");

  // display title logic:
  // 1) use the PEOPLE_TITLES array if the control name is just a placeholder like "Control 1"
  // 2) strip any A.6.x prefix if present
  const getDisplayTitle = (control, idx) => {
    const raw = String(control?.control || "");

    // generic fallback "Control 1" etc
    if (/^control\s+\d+$/i.test(raw)) {
      return PEOPLE_TITLES[idx] || raw;
    }

    // strip A.6.x prefix
    return raw.replace(/^A\.6\.\d+\s*/i, "");
  };

  return (
    <div
      style={{
        padding: "40px 20px",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <h1 style={{ fontSize: "2.2rem", marginBottom: "8px", color: "#f1f5f9" }}>
          Stage 3, People Controls
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "1rem" }}>
          Answer all questions on this page. Every question is mandatory.
        </p>

        {/* progress */}
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

        {/* fixed-size form like organizational */}
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
          {controls.length === 0 ? (
            <div style={{ color: "#6b7280" }}>
              No people controls found. Check <b>src/data/people.json</b>.
            </div>
          ) : (
            controls.map((control, idx) => (
              <section
                key={control.id}
                style={{
                  marginBottom: "28px",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", marginBottom: "12px", fontWeight: 700, color: "#0F172A" }}>
                  {idx + 1}. {getDisplayTitle(control, idx)}
                </h2>

                {(control.questions || []).map((q, qIdx) => {
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
            ))
          )}
        </div>

        {/* bottom buttons match organizational */}
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
            Continue to Stage 4 →
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stage3People;
