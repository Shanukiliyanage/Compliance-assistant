import fs from "fs";
import path from "path";

// local JSON storage used when Firestore is off

export function ensureJsonFile(filePath, defaultValue = []) {
  // make sure the directory and file exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(filePath)) {
    // create with default value
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return;
  }

  // reset if file is empty or broken
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) throw new Error("Empty file");
    JSON.parse(raw);
  } catch {
    // reset it
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

export function readJson(filePath, fallbackValue) {
  // safe JSON read with fallback
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

export function readJsonArray(filePath) {
  // always returns an array
  ensureJsonFile(filePath, []);
  const value = readJson(filePath, []);
  return Array.isArray(value) ? value : [];
}

export function writeJson(filePath, data) {
  // write JSON with indentation
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
