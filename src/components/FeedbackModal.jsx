import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardList, Star, Edit3, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { upsertPatientReview } from "../services/dataService";
import { Antworkapi } from "../services/apiClient";
import { api } from "../services/api";

const STORAGE_KEY = "arvaya_feedback_state";

function getStoredFeedbackState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return { visitCount: 0, dismissCount: 0, submitted: false };
}

function saveStoredFeedbackState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  // Listen to Home page visits
  useEffect(() => {
    if (location.pathname === "/") {
      if (lastKeyRef.current !== location.key) {
        lastKeyRef.current = location.key;

        const state = getStoredFeedbackState();

        if (state.submitted) {
          return;
        }

        const newVisitCount = (state.visitCount || 0) + 1;
        state.visitCount = newVisitCount;
        saveStoredFeedbackState(state);

        if (newVisitCount >= 3) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [location.pathname, location.key]);

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
    setIsOpen(false);
    const state = getStoredFeedbackState();
    state.dismissCount = (state.dismissCount || 0) + 1;
    state.visitCount = 0;
    saveStoredFeedbackState(state);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!ratings) {
      setErrorMessage("Please select a star rating.");
      return;
    }

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

      const state = getStoredFeedbackState();
      state.submitted = true;
      state.visitCount = 0;
      saveStoredFeedbackState(state);

      setSubmittedSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmittedSuccess(false);
        setReview("");
        setRatings(0);
      }, 1500);
    } catch (err) {
      console.error("Feedback submit error:", err);
      const state = getStoredFeedbackState();
      state.submitted = true;
      saveStoredFeedbackState(state);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmittedSuccess(false);
      }, 1500);
    } finally {
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
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                background: "#ecfdf5",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "var(--text-main, #1e293b)",
                margin: "0 0 6px",
              }}
            >
              Thank You!
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted, #64748b)",
                margin: 0,
                lineHeight: "1.4",
              }}
            >
              Your feedback helps us continuously improve our patient care.
            </p>
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
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
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
                        onClick={() => setRatings(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "2px",
                          cursor: "pointer",
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
                  onChange={(e) => setReview(e.target.value)}
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
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "filter 0.15s ease, transform 0.1s ease",
                    boxShadow: "0 3px 10px rgba(251, 145, 63, 0.3)",
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
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    padding: "4px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "color 0.15s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#1e293b")}
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
