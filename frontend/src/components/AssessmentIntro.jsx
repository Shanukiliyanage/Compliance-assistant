// Assessment intro screen with Firebase login/sign-up modal.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import heroImage from "../assets/landing-hero.png";

export default function AssessmentIntro() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep UI auth state in sync with Firebase.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Start button: requires authentication.
  const handleStart = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    navigate("/assessment/profile");
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // Close modal and reset modal fields.
  const handleCloseModal = () => {
    setShowLoginModal(false);
    setLoginData({ email: "", password: "" });
    setError("");
    setIsSignUp(false);
  };

  // Update login form fields.
  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData({
      ...loginData,
      [name]: value,
    });
    setError("");
  };

  // Submit login/sign-up.
  const handleLoginSubmit = async () => {
    if (!loginData.email || !loginData.password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, loginData.email, loginData.password);
      } else {
        await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      }
      
      handleCloseModal();
      navigate("/assessment/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout and clear local auth state.
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAF5EF",
        padding: "40px 60px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TOP NAV */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "50px",
        }}
      >
        {/* Brand/Logo area */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              backgroundColor: "#0F172A",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            i
          </div>
          <h2 style={{ margin: 0, color: "#0F172A" }}>ISO Assistant</h2>
        </div>

        {/* Static nav links (currently non-clickable placeholders) */}
        <nav
          style={{
            display: "flex",
            gap: "28px",
            color: "#0F172A",
          }}
        >
          <span>Overview</span>
          <span>How it works</span>
          <span>Controls</span>
          <span>Pricing</span>
        </nav>

        {/* Auth button: switches between "Log in" and "Logout (email)" based on auth state */}
        <button
          onClick={isLoggedIn ? handleLogout : handleLoginClick}
          style={{
            padding: "10px 24px",
            borderRadius: "40px",
            border: "2px solid #0F172A",
            background: "white",
            color: "#0F172A",
            cursor: "pointer",
          }}
        >
          {isLoggedIn ? `Logout (${currentUser?.email})` : "Log in"}
        </button>
      </header>

      {/* HERO */}
      <main
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left side: headline + value props + CTA */}
        <section style={{ width: "60%" }}>
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: "20px",
              backgroundColor: "#E8EDFF",
              marginBottom: "20px",
            }}
          >
            ISO 27001:2022 • Self assessment
          </div>

          <h1
            style={{
              fontSize: "3.2rem",
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            Welcome to the ISO 27001
            <br />
            Compliance Assistant
          </h1>

          <p style={{ color: "#4B5563", fontSize: "1.1rem" }}>
            This tool will help you understand your alignment with ISO 27001
            using simple questions. No technical expertise needed.
          </p>

          {/* Bulleted value proposition list */}
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              marginTop: "24px",
              color: "#0F172A",
            }}
          >
            <li>• Clear, non-technical questions.</li>
            <li>• Covers key ISO 27001 control areas.</li>
            <li>• Instant view of your readiness.</li>
          </ul>

          {/* Primary call-to-action */}
          <div style={{ marginTop: "32px", display: "flex", gap: "18px" }}>
            <button
              onClick={handleStart}
              style={{
                padding: "14px 40px",
                borderRadius: "40px",
                background:
                  "linear-gradient(135deg, #2563eb, #12A798)",
                color: "white",
                border: "none",
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              Start assessment
            </button>

            <span style={{ color: "#4B5563" }}>
              Takes less than 10 minutes.
            </span>
          </div>
        </section>

        {/* Right side: hero illustration with a decorative background circle */}
        <section style={{ width: "40%", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              width: "380px",
              height: "380px",
              borderRadius: "50%",
              backgroundColor: "#E1B917",
              right: "-60px",
              top: "80px",
              opacity: 0.35,
            }}
          />
          <img
            src={heroImage}
            alt="Illustration"
            style={{
              width: "460px",
              borderRadius: "28px",
              position: "relative",
              zIndex: 1,
            }}
          />
        </section>
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        // Full-screen overlay + centered modal dialog.
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "40px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Modal title changes based on mode */}
            <h2
              style={{
                margin: "0 0 30px 0",
                color: "#0F172A",
                fontSize: "1.8rem",
              }}
            >
              {isSignUp ? "Create Account" : "Log in"}
            </h2>

            {/* Error banner if login/signup fails or validation fails */}
            {error && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "12px",
                  backgroundColor: "#FEE2E2",
                  color: "#DC2626",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Email input */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#0F172A",
                  fontWeight: "500",
                }}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginInputChange}
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password input */}
            <div style={{ marginBottom: "30px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#0F172A",
                  fontWeight: "500",
                }}
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginInputChange}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Action buttons: primary submit + secondary cancel */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <button
                onClick={handleLoginSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #2563eb, #12A798)",
                  color: "white",
                  border: "none",
                  fontSize: "1rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Loading..." : isSignUp ? "Sign Up" : "Log in"}
              </button>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#f3f4f6",
                  color: "#0F172A",
                  border: "1px solid #d1d5db",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
            </div>

            {/* Mode switch: log in <-> sign up */}
            <div
              style={{
                textAlign: "center",
                color: "#4B5563",
                fontSize: "0.9rem",
              }}
            >
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span
                    onClick={() => setIsSignUp(false)}
                    style={{
                      color: "#2563eb",
                      cursor: "pointer",
                      fontWeight: "500",
                      textDecoration: "underline",
                    }}
                  >
                    Log in
                  </span>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <span
                    onClick={() => setIsSignUp(true)}
                    style={{
                      color: "#2563eb",
                      cursor: "pointer",
                      fontWeight: "500",
                      textDecoration: "underline",
                    }}
                  >
                    Sign up
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
