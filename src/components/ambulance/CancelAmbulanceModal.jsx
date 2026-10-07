import React, { useState } from "react";
import ReactDOM from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { updateAmbulanceStatus } from "../../services/ambulanceService";

export default function CancelAmbulanceModal({
  isOpen,
  onClose,
  requestId,
  onCancelled
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  if (!isOpen) return null;

  const isValid = reason.trim().length > 0;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setTouched(true);

    if (!isValid) {
      setError("Please enter a reason for cancellation.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateAmbulanceStatus({
        requestId,
        status: "cancelled",
        cancellationReason: reason.trim()
      });

      onCancelled?.(reason.trim());
      onClose?.();
    } catch (err) {
      console.error("Cancellation error:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to cancel ambulance request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="cancel-ambulance-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px"
      }}
    >
      <div
        className="cancel-ambulance-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "28px 24px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.22)",
          position: "relative",
          animation: "cancelModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: "20px",
            fontWeight: "800",
            color: "#111827",
            letterSpacing: "-0.01em"
          }}
        >
          Cancel Ambulance Request
        </h3>
        <p
          style={{
            margin: "0 0 18px",
            fontSize: "14px",
            color: "#6b7280",
            lineHeight: "1.4"
          }}
        >
          Please tell us why you're cancelling this request.
        </p>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "10px",
              color: "#dc2626",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched(true)}
              placeholder="Enter reason for cancellation"
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "14px 16px",
                borderRadius: "14px",
                border: touched && !isValid ? "1.5px solid #ef4444" : "1.5px solid #d1d5db",
                fontSize: "14.5px",
                color: "#111827",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
              onFocus={(e) => {
                if (!(touched && !isValid)) {
                  e.target.style.borderColor = "#005963";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 89, 99, 0.12)";
                }
              }}
              onBlurCapture={(e) => {
                e.target.style.boxShadow = "none";
              }}
              autoFocus
            />
            {touched && !isValid && (
              <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600", marginTop: "4px", display: "block" }}>
                Reason is required
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "16px",
              marginTop: "22px"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "transparent",
                border: "none",
                color: "#111827",
                fontSize: "15px",
                fontWeight: "600",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                padding: "8px 12px",
                transition: "opacity 0.2s",
                opacity: isSubmitting ? 0.6 : 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isSubmitting ? "0.6" : "1"; }}
            >
              Go Back
            </button>

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              style={{
                background: "#005963",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "11px 22px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: !isValid || isSubmitting ? "not-allowed" : "pointer",
                opacity: !isValid || isSubmitting ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (isValid && !isSubmitting) {
                  e.currentTarget.style.background = "#00474f";
                }
              }}
              onMouseLeave={(e) => {
                if (isValid && !isSubmitting) {
                  e.currentTarget.style.background = "#005963";
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Cancelling…</span>
                </>
              ) : (
                "Yes, Cancel"
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes cancelModalIn {
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
    </div>
  );

  if (typeof window === "undefined") return modalContent;
  return ReactDOM.createPortal(modalContent, document.body);
}
