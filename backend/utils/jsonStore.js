import fs from "fs";
import path from "path";

// Local JSON persistence helper (used when Firestore is disabled).

export function ensureJsonFile(filePath, defaultValue = []) {
  // Ensure the parent directory and JSON file exist.
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(filePath)) {
    // Initialize with a default value.
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return;
  }

  // If file exists but is empty/invalid, reset to default
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) throw new Error("Empty file");
    JSON.parse(raw);
  } catch {
    // Reset invalid content.
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

export function readJson(filePath, fallbackValue) {
  // Read JSON safely; return fallback on error.
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

export function readJsonArray(filePath) {
  // Convenience: always returns an array.
  ensureJsonFile(filePath, []);
  const value = readJson(filePath, []);
  return Array.isArray(value) ? value : [];
}

export function writeJson(filePath, data) {
  // Write JSON with pretty formatting.
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
