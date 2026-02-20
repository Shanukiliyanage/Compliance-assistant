// Prefer same-origin `/api` calls in dev (Vite proxy). Override with VITE_BACKEND_URL.
const API_BASE = (import.meta?.env?.VITE_BACKEND_URL || "").replace(/\/$/, "");

// Simple helper to submit an assessment to the backend.

export async function submitAssessment({ userId, answers, smeProfile }) {
  // Submits answers and returns the backend result.
  const response = await fetch(`${API_BASE}/api/assessment/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId,
      answers,
      smeProfile
    })
  });

  if (!response.ok) {
    // Backend returns { error: "..." } on failure.
    const err = await response.json();
    throw new Error(err.error || "Assessment submission failed");
  }

  return response.json();
}
