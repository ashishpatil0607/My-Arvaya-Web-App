import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Ambulance, Clock, Loader2, MapPin } from "lucide-react";
import Modal from "../common/Modal";
import { updateAmbulanceStatus } from "../../services/ambulanceService";

const MAX_REASON_LENGTH = 250;

const QUICK_REASONS = [
  "Arranged own transport",
  "Patient feels better",
  "Ambulance taking too long",
  "Booked by mistake",
];

export default function CancelAmbulanceModal({
  isOpen,
  onClose,
  requestId,
  request,
  onCancelled
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  // Synchronous lock so a fast double-click can't fire two cancel requests
  const submitLockRef = useRef(false);

  // Reset form state each time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setTouched(false);
      setIsSubmitting(false);
    }
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  const isValid = reason.trim().length > 0;
  const showRequiredError = touched && !isValid;

  const handleClose = () => {
    if (!isSubmitting) onClose?.();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitLockRef.current) return;
    setTouched(true);

    if (!isValid) {
      setError("Please enter a reason for cancellation.");
      return;
    }

    submitLockRef.current = true;
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
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const displayId = requestId ? String(requestId).slice(-8).toUpperCase() : null;
  const requestedAt = request?.createdAt ? new Date(request.createdAt) : null;
  const hasValidDate = requestedAt && !Number.isNaN(requestedAt.getTime());

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancel Ambulance Request" maxWidth="560px">
      <form className="reschedule-modal" onSubmit={handleSubmit}>
        <div className="reschedule-current">
          <div className="reschedule-current-doctor">
            <div className="cancel-ambulance-icon">
              <Ambulance size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="reschedule-current-name">
                {request?.patientName || "Ambulance Request"}
              </div>
              <div className="reschedule-current-meta cancel-ambulance-meta">
                {request?.pickupAddress ? (
                  <>
                    <MapPin size={12} style={{ flexShrink: 0 }} />
                    <span>{request.pickupAddress}</span>
                  </>
                ) : (
                  <span>{request?.emergencyType || "Emergency transport"}</span>
                )}
              </div>
            </div>
          </div>
          <div className="reschedule-current-slot">
            <span className="reschedule-current-label">
              {displayId ? `Request #${displayId}` : "Requested"}
            </span>
            {hasValidDate && (
              <span className="reschedule-current-value">
                <Clock size={13} />
                {requestedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })},{" "}
                {requestedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </span>
            )}
          </div>
        </div>

        {error && !showRequiredError && (
          <div className="cancel-ambulance-alert">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <h4 className="reschedule-step-title">
            <span className="reschedule-step-num">1</span>
            Reason for cancellation
          </h4>

          <div className="cancel-reason-chips">
            {QUICK_REASONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`cancel-reason-chip ${reason === item ? "selected" : ""}`}
                onClick={() => {
                  setReason(item);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
              >
                {item}
              </button>
            ))}
          </div>

          <textarea
            className={`cancel-reason-input ${showRequiredError ? "has-error" : ""}`}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            onBlur={() => setTouched(true)}
            maxLength={MAX_REASON_LENGTH}
            rows={4}
            placeholder="Please tell us why you are cancelling..."
            aria-invalid={showRequiredError}
            disabled={isSubmitting}
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", marginTop: "4px" }}>
            <span className="cancel-reason-error">{showRequiredError ? "Reason is required" : ""}</span>
            <span style={{ color: "var(--text-muted)" }}>{reason.length}/{MAX_REASON_LENGTH}</span>
          </div>
        </div>

        <div className="reschedule-actions">
          <div className="reschedule-summary">
            <span className="reschedule-summary-hint" style={{ whiteSpace: "nowrap" }}>This action cannot be undone</span>
          </div>
          <div className="reschedule-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              style={isSubmitting ? { opacity: 0.6, cursor: "default" } : undefined}
            >
              Keep Request
            </button>
            <button
              type="submit"
              className="btn"
              disabled={!isValid || isSubmitting}
              style={{
                background: "var(--danger, #dc2626)",
                color: "white",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: !isValid || isSubmitting ? 0.6 : 1,
                cursor: !isValid || isSubmitting ? "default" : "pointer"
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancel"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
