// Frontend Firestore helper to create an assessment document.

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Creates an assessment document and returns the Firestore document id.
export const createAssessment = async (assessmentData) => {
  const assessment = {
    ...assessmentData,
    metadata: {
      status: "submitted",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };

  const docRef = await addDoc(collection(db, "assessments"), assessment);
  return docRef.id;
};
