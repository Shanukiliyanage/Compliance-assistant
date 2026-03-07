import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Firestore integration - only runs if FIRESTORE_ENABLED is set

let _admin;
let _adminLoadError;

function getAdmin() {
  if (_admin) return _admin;
  if (_adminLoadError) throw _adminLoadError;

  try {
    
    _admin = require("firebase-admin");                                                          // Lazy-load so the backend can run without firebase-admin when disabled.
    return _admin;
  } catch (err) {
    _adminLoadError = err;
    throw err;
  }
}

function parseServiceAccountFromEnv() {
  // service account can be set in env as JSON
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (did you forget to escape quotes?)"
    );
  }
}

let _db;
let _initError;

export function isFirestoreEnabled() {
  // Accept both FIRESTORE_ENABLED=true and FIRESTORE_ENABLED=1.
  return String(process.env.FIRESTORE_ENABLED || "").toLowerCase() === "true" ||
    String(process.env.FIRESTORE_ENABLED || "") === "1";
}

export function getFirestoreDb() {
  // init once and reuse
  if (_db) return _db;
  if (_initError) throw _initError;

  try {
    if (!isFirestoreEnabled()) {
      throw new Error("Firestore disabled");
    }

    const admin = getAdmin();

    if (!admin.apps.length) {
      const serviceAccount = parseServiceAccountFromEnv();
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    }

    _db = admin.firestore();
    return _db;
  } catch (err) {
    _initError = err;
    throw err;
  }
}

export async function saveAssessmentResultToFirestore(result) {
  // save/update assessment result
  const db = getFirestoreDb();
  const docId = result.assessmentId;

  const admin = getAdmin();

  await db.collection("assessments").doc(docId).set(
    {
      ...result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getAssessmentResultFromFirestore(assessmentId) {
  // get assessment result
  const db = getFirestoreDb();
  const snap = await db.collection("assessments").doc(assessmentId).get();
  if (!snap.exists) return null;
  return snap.data();
}
