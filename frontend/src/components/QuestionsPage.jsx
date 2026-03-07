import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mandatoryData from "../data/mandatory.json";

// stage 1 questions - saves answers to localStorage and blocks progress until everything's answered

// flatten mandatory.json into a usable question array
function getMandatoryItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.default)) return data.default;

  // handle older data shapes
  if (data && typeof data === "object") {
    const flattened = [];
    for (const v of Object.values(data)) {
      if (Array.isArray(v?.questions)) flattened.push(...v.questions);
    }
    if (flattened.length) return flattened;
  }

  return [];
}

// clause section headings
const clauseTitles = {
  4: "Clause 4: Context of the Organization",
  5: "Clause 5: Leadership",
  6: "Clause 6: Planning (Risk Assessment & Treatment)",
  7: "Clause 7: Support (Resources, Competence, Awareness)",
  8: "Clause 8: Operation (Implementing and Running Controls)",
  9: "Clause 9: Performance Evaluation",
  10: "Clause 10: Improvement",
};

// pulls the top-level clause number, e.g. "4.1" -> 4
function getMajorClause(value) {
  const m = /^\s*(\d+)/.exec(String(value ?? ""));
  return m ? Number(m[1]) : NaN;
}

// fallback to extract clause from ids like "4.1.Q1"
function extractClause(value) {
  const s = String(value ?? "").trim();
  const m = /^(\d+(?:\.\d+)+)/.exec(s);
  return m ? m[1] : "";
}

