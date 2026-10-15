import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardList, Star, Edit3, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { upsertPatientReview } from "../services/dataService";
import { Antworkapi } from "../services/apiClient";
import { api } from "../services/api";
import useScrollLock from "../hooks/useScrollLock";

const STORAGE_KEY_PREFIX = "arvaya_feedback_state";
const SUCCESS_AUTO_CLOSE_MS = 4000;

const RATING_MESSAGES = {
  1: "We're sorry — we'll do better",
  2: "Thanks for being honest",
  3: "Thanks — we'll keep improving",
  4: "Glad you had a good experience!",
  5: "You made our day!",
};

// Stored per user so the "submitted" flag survives logout/re-login.
function getStorageKey(userKey) {
  return `${STORAGE_KEY_PREFIX}_${userKey}`;
}

function getStoredFeedbackState(userKey) {
  try {
    const raw = localStorage.getItem(getStorageKey(userKey));
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return { visitCount: 0, dismissCount: 0, submitted: false };
}

function saveStoredFeedbackState(userKey, state) {
  try {
    localStorage.setItem(getStorageKey(userKey), JSON.stringify(state));
  } catch (e) { }
}

export default function FeedbackModal() {
  const { user } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [ratings, setRatings] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const lastKeyRef = useRef(null);
  const successTimerRef = useRef(null);
  // Synchronous lock so a fast double-click can't submit the review twice
  const submitLockRef = useRef(false);

  useScrollLock(isOpen);

  // Helper to get patient ID
  const getPatientId = () => {
    if (user) {
      const raw = user.patient_id || user.id || user.user_id || user.app_user_id;
      if (raw) return Number(raw) || raw;
    }
    try {
      const stored = localStorage.getItem("arvaya_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const raw = parsed?.patient_id || parsed?.id || parsed?.user_id || parsed?.app_user_id;
        if (raw) return Number(raw) || raw;
      }
    } catch (e) { }
    return 107707;
  };

  // Key for per-user feedback state. Prefers id/user_id/app_user_id because
  // switchProfile overwrites those, while patient_id can carry over from the
  // previously logged-in profile.
  const getFeedbackUserKey = () => {
    const raw = user?.id || user?.user_id || user?.app_user_id || user?.patient_id;
    return raw ? String(raw) : String(getPatientId());
  };
  const feedbackUserKey = user ? getFeedbackUserKey() : null;

  // Clear the form whenever the modal closes so it always reopens fresh
  useEffect(() => {
    if (isOpen) return;
    clearTimeout(successTimerRef.current);
    setRatings(0);
    setHoverRating(0);
    setReview("");
    setErrorMessage("");
    setSubmittedSuccess(false);
  }, [isOpen]);

  // Close the modal when the logged-in user changes (logout or account switch)
  useEffect(() => {
    setIsOpen(false);
  }, [feedbackUserKey]);

  // Listen to Home page visits (logged-in users only)
  useEffect(() => {
    if (!user) return;

    if (location.pathname === "/") {
      if (lastKeyRef.current !== location.key) {
        lastKeyRef.current = location.key;

        const state = getStoredFeedbackState(getFeedbackUserKey());

        if (state.submitted) {
          return;
        }

        const newVisitCount = (state.visitCount || 0) + 1;
        state.visitCount = newVisitCount;
        saveStoredFeedbackState(getFeedbackUserKey(), state);

        if (newVisitCount >= 3) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [location.pathname, location.key, user]);

  // Support manual trigger via custom event
  useEffect(() => {
    const handleManualOpen = () => {
      setIsOpen(true);
      setSubmittedSuccess(false);
      setErrorMessage("");
      setRatings(0);
      setHoverRating(0);
      setReview("");
    };
    window.addEventListener("arvaya_open_feedback", handleManualOpen);
    return () => window.removeEventListener("arvaya_open_feedback", handleManualOpen);
  }, []);

  const handleDismiss = () => {
    if (submitLockRef.current) return;
    setIsOpen(false);
    const state = getStoredFeedbackState(getFeedbackUserKey());
    state.dismissCount = (state.dismissCount || 0) + 1;
    state.visitCount = 0;
    saveStoredFeedbackState(getFeedbackUserKey(), state);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitLockRef.current) return;
    if (!ratings) {
      setErrorMessage("Please select a star rating.");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    setErrorMessage("");

    const payload = {
      patient_id: getPatientId(),
      ratings: Number(ratings),
      review: review.trim() || "Good",
      is_active: 1,
    };

    try {
      try {
        await upsertPatientReview(payload);
      } catch (err1) {
        try {
          await Antworkapi.post("/api/patientReview/upsert", payload);
        } catch (err2) {
          await api.post("/api/patientReview/upsert", payload);
        }
      }

      const state = getStoredFeedbackState(getFeedbackUserKey());
      state.submitted = true;
      state.visitCount = 0;
      saveStoredFeedbackState(getFeedbackUserKey(), state);

      // Let listeners (e.g. Home's "What Our Patients Say") refresh their reviews
      window.dispatchEvent(new Event("arvaya_feedback_submitted"));

      setSubmittedSuccess(true);
      successTimerRef.current = setTimeout(() => setIsOpen(false), SUCCESS_AUTO_CLOSE_MS);
    } catch (err) {
      console.error("Feedback submit error:", err);
      const state = getStoredFeedbackState(getFeedbackUserKey());
      state.submitted = true;
      saveStoredFeedbackState(getFeedbackUserKey(), state);
      setSubmittedSuccess(true);
      successTimerRef.current = setTimeout(() => setIsOpen(false), SUCCESS_AUTO_CLOSE_MS);
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  if (!isOpen) return null;


  const activeStarCount = hoverRating || ratings;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        overflowY: "auto",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.28)",
          overflow: "hidden",
          position: "relative",
          animation: "feedbackScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        <style>{`
          @keyframes feedbackScaleUp {
            from {
              opacity: 0;
              transform: scale(0.96) translateY(8px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>

        {submittedSuccess ? (
          /* Thank You State */
          <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
            <style>{`
              @keyframes feedbackCheckPop {
                0% { opacity: 0; transform: scale(0.4); }
                60% { opacity: 1; transform: scale(1.12); }
                100% { opacity: 1; transform: scale(1); }
              }
              @keyframes feedbackRingPulse {
                0% { opacity: 0.55; transform: scale(1); }
                100% { opacity: 0; transform: scale(1.7); }
              }
              @keyframes feedbackFadeUp {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes feedbackStarIn {
                0% { opacity: 0; transform: scale(0.3) rotate(-30deg); }
                70% { opacity: 1; transform: scale(1.15) rotate(6deg); }
                100% { opacity: 1; transform: scale(1) rotate(0); }
              }
              @keyframes feedbackTwinkle {
                0%, 100% { opacity: 0.25; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.15); }
              }
              @media (prefers-reduced-motion: reduce) {
                .feedback-success * { animation: none !important; opacity: 1 !important; }
              }
            `}</style>

            <div className="feedback-success" style={{ display: "contents" }}>
              {/* Teal hero with animated check */}
              <div
                style={{
                  position: "relative",
                  background: "linear-gradient(135deg, #006874 0%, #005660 100%)",
                  padding: "34px 20px 46px",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {/* Decorative circles */}
                <span style={{ position: "absolute", top: "-40px", left: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                <span style={{ position: "absolute", bottom: "-50px", right: "-20px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

                {/* Twinkling sparkles */}
                {[
                  { top: "22%", left: "22%", size: 6, delay: "0s", color: "#fbbf24" },
                  { top: "30%", right: "20%", size: 8, delay: "0.4s", color: "#ffffff" },
                  { bottom: "26%", left: "28%", size: 5, delay: "0.8s", color: "#ffffff" },
                  { bottom: "32%", right: "27%", size: 6, delay: "0.2s", color: "#fb923c" },
                  { top: "16%", right: "36%", size: 4, delay: "1s", color: "#fbbf24" },
                ].map(({ size, delay, color, ...pos }, i) => (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      ...pos,
                      width: `${size}px`,
                      height: `${size}px`,
                      borderRadius: "50%",
                      background: color,
                      animation: `feedbackTwinkle 1.6s ease-in-out ${delay} infinite`,
                    }}
                  />
                ))}

                <div style={{ position: "relative", width: "76px", height: "76px" }}>
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.6)",
                      animation: "feedbackRingPulse 1.6s ease-out 0.3s infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      width: "76px",
                      height: "76px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 10px 24px -6px rgba(0,0,0,0.35)",
                      animation: "feedbackCheckPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                    }}
                  >
                    <CheckCircle2 size={44} strokeWidth={2.2} />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  position: "relative",
                  marginTop: "-18px",
                  background: "#ffffff",
                  borderRadius: "18px 18px 0 0",
                  padding: "22px 24px 22px",
                }}
              >
                <h3
                  style={{
                    fontSize: "21px",
                    fontWeight: "800",
                    color: "var(--text-main, #1e293b)",
                    margin: "0 0 6px",
                    animation: "feedbackFadeUp 0.4s ease-out 0.15s both",
                  }}
                >
                  Thank You!
                </h3>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-muted, #64748b)",
                    margin: "0 auto",
                    maxWidth: "300px",
                    lineHeight: "1.5",
                    animation: "feedbackFadeUp 0.4s ease-out 0.25s both",
                  }}
                >
                  Your feedback helps us continuously improve our patient care.
                </p>

                {ratings > 0 && (
                  <div
                    style={{
                      margin: "16px auto 0",
                      padding: "12px 16px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "14px",
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      animation: "feedbackFadeUp 0.4s ease-out 0.35s both",
                    }}
                  >
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={22}
                          strokeWidth={1.8}
                          color={n <= ratings ? "#f59e0b" : "#cbd5e1"}
                          fill={n <= ratings ? "#f59e0b" : "none"}
                          style={{ animation: `feedbackStarIn 0.4s ease-out ${0.4 + n * 0.08}s both` }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#b45309" }}>
                      {RATING_MESSAGES[ratings]}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "20px",
                    height: "42px",
                    border: "none",
                    borderRadius: "10px",
                    background: "var(--accent, #FB913F)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 3px 10px rgba(251, 145, 63, 0.3)",
                    animation: "feedbackFadeUp 0.4s ease-out 0.5s both",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Complete Edge-to-Edge Banner Header ── */}
            <div
              style={{
                background: "linear-gradient(135deg, #006874 0%, #005660 100%)",
                padding: "16px 18px",
                color: "#ffffff",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                flexShrink: 0,
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                disabled={loading}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "background 0.2s ease",
                }}
                onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"; }}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                aria-label="Close feedback modal"
              >
                <X size={16} strokeWidth={2.2} />
              </button>

              {/* Clipboard Icon Badge */}
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px",
                  color: "#ffffff",
                }}
              >
                <ClipboardList size={20} strokeWidth={2.2} />
              </div>

              {/* Title & Subtitle */}
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  margin: "0 0 3px",
                  color: "#ffffff",
                  fontFamily: "var(--font-display, var(--font-sans))",
                  letterSpacing: "-0.01em",
                }}
              >
                How was your experience?
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  margin: 0,
                  color: "rgba(255, 255, 255, 0.9)",
                  lineHeight: "1.4",
                  maxWidth: "92%",
                }}
              >
                Your feedback helps us improve care for every patient.
              </p>
            </div>

            {/* ── Modal Body Content (Clean, No Inner Cards) ── */}
            <div
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                overflowY: "auto",
              }}
            >
              {/* Section 1: Rate Your Experience (No Card Box) */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#FEF3C7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F59E0B",
                    }}
                  >
                    <Star size={13} fill="#F59E0B" stroke="#F59E0B" />
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    Rate Your Experience
                  </span>
                </div>

                {/* Stars Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "4px 0",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= activeStarCount;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        disabled={loading}
                        onClick={() => setRatings(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "2px",
                          cursor: loading ? "default" : "pointer",
                          outline: "none",
                          transition: "transform 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                        aria-label={`${starValue} star`}
                      >
                        <Star
                          size={30}
                          strokeWidth={1.8}
                          fill={isFilled ? "#F59E0B" : "none"}
                          color={isFilled ? "#F59E0B" : "#cbd5e1"}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Suggestions & Feedback (No Card Box) */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#E4EEEF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#006874",
                    }}
                  >
                    <Edit3 size={13} strokeWidth={2.2} />
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    Suggestions &amp; Feedback
                  </span>
                </div>

                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  disabled={loading}
                  placeholder="Share your feedback or suggestions with us."
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    padding: "10px 12px",
                    fontSize: "13px",
                    color: "#1e293b",
                    fontFamily: "inherit",
                    resize: "none",
                    outline: "none",
                    minHeight: "72px",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--primary, #006874)";
                    e.target.style.boxShadow = "0 0 0 2.5px rgba(0, 104, 116, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "11px",
                    marginTop: "4px",
                    color: review.length >= 1000 ? "#dc2626" : "#94a3b8",
                  }}
                >
                  {review.length}/1000
                </div>
              </div>

              {errorMessage && (
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    textAlign: "center",
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* Submit & Not Now Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "2px" }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "10px",
                    background: "var(--accent, #FB913F)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: loading ? "default" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "filter 0.15s ease, transform 0.1s ease",
                    boxShadow: loading ? "none" : "0 3px 10px rgba(251, 145, 63, 0.3)",
                  }}
                  onMouseOver={(e) => {
                    if (!loading) e.currentTarget.style.filter = "brightness(1.08)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.filter = "none";
                  }}
                  onMouseDown={(e) => {
                    if (!loading) e.currentTarget.style.transform = "scale(0.99)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Feedback</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    padding: "4px",
                    cursor: loading ? "default" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    textAlign: "center",
                    transition: "color 0.15s ease",
                  }}
                  onMouseOver={(e) => { if (!loading) e.currentTarget.style.color = "#1e293b"; }}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#64748b")}
                >
                  Not Now
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
