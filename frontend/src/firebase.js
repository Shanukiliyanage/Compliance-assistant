import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase client initialization (Auth + Firestore).
const firebaseConfig = {
  apiKey: "AIzaSyAcUKzvr-deXvJJ5M832Aj4V6VpS-cu-1o",
  authDomain: "compliance-assistant-eb18f.firebaseapp.com",
  projectId: "compliance-assistant-eb18f",
  storageBucket: "compliance-assistant-eb18f.firebasestorage.app",
  messagingSenderId: "458763959198",
  appId: "1:458763959198:web:bfedaf3af8c6b6018e748f"
};

// Initialize Firebase app instance.
const app = initializeApp(firebaseConfig);

// Export Auth instance for login/logout flows.
export const auth = getAuth(app);

// Export Firestore instance for assessment storage.
export const db = getFirestore(app);


