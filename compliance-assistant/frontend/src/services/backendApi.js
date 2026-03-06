// In dev, Vite proxies `/api/*` to the backend (see vite.config.js).
// In production, set `VITE_BACKEND_URL` to your backend origin.
const DEFAULT_BASE_URL = "";

// Backend API client (base URL + JSON parsing + error handling).

export function getBackendBaseUrl() {
  // Uses VITE_BACKEND_URL when configured; otherwise local default.
  return (import.meta?.env?.VITE_BACKEND_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function formatNetworkErrorMessage(baseUrl) {
  const where = baseUrl || "(same origin via Vite proxy)";
  return (
    `Cannot reach backend ${where}. ` +
    `Start it with \`npm run dev\` from the \`compliance-assistant\` folder (or ensure port 5000 is running).`
  );
}

async function parseJsonResponse(res) {
  // Parse JSON and throw on HTTP errors.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.ok) return data;

  const message =
    data?.error || data?.message || `Request failed (${res.status})`;
  const details = data?.details ? `: ${data.details}` : "";
  throw new Error(message + details);
}

export async function analyzeAssessment(payload) {
  // Submit answers to compute scores and recommendations.
  const baseUrl = getBackendBaseUrl();
  let res;
  try {
    res = await fetch(`${baseUrl}/api/assessment/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Browsers throw TypeError for network errors (server down, blocked, DNS, etc.)
    throw new Error(formatNetworkErrorMessage(baseUrl));
  }
  return parseJsonResponse(res);
}

export async function getAssessmentResult(assessmentId) {
  // Fetch a saved assessment result.
  const baseUrl = getBackendBaseUrl();
  let res;
  try {
    res = await fetch(`${baseUrl}/api/assessment/result/${assessmentId}`);
  } catch (err) {
    throw new Error(formatNetworkErrorMessage(baseUrl));
  }
  return parseJsonResponse(res);
}

export async function getAssessmentReport(assessmentId) {
  // Fetch report payload (if enabled in backend).
  const baseUrl = getBackendBaseUrl();
  let res;
  try {
    res = await fetch(`${baseUrl}/api/assessment/report/${assessmentId}`);
  } catch (err) {
    throw new Error(formatNetworkErrorMessage(baseUrl));
  }
  return parseJsonResponse(res);
}
