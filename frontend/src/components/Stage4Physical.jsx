import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import physicalData from "../data/physical.json";

// Stage 4 (Physical) questionnaire.
// Normalizes the JSON shape, persists answers in localStorage, and validates completion.
function Stage4Physical() {
  const navigate = useNavigate();

  // Normalize JSON into: [{ id, control, questions: [{ id, question, explanation }] }]
  const controls = useMemo(() => {
    const normalizeQuestions = (qs, controlId = "CTRL") => {
      if (!qs) return [];

      // Array format
      if (Array.isArray(qs)) {
        return qs.map((q, i) => ({
          id: q.id || `${controlId}_Q${i + 1}`,
          question: q.question || q.text || q.q || "",
          explanation: q.explanation || q.help || q.description || "",
        }));
      }

      // Object format (Q1/Q2 keys)
      if (typeof qs === "object") {
        return Object.entries(qs).map(([k, v], i) => ({
          id: `${controlId}_${k || `Q${i + 1}`}`,
          question: typeof v === "string" ? v : v?.question || v?.text || "",
          explanation: v?.explanation || v?.help || "",
        }));
      }

      return [];
    };

    // Format A: { stage, title, subtitle, controls: [...] }
    if (physicalData && Array.isArray(physicalData.controls)) {
      return physicalData.controls.map((c, idx) => {
        const controlId = c.id || c.controlId || `A7_${idx + 1}`;
        return {
          id: controlId,
          control: c.control || c.title || c.name || `Control ${idx + 1}`,
          questions: normalizeQuestions(c.questions, controlId),
        };
      });
    }

    // Format B: { "A7.1": {control, questions}, ... }
    if (physicalData && typeof physicalData === "object") {
      return Object.entries(physicalData)
        .filter(([key]) => !["stage", "title", "subtitle", "controls"].includes(key))
        .map(([key, value]) => ({
          id: key,
          control: value?.control || value?.title || key,
          questions: normalizeQuestions(value?.questions, key),
        }));
    }

    return [];
  }, []);

  // Load saved answers from localStorage.
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("stage4");
    return saved ? JSON.parse(saved) : {};
  });
  const [missingIds, setMissingIds] = useState([]);
  const [showValidationError, setShowValidationError] = useState(false);
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("stage4_notes");
    return saved ? JSON.parse(saved) : {};
  });

  // Persist answers and notes to localStorage.
  useEffect(() => {
    localStorage.setItem("stage4", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem("stage4_notes", JSON.stringify(notes));
  }, [notes]);

  const handleNote = (questionId, value) => {
    setNotes(prev => ({ ...prev, [questionId]: value }));
  };

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

    // ✅ Stage 5
    navigate("/assessment/technological");
  };

  const handleBack = () => navigate("/assessment/people");

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
          Stage 4, Physical Controls
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "1rem" }}>
          Answer all questions on this page. Every question is mandatory.
        </p>

        {/* Progress */}
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

        {/* Form */}
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
              No physical controls found. Check <b>src/data/physical.json</b>.
            </div>
          ) : (
            controls.map((control, controlIdx) => (
              <section
                key={control.id}
                style={{
                  marginBottom: "28px",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: "24px",
                }}
              >
                {/* Control title */}
                <h2 style={{ fontSize: "1.2rem", marginBottom: "14px", color: "#0F172A" }}>
                  {controlIdx + 1}. {control.control}
                </h2>

                {(control.questions || []).map((q, qIdx) => {
                  const selected = answers[q.id];
                  const isMissing = missingIds.includes(q.id);
                  const questionLabel = `${String.fromCharCode(97 + qIdx)})`;

                  const baseButtonStyle = {
                    flex: 1,
                    padding: "10px",
                    borderRadius: "999px",
                    border: "2px solid transparent",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    outline: "none",
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
                      <p
                        style={{
                          fontSize: "0.98rem",
                          marginBottom: "8px",
                          fontWeight: 600,
                          color: "#0F172A",
                        }}
                      >
                        <span style={{ marginRight: "8px" }}>{questionLabel}</span>
                        {q.question}
                      </p>

                      {q.explanation ? (
                        <p
                          style={{
                            fontSize: "0.85rem",
                            marginBottom: "14px",
                            color: "#6b7280",
                            lineHeight: "1.4",
                          }}
                        >
                          {q.explanation}
                        </p>
                      ) : null}

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
                            border: selected === "yes"
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
                            border: selected === "partial"
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
                            border: selected === "no"
                              ? "2px solid #dc2626"
                              : "1px solid #d1d5db",
                          }}
                        >
                          No
                        </button>
                      </div>

                      {isMissing && (
                        <p style={{ fontSize: "0.8rem", color: "#b91c1c", marginTop: "10px" }}>
                          This question is required.
                        </p>
                      )}

                      {(selected === "no" || selected === "partial") && (
                        <div style={{ marginTop: "12px" }}>
                          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "6px", fontWeight: 600 }}>
                            {selected === "partial" ? "What is currently in place? (optional)" : "What is preventing implementation? (optional)"}
                          </p>
                          <textarea
                            rows={2}
                            value={notes[q.id] || ""}
                            onChange={e => handleNote(q.id, e.target.value)}
                            placeholder={selected === "partial" ? "Describe what you have implemented so far..." : "Describe the reason or any plans to address this..."}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit", color: "#374151", background: "#fff", boxSizing: "border-box" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>

        {/* Bottom buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "20px",
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
            Continue to Stage 5 →
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stage4Physical;