function QuestionsPage() {
  const navigate = useNavigate();

  // load questions once
  const mandatoryItems = useMemo(() => getMandatoryItems(mandatoryData), []);

  // group by clause (4 through 10)
  const sections = useMemo(
    () => {
      const items = mandatoryItems;
      const grouped = new Map();

      for (const q of items) {
        // get clause number
        const clause = String(q?.clause ?? extractClause(q?.id) ?? "").trim();
        const major = getMajorClause(clause);
        if (!Number.isFinite(major)) continue;
        if (!grouped.has(major)) grouped.set(major, []);
        grouped.get(major).push({
          // this id is also the localStorage key
          id: String(q?.clause ? clause : (q?.id ?? clause)).trim(),
          question: q?.question ?? q?.text,
          explanation: q?.explanation ?? q?.helpText,
          parts: q?.parts,
        });
      }

      return Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([major, questions]) => ({
          id: `clause-${major}`,
          title: clauseTitles[major] || `Clause ${major}`,
          questions,
        }));
    },
    [mandatoryItems]
  );

  // restore saved answers so nothing gets lost on refresh
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("stage1");
    if (!saved) return {};

    try {
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object") return {};

      // migrate old keys to current clause keys
      const items = mandatoryItems;
      const idToClause = new Map(items.map((q) => [String(q?.id), String(q?.clause ?? "").trim()]));
      const migrated = {};

      for (const [k, v] of Object.entries(parsed)) {
        const clauseKey = idToClause.get(String(k));
        migrated[clauseKey || String(k)] = v;
      }

      return migrated;
    } catch {
      return {};
    }
  });

  // tracks unanswered questions to highlight them
  const [missingIds, setMissingIds] = useState([]);
  const [showValidationError, setShowValidationError] = useState(false);

  // auto-save to localStorage (scoring runs on the backend, not here)
  useEffect(() => {
    localStorage.setItem("stage1", JSON.stringify(answers));
  }, [answers]);

  // handle Yes/Partial/No clicks
  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    if (missingIds.includes(questionId)) {
      setMissingIds((prev) => prev.filter((id) => id !== questionId));
    }
    setShowValidationError(false);
  };

  // don't let them continue until all questions are answered
  const validateAndNext = () => {
    const newMissing = [];

    sections.forEach((section) => {
      section.questions.forEach((q) => {
        if (!answers[q.id]) newMissing.push(q.id);
      });
    });

    if (newMissing.length) {
      setMissingIds(newMissing);
      setShowValidationError(true);
      return;
    }

    navigate("/assessment/organizational");
  };

  // progress bar
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredCount = sections.reduce((sum, section) => {
    return (
      sum +
      section.questions.reduce((inner, q) => inner + (answers?.[q.id] ? 1 : 0), 0)
    );
  }, 0);
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          marginBottom: "12px",
          color: "#f1f5f9",
        }}
      >
        Stage 1 • Mandatory Clauses (Clauses 4-10)
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
        These questions cover the foundational requirements of ISO 27001. Answer based on your current situation.
      </p>

      {/* PROGRESS (match Stage 2 style) */}
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
            Answered {answeredCount} of {totalQuestions}
          </span>
          <span>{completionPercentage}% complete</span>
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
              width: `${completionPercentage}%`,
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #2563eb, #14b8a6)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* SCALE EXPLANATION */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(20, 184, 166, 0.08))",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid rgba(20, 184, 166, 0.2)",
          marginBottom: "28px",
          fontSize: "0.95rem",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <strong style={{ color: "#e2e8f0" }}>Yes:</strong>{" "}
          <span style={{ color: "#94a3b8" }}>This is in place and everyone in the organisation follows it.</span>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <strong style={{ color: "#e2e8f0" }}>Partial:</strong>{" "}
          <span style={{ color: "#94a3b8" }}>This exists but is not fully done, not always followed, or only applies to some parts of the business.</span>
        </div>
        <div>
          <strong style={{ color: "#e2e8f0" }}>No:</strong>{" "}
          <span style={{ color: "#94a3b8" }}>This is not in place yet, even if you are planning to do it in the future.</span>
        </div>
      </div>

      {/* FORM */}
      <div
        style={{
          background: "white",
          padding: "32px",
          borderRadius: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        {/* Render each clause section, then render each question inside it. */}
        {sections.map((section, sectionIdx) => (
          <section
            key={section.id}
            style={{
              marginBottom: "28px",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                marginBottom: "16px",
                color: "#0F172A",
                fontWeight: "700",
              }}
            >
              {sectionIdx + 1}. {section.title}
            </h2>

            {section.questions.map((q, qIdx) => {
              // a), b), c) labels
              const questionLabel = `${String.fromCharCode(97 + qIdx)})`;

              // drives button highlight style
              const selected = answers[q.id];
              const isMissing = missingIds.includes(q.id);

              // base button styles
              const baseButtonStyle = {
                flex: 1,
                padding: "8px",
                borderRadius: "999px",
                border: "1px solid transparent",
                cursor: "pointer",
                color: "white",
                fontSize: "0.9rem",
                fontWeight: 700
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
                  {(() => {
                    // some questions have multiple parts (q.parts or q.question as array)
                    const questionText = q?.question;
                    const parts = Array.isArray(q?.parts)
                      ? q.parts
                      : Array.isArray(questionText)
                        ? questionText
                        : null;

                    if (parts && parts.length > 1) {
                      const main = String(parts[0] ?? "");
                      const subparts = parts.slice(1).map((p) => String(p ?? ""));
                      return (
                        <div style={{ display: "grid", gap: "6px", marginBottom: "8px" }}>
                          <p
                            style={{
                              fontSize: "0.98rem",
                              fontWeight: "500",
                              color: "#0F172A",
                            }}
                          >
                            <span style={{ marginRight: "8px" }}>{questionLabel}</span>
                            {main}
                          </p>
                          {subparts.map((p, idx) => (
                            <p
                              key={idx}
                              style={{
                                fontSize: "0.95rem",
                                fontWeight: 500,
                                color: "#0F172A",
                                paddingLeft: "22px",
                              }}
                            >
                              {String.fromCharCode(97 + idx)}) {p}
                            </p>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <p
                        style={{
                          fontSize: "0.98rem",
                          marginBottom: "8px",
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        <span style={{ marginRight: "8px" }}>{questionLabel}</span>
                        {String(questionText ?? "")}
                      </p>
                    );
                  })()}

                  {q.explanation && (
                    <p style={{ fontSize: "0.85rem", marginBottom: "14px", color: "#6b7280", lineHeight: "1.4" }}>
                      {q.explanation}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    {/* YES */}
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

                    {/* PARTIAL */}
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

                    {/* NO */}
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
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#b91c1c",
                        marginTop: "8px"
                      }}
                    >
                      This question is required.
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {/* NEXT */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "28px",
          gap: "12px",
        }}
      >
        {showValidationError && (
          <p style={{
            margin: 0,
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            color: "#b91c1c",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}>
            Please answer all questions before continuing. Unanswered questions are highlighted.
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <button
          onClick={() => navigate("/assessment/profile")}
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
          onClick={validateAndNext}
          style={{
            padding: "12px 32px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #2563eb, #14b8a6)",
            border: "none",
            cursor: "pointer",
            color: "white",
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
          Continue to Stage 2 →
        </button>
        </div>
      </div>
    </div>
    );
}

export default QuestionsPage;
