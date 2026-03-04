// Assessment intro screen — Maze-inspired dark design with Firebase auth modal.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

export default function AssessmentIntro() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleStart = () => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    navigate("/assessment/profile");
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    setLoginData({ email: "", password: "" });
    setError("");
    setIsSignUp(false);
  };

  const handleLoginInputChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setError("");
  };

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

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };

  return (
    <div className="lp">


      {/* â”€â”€ Nav â”€â”€ */}
      <header className="lp__nav">
        <div className="lp__navInner">
          <div className="lp__brand">
            <div className="lp__logo" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 5.5V10.5C17 14 13.5 17 10 18C6.5 17 3 14 3 10.5V5.5L10 2Z"
                  fill="url(#lg1)" />
                <path d="M7 10.5L9.5 13L13 8.5" stroke="white" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#3b82f6"/><stop offset="1" stopColor="#14b8a6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="lp__brandName">ShieldPoint</span>
          </div>

          <nav className="lp__links" aria-label="Primary">
            <a className="lp__link" href="#">Overview</a>
            <a className="lp__link" href="#">Controls</a>
            <a className="lp__link" href="#">How it works</a>
            <a className="lp__link" href="#">Resources</a>
          </nav>

          <div className="lp__navCta">
            <button type="button" className="lp__navBtn"
              onClick={isLoggedIn ? handleLogout : () => setShowLoginModal(true)}>
              {isLoggedIn ? "Log out" : "Log in"}
            </button>
            <button type="button" className="lp__navBtnPrimary" onClick={handleStart}>
              Start assessment
            </button>
          </div>
        </div>
      </header>

      {/* â”€â”€ Hero â”€â”€ */}
      <main className="lp__hero">
        <div className="lp__grid" aria-hidden="true" />
        <div className="lp__blob lp__blob--blue" aria-hidden="true" />
        <div className="lp__blob lp__blob--teal" aria-hidden="true" />

        <div className="lp__heroContent">
          <div className="lp__heroBadge">
            <span className="lp__heroBadgeDot" />
            ISO 27001 · Self-Assessment Platform
          </div>

          <h1 className="lp__headline">
            Get your compliance<br />
            <span className="lp__headlineGrad">under control</span>
          </h1>

          <p className="lp__sub">
            This tool will help you understand your alignment with ISO 27001
            using simple questions. No technical expertise needed.
          </p>

          <ul className="lp__bullets">
            <li>Clear, non-technical questions.</li>
            <li>Covers key ISO 27001 control areas.</li>
            <li>Instant view of your readiness.</li>
          </ul>

          <div className="lp__heroCtas">
            <button type="button" className="lp__ctaPrimary" onClick={handleStart}>
              Start free assessment
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button type="button" className="lp__ctaOutline"
              onClick={isLoggedIn ? handleLogout : () => setShowLoginModal(true)}>
              {isLoggedIn ? `Logged in as ${currentUser?.email}` : "Log in →"}
            </button>
          </div>

        </div>

        {/* Security illustration */}
        <div className="lp__illustration" aria-hidden="true">
          <svg viewBox="0 0 480 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="lp__illustrationSvg">
            <defs>
              <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#14b8a6"/>
              </linearGradient>
              <linearGradient id="barGrad1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#14b8a6"/>
              </linearGradient>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05"/>
              </linearGradient>
              <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Glow background */}
            <ellipse cx="240" cy="200" rx="200" ry="180" fill="url(#glowGrad)"/>

            {/* Orbit rings */}
            <ellipse cx="240" cy="200" rx="170" ry="170" stroke="url(#ringGrad)" strokeWidth="1.5"/>
            <ellipse cx="240" cy="200" rx="130" ry="130" stroke="url(#ringGrad)" strokeWidth="1"/>

            {/* Central shield */}
            <path d="M240 80 L300 108 L300 162 C300 198 274 228 240 240 C206 228 180 198 180 162 L180 108 Z"
              fill="url(#shieldGrad)" opacity="0.15"/>
            <path d="M240 88 L294 113 L294 162 C294 195 270 222 240 233 C210 222 186 195 186 162 L186 113 Z"
              stroke="url(#shieldGrad)" strokeWidth="2" fill="none"/>
            {/* Checkmark */}
            <path d="M218 162 L233 177 L262 148" stroke="white" strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round"/>

            {/* Floating stat cards */}
            {/* Card 1 – top right */}
            <rect x="310" y="90" width="120" height="56" rx="10"
              fill="#0e1117" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
            <text x="322" y="112" fill="rgba(241,245,249,0.45)" fontSize="9" fontFamily="sans-serif" letterSpacing="0.5">CONTROLS PASSED</text>
            <text x="322" y="132" fill="#14b8a6" fontSize="18" fontWeight="700" fontFamily="sans-serif">67/93</text>

            {/* Card 2 – bottom right */}
            <rect x="322" y="260" width="110" height="56" rx="10"
              fill="#0e1117" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
            <text x="334" y="282" fill="rgba(241,245,249,0.45)" fontSize="9" fontFamily="sans-serif" letterSpacing="0.5">OVERALL SCORE</text>
            <text x="334" y="302" fill="#3b82f6" fontSize="18" fontWeight="700" fontFamily="sans-serif">73%</text>

            {/* Card 3 – left */}
            <rect x="50" y="172" width="110" height="56" rx="10"
              fill="#0e1117" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
            <text x="62" y="194" fill="rgba(241,245,249,0.45)" fontSize="9" fontFamily="sans-serif" letterSpacing="0.5">CRITICAL GAPS</text>
            <text x="62" y="214" fill="#f87171" fontSize="18" fontWeight="700" fontFamily="sans-serif">4</text>

            {/* Progress bar strip */}
            <rect x="100" y="310" width="280" height="38" rx="8"
              fill="#0e1117" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            <text x="114" y="325" fill="rgba(241,245,249,0.4)" fontSize="8.5" fontFamily="sans-serif">Access Control</text>
            <rect x="114" y="330" width="156" height="4" rx="2" fill="rgba(255,255,255,0.07)"/>
            <rect x="114" y="330" width="132" height="4" rx="2" fill="url(#barGrad1)"/>
            <text x="278" y="337" fill="#3b82f6" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">85%</text>

            {/* Small dots on orbit */}
            <circle cx="240" cy="30" r="5" fill="#3b82f6" opacity="0.7"/>
            <circle cx="409" cy="200" r="4" fill="#14b8a6" opacity="0.6"/>
            <circle cx="71" cy="200" r="4" fill="#8b5cf6" opacity="0.5"/>
            <circle cx="323" cy="79" r="3" fill="#3b82f6" opacity="0.5"/>
          </svg>
        </div>
      </main>

      {/* â”€â”€ Login Modal â”€â”€ */}
      {showLoginModal && (
        <div className="modalOverlay" role="presentation" onMouseDown={handleCloseModal}>
          <div className="modal" role="dialog" aria-modal="true"
            aria-label={isSignUp ? "Create account" : "Log in"}
            onMouseDown={(e) => e.stopPropagation()}>

            <button className="modal__close" onClick={handleCloseModal} aria-label="Close">✕</button>
            <h2 className="modal__title">{isSignUp ? "Create account" : "Log in to ShieldPoint"}</h2>
            <p className="modal__sub">
              {isSignUp ? "Start your ISO 27001 assessment." : "Continue your compliance assessment."}
            </p>

            {error && <div className="modal__error" role="alert">{error}</div>}

            <div className="modal__field">
              <label className="modal__label" htmlFor="ai-email">Email</label>
              <input id="ai-email" className="modal__input" type="email" name="email"
                placeholder="you@company.com" value={loginData.email}
                onChange={handleLoginInputChange} />
            </div>
            <div className="modal__field">
              <label className="modal__label" htmlFor="ai-pw">Password</label>
              <input id="ai-pw" className="modal__input" type="password" name="password"
                placeholder="••••••••" value={loginData.password}
                onChange={handleLoginInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleLoginSubmit()} />
            </div>

            <button className="modal__submit" onClick={handleLoginSubmit} disabled={loading}>
              {loading ? "Please wait…" : isSignUp ? "Create account" : "Log in"}
            </button>

            <p className="modal__toggle">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <span className="modal__link" onClick={() => { setIsSignUp(!isSignUp); setError(""); }}>
                {isSignUp ? "Log in" : "Sign up"}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}