import { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, 
  User, 
  Calendar, 
  Clock, 
  Stethoscope, 
  Briefcase, 
  Wallet, 
  Smartphone, 
  Mail, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  ChevronLeft, 
  Check,
  Timer
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../context/AuthContext";
import { bookAppointment, getWalletAmount, checkVisitType, verifyPayment, releaseSlot } from "../../services/dataService";
import BookingLayout from "../../components/layout/BookingLayout";
import Toast from "../../components/common/Toast";

const SLOT_HOLD_KEY = "arvaya_slot_hold_expiry";
const SLOT_HOLD_MS = 5 * 60 * 1000;

function getHoldExpiry() {
  try {
    const saved = parseInt(sessionStorage.getItem(SLOT_HOLD_KEY), 10);
    if (saved) return saved;
    // No hold started (e.g. direct navigation) — start a fresh one
    const expiry = Date.now() + SLOT_HOLD_MS;
    sessionStorage.setItem(SLOT_HOLD_KEY, String(expiry));
    return expiry;
  } catch (e) {
    return Date.now() + SLOT_HOLD_MS;
  }
}

function clearHoldExpiry() {
  try { sessionStorage.removeItem(SLOT_HOLD_KEY); } catch (e) {}
}

export default function BookingReview() {
  const { doctor, date, slot, setBookingId, bookingHospital, bookingSpecialty, bookingVisitType } = useBooking();
  const navigate = useNavigate();
  const { user, openLoginModal } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  
  const [loadingData, setLoadingData] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [visitType, setVisitType] = useState("Initial");
  const [consultationFee, setConsultationFee] = useState(0);
  const [slotConflict, setSlotConflict] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  
  const [applyWallet, setApplyWallet] = useState(false);
  const [walletAppliedAmount, setWalletAppliedAmount] = useState(0);

  const [holdExpiry] = useState(getHoldExpiry);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((holdExpiry - Date.now()) / 1000)));
  const holdReleasedRef = useRef(false);
  const razorpayRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      if (!doctor || !date || !user) {
        setLoadingData(false);
        return;
      }
      try {
        const toLocalDate = (d) => {
          if (typeof d === 'string') return d;
          if (d instanceof Date) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return "";
        };
        const dStr = toLocalDate(date);
        const patient_id = user?.id || user?.user_id || user?.patient_id || 20546;

        let start = slot;
        let end = slot;
        if (slot && slot.includes('-')) {
          const parts = slot.split('-');
          start = parts[0].trim().replace(/\s*(AM|PM|am|pm)\s*$/i, '');
          end = parts[1].trim().replace(/\s*(AM|PM|am|pm)\s*$/i, '');
        }
        start = start.replace(/\s*(AM|PM|am|pm)\s*$/i, '');
        end = end.replace(/\s*(AM|PM|am|pm)\s*$/i, '');

        const entitylocation = doctor.locations?.[0]?.location_key || "";

        let walletRes = null;
        try {
          walletRes = await getWalletAmount(patient_id);
        } catch (err) {
          console.error("Failed to fetch wallet balance:", err);
        }

        let bal = 0;
        let wData = Array.isArray(walletRes) ? walletRes[0] : walletRes;
        if (typeof wData === 'number' || typeof wData === 'string') {
          bal = parseFloat(wData) || 0;
        } else if (wData && typeof wData === 'object') {
          bal = parseFloat(wData.total_amount || wData.balance || wData.amount || wData.wallet_balance || wData.wallet_amount || wData.walletBalance || wData.total || 0);
        }
        setWalletBalance(isNaN(bal) ? 0 : bal);

        try {
          const visitRes = await checkVisitType({ patient_id, drkey: doctor.id || doctor.drkey, date: dStr, entitylocation, start, end });
          let vData = Array.isArray(visitRes) ? visitRes[0] : visitRes;
          const vType = vData?.visit_type || vData?.type || vData?.Consultation_type || "Initial";
          const cFee = parseFloat(vData?.fee || vData?.amount || vData?.Consultation_Fee || doctor.fee || 0);
          setVisitType(vType);
          setConsultationFee(isNaN(cFee) ? 0 : cFee);
        } catch (err) {
          if (err.status === 409) {
            setToast({
              isOpen: true,
              message: "This slot is currently being booked by another user. Please try again in a few minutes or select another slot.",
              type: "error"
            });
            // Slot is held by someone else — nothing of ours to release
            holdReleasedRef.current = true;
            clearHoldExpiry();
            setSlotConflict(true);
          } else {
            console.error("checkVisitType error:", err);
          }
        }
       
      } catch (err) {
        console.error("Error loading review data", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [doctor, date, slot, user]);

  useEffect(() => {
    if (slotConflict) {
      const timer = setTimeout(() => {
        navigate("/doctors/schedule");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [slotConflict, navigate]);

  // Tick the slot-hold countdown
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((holdExpiry - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [holdExpiry]);

  const buildReleasePayload = () => {
    if (!user || !doctor || !date || !slot) return null;
    const dStr = date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : String(date);
    const start = (slot.includes('-') ? slot.split('-')[0] : slot).trim().replace(/\s*(AM|PM|am|pm)\s*$/i, '');
    return {
      patient_id: user?.id || user?.user_id || user?.patient_id,
      drkey: doctor.id || doctor.drkey,
      date: dStr,
      entitylocation: doctor.locations?.[0]?.location_key || "",
      start
    };
  };

  // Releases the held slot once (on expiry, Back, or leaving the page)
  const releaseHeldSlot = () => {
    if (holdReleasedRef.current) return;
    holdReleasedRef.current = true;
    clearHoldExpiry();

    const payload = buildReleasePayload();
    if (payload) {
      releaseSlot(payload).catch(err => console.error("releaseSlot error:", err));
    }
  };

  // Always call the latest release function from effect cleanups / window listeners
  const releaseHeldSlotRef = useRef(releaseHeldSlot);
  releaseHeldSlotRef.current = releaseHeldSlot;
  const buildReleasePayloadRef = useRef(buildReleasePayload);
  buildReleasePayloadRef.current = buildReleasePayload;

  // Leaving the Review page any other way (browser back, header links, etc.) releases the slot.
  // A successful booking sets holdReleasedRef first, so going to the confirmation page does not.
  // The deferred release ignores StrictMode's dev-only unmount/remount.
  const pendingUnmountReleaseRef = useRef(null);
  useEffect(() => {
    clearTimeout(pendingUnmountReleaseRef.current);
    return () => {
      pendingUnmountReleaseRef.current = setTimeout(() => releaseHeldSlotRef.current(), 0);
    };
  }, []);

  // Tab close / refresh: send the release with keepalive so it survives the page unloading.
  // The timer is kept, so a refresh resumes the same countdown and re-holds the slot on load.
  useEffect(() => {
    const onPageHide = () => {
      if (holdReleasedRef.current) return;
      const payload = buildReleasePayloadRef.current();
      if (payload) releaseSlot(payload, { keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const handleBack = () => {
    releaseHeldSlot();
    navigate(-1);
  };

  // Hold expired: close any open payment window, release the slot and send the user back to Date & Time
  useEffect(() => {
    if (secondsLeft > 0 || holdReleasedRef.current) return;

    if (razorpayRef.current) {
      try { razorpayRef.current.close(); } catch (e) {}
      razorpayRef.current = null;
    }
    setSubmitting(false);
    releaseHeldSlot();

    setToast({
      isOpen: true,
      message: "Your slot hold has expired. Please select a time slot again.",
      type: "error"
    });
    const t = setTimeout(() => navigate("/doctors/schedule"), 1500);
    return () => clearTimeout(t);
  }, [secondsLeft, navigate]);

  const holdTimeLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const maxWalletApplicable = Math.min(walletBalance, consultationFee);
  
  useEffect(() => {
    if (applyWallet) {
      setWalletAppliedAmount(maxWalletApplicable);
    } else {
      setWalletAppliedAmount(0);
    }
  }, [applyWallet, maxWalletApplicable]);

  const handleWalletInputChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    if (val > maxWalletApplicable) val = maxWalletApplicable;
    if (val < 0) val = 0;
    setWalletAppliedAmount(val);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const confirm = async () => {
    if (!user) {
      openLoginModal("/doctors/review");
      return;
    }
    if (slotConflict) {
      return;
    }
    setSubmitting(true);
    try {
      const patient_id = user?.id || user?.user_id || user?.patient_id || "";
      const dStrRaw = typeof date === 'string' ? date : (date instanceof Date ? 
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` 
        : "");
      const dStr = dStrRaw.replace(/-/g, '');
      
      let start = slot;
      let end = slot;
      let sessionVal = "";
      if (slot && slot.includes('-')) {
        const parts = slot.split('-');
        start = parts[0].trim().replace(/\s*(AM|PM|am|pm)\s*$/i, '');
        end = parts[1].trim().replace(/\s*(AM|PM|am|pm)\s*$/i, '');
        sessionVal = `${start}-${end}`;
      }
      start = start.replace(/\s*(AM|PM|am|pm)\s*$/i, '');
      end = end.replace(/\s*(AM|PM|am|pm)\s*$/i, '');

      const payload = {
        patient_id: patient_id,
        dr: doctor.id || doctor.drkey,
        entitylocation: doctor.locations?.[0]?.location_key || "",
        date: dStr,
        start: start,
        end: end,
        entitykey: "secure-hospitals",
        session: "",
        sessionval: sessionVal ? sessionVal : `${slot}-${slot}`,
        appnotes: "",
        referred_by: "",
        referredbykey: "",
        extphid: user?.external_id || "",
        fname: user?.name || "Guest",
        phone: user?.mobile || user?.phone || "N/A",
        wallet_amount_used: applyWallet ? walletAppliedAmount : 0
      };
      
      const result = await bookAppointment(payload);

      const amountToPay = consultationFee - (applyWallet ? walletAppliedAmount : 0);

      if (amountToPay <= 0) {
        const orderRef = (
          result.order_id || 
          result.booking_id || 
          result.bookingId || 
          result.appointment_id || 
          result.appointmentId || 
          result.id || 
          ("APMNT" + Math.floor(10000000 + Math.random() * 90000000))
        );
        setBookingId(orderRef);
        try { sessionStorage.setItem("arvaya_booking_id", orderRef); } catch(e) {}
        holdReleasedRef.current = true;
        clearHoldExpiry();
        navigate("/doctors/confirmed");
        return;
      }

      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you offline?");
        setSubmitting(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TeZHDSZsRNLvz7",
        amount: amountToPay * 100,
        currency: "INR",
        name: "Arvaya Healthcare",
        description: "Doctor Consultation",
        order_id: result.razorpay_order_id,
        handler: async function (response) {
          // Payment captured — stop the hold timer so a paid slot is never released
          holdReleasedRef.current = true;
          razorpayRef.current = null;
          clearHoldExpiry();
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...payload
            });
            const orderRef = (
              result.order_id || 
              result.booking_id || 
              result.bookingId || 
              result.appointment_id || 
              result.appointmentId || 
              result.id || 
              response.razorpay_order_id || 
              ("APMNT" + Math.floor(10000000 + Math.random() * 90000000))
            );
            setBookingId(orderRef);
            try { sessionStorage.setItem("arvaya_booking_id", orderRef); } catch(e) {}
            clearHoldExpiry();
            navigate("/doctors/confirmed");
          } catch (err) {
            console.error("Payment verification failed", err);
            alert("Payment verification failed. Please contact support.");
            setSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || "Guest",
          contact: user?.mobile || user?.phone || "",
        },
        theme: {
          color: "#2e666e",
        },
        modal: {
          ondismiss: function() {
            setSubmitting(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      razorpayRef.current = paymentObject;
      paymentObject.open();

    } catch (err) {
      console.error(err);
      if (err.status === 409) {
        alert(err.message || "Slot already booked");
      } else {
        alert("Booking failed. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const getDoctorInitials = (name) => {
    if (!name) return "DR";
    const clean = name.replace(/^Dr\.?\s+/i, '').trim();
    if (!clean) return "DR";
    const parts = clean.split(/\s+/);
    if (parts.length >= 2 && parts[parts.length - 1].length > 0) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const formattedDate = date && date instanceof Date
    ? date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : String(date);

  const formattedVisitType = (visitType || bookingVisitType || "Consultation")
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  const hospitalName = bookingHospital?.name || doctor?.locations?.[0]?.name || doctor?.hospital || "Arvaya Healthcare Center";
  const hospitalAddress = bookingHospital?.address || bookingHospital?.address_line_1 || bookingHospital?.address1 || doctor?.locations?.[0]?.address || bookingHospital?.city || "";

  const patient_id = user?.id || user?.user_id || user?.patient_id || 20546;
  const patientName = user?.name || "Guest Patient";
  const patientPhone = user?.mobile || user?.phone || "N/A";
  const patientEmail = user?.email || "";

  if (!doctor || !date || !slot) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Incomplete booking details. Redirecting...</p>
        <button onClick={() => navigate("/doctors")} className="btn btn-primary">Start Over</button>
      </div>
    );
  }

  if (slotConflict && !loadingData) {
    return (
      <>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Redirecting to slot selection...</p>
        </div>
        <Toast
          isOpen={toast.isOpen}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, isOpen: false })}
        />
      </>
    );
  }

  const finalAmountToPay = consultationFee - (applyWallet ? walletAppliedAmount : 0);

  return (
    <>
      <BookingLayout 
        currentStep={5} 
        title="Confirm Booking" 
        subtitle="Please review your appointment details before confirming."
      >
        <div className="booking-review-container">
          <div
            role="timer"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
              padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: secondsLeft <= 60 ? 'rgba(220, 38, 38, 0.08)' : 'rgba(46, 102, 110, 0.08)',
              color: secondsLeft <= 60 ? '#b91c1c' : 'var(--primary)',
              border: `1px solid ${secondsLeft <= 60 ? 'rgba(220, 38, 38, 0.25)' : 'rgba(46, 102, 110, 0.2)'}`
            }}
          >
            <Timer size={16} />
            <span>Your slot is reserved for <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{holdTimeLabel}</strong>. Complete the booking before the timer runs out.</span>
          </div>
          <div className="booking-review-scroll styled-scrollbar">
            {loadingData ? (
              <div style={{ padding: '60px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                <div className="spinner" style={{ width: '36px', height: '36px', borderTopColor: 'var(--primary)', border: '3px solid rgba(46, 102, 110, 0.15)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}></div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Fetching appointment summary & wallet balance...</span>
              </div>
            ) : (
              <div className="booking-review-grid">
                
                {/* Left Column: Appointment & Patient Details */}
                <div className="review-col-main">
                  
                  {/* Appointment Information Card */}
                  <section className="review-card">
                    <div className="review-card-header">
                      <div className="review-header-left">
                        <div className="review-header-avatar" aria-hidden="true">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <h3 className="review-card-title">Appointment Information</h3>
                          <p className="review-card-subtitle">Review scheduled consultation details</p>
                        </div>
                      </div>
                      <span className="hospital-status-pill">
                        <span className="hospital-pulse-dot" /> Verified Slot
                      </span>
                    </div>

                    {/* Medical Center / Hospital Info */}
                    {hospitalName && (
                      <div className="review-facility-box">
                        <Building2 size={17} className="review-facility-icon" />
                        <div className="review-facility-info">
                          <span className="review-facility-name">{hospitalName}</span>
                          {hospitalAddress && (
                            <span className="review-facility-address">
                              <MapPin size={11} style={{ flexShrink: 0 }} /> {hospitalAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Doctor Details Row */}
                    <div className="review-doctor-box">
                      <div className="review-doc-avatar" aria-hidden="true">
                        {getDoctorInitials(doctor?.name)}
                      </div>
                      <div className="review-doc-details">
                        <span className="review-doc-name">{doctor?.name || "Specialist Doctor"}</span>
                        {doctor?.qualification && (
                          <span className="review-doc-qual">{doctor.qualification}</span>
                        )}
                        <div className="review-doc-badge-row">
                          <span className="review-spec-pill">
                            <Stethoscope size={11} /> {doctor?.specialty || bookingSpecialty || "General Medicine"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Appointment Timing & Consultation Grid */}
                    <div className="review-info-grid">
                      <div className="review-info-item">
                        <span className="review-info-label">
                          <Calendar size={11} /> Date
                        </span>
                        <span className="review-info-value" style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'visible' }} title={formattedDate}>{formattedDate}</span>
                      </div>

                      <div className="review-info-item">
                        <span className="review-info-label">
                          <Clock size={11} /> Time Slot
                        </span>
                        <span className="review-info-value review-slot-pill" style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'visible' }} title={slot}>{slot}</span>
                      </div>

                      <div className="review-info-item">
                        <span className="review-info-label">
                          <Briefcase size={11} /> Type
                        </span>
                        <span className="review-info-value review-type-pill" style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'visible' }} title={formattedVisitType}>{formattedVisitType}</span>
                      </div>
                    </div>
                  </section>

                  {/* Patient Information Card */}
                  <section className="review-card">
                    <div className="review-card-header">
                      <div className="review-header-left">
                        <div className="review-header-avatar avatar-slate" aria-hidden="true">
                          <User size={18} />
                        </div>
                        <div>
                          <h3 className="review-card-title">Patient Information</h3>
                          <p className="review-card-subtitle">Appointment booked for</p>
                        </div>
                      </div>
                      <span className="review-uhid-badge">ID: #{patient_id}</span>
                    </div>

                    <div className="review-patient-grid">
                      <div className="review-patient-item">
                        <span className="review-patient-label">
                          <User size={12} /> Patient Name
                        </span>
                        <span className="review-patient-value">{patientName}</span>
                      </div>

                      <div className="review-patient-item">
                        <span className="review-patient-label">
                          <Smartphone size={12} /> Contact Number
                        </span>
                        <span className="review-patient-value">{patientPhone}</span>
                      </div>

                      {patientEmail && (
                        <div className="review-patient-item" style={{ gridColumn: 'span 2' }}>
                          <span className="review-patient-label">
                            <Mail size={12} /> Email Address
                          </span>
                          <span className="review-patient-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {patientEmail}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                </div>

                {/* Right Column: Wallet & Payment Breakdown */}
                <div className="review-col-side">
                  
                  {/* Arvaya Wallet Card */}
                  <section className="review-card">
                    <div className="review-wallet-balance-row">
                      <div className="review-header-left">
                        <div className="review-header-avatar avatar-green" aria-hidden="true">
                          <Wallet size={18} />
                        </div>
                        <div>
                          <h3 className="review-card-title" style={{ fontSize: '14.5px' }}>Wallet Balance</h3>
                          <p className="review-card-subtitle">Available to redeem</p>
                        </div>
                      </div>
                      <span className="wallet-balance-display">₹{walletBalance}</span>
                    </div>

                    <div className="wallet-toggle-row">
                      <span className="wallet-toggle-label">Apply wallet balance</span>
                      <div 
                        role="switch"
                        aria-checked={applyWallet}
                        tabIndex={walletBalance > 0 ? 0 : -1}
                        onClick={() => { if (walletBalance > 0) setApplyWallet(!applyWallet); }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && walletBalance > 0) {
                            e.preventDefault();
                            setApplyWallet(!applyWallet);
                          }
                        }}
                        className={`wallet-switch-track ${applyWallet ? "active" : ""} ${walletBalance <= 0 ? "disabled" : ""}`}
                        title={walletBalance <= 0 ? "Zero balance in wallet" : "Toggle wallet balance"}
                      >
                        <div className="wallet-switch-thumb" />
                      </div>
                    </div>

                    {applyWallet && (
                      <div className="wallet-deduction-box">
                        <div className="wallet-input-row">
                          <div className="wallet-input-wrapper">
                            <span>₹</span>
                            <input 
                              type="number"
                              className="wallet-amount-input"
                              value={walletAppliedAmount} 
                              onChange={handleWalletInputChange}
                              min="0"
                              max={maxWalletApplicable}
                              aria-label="Wallet amount to apply"
                            />
                          </div>
                          <span className="wallet-max-chip">Max ₹{maxWalletApplicable}</span>
                        </div>
                        <span className="wallet-deduction-hint">
                          <Check size={12} /> ₹{walletAppliedAmount} will be deducted from total payable
                        </span>
                      </div>
                    )}
                  </section>

                  {/* Payment Summary & Checkout Card */}
                  <section className="review-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="review-card-header">
                      <div className="review-header-left">
                        <div className="review-header-avatar avatar-teal" aria-hidden="true">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <h3 className="review-card-title">Payment Summary</h3>
                          <p className="review-card-subtitle">Transparent fee breakdown</p>
                        </div>
                      </div>
                    </div>

                    <div className="review-payment-breakdown">
                      <div className="payment-line-item">
                        <span>Consultation Fee</span>
                        <span className="payment-line-value">₹{consultationFee}</span>
                      </div>

                      {applyWallet && walletAppliedAmount > 0 && (
                        <div className="payment-line-item discount">
                          <span>Wallet Deduction</span>
                          <span className="payment-line-value">- ₹{walletAppliedAmount}</span>
                        </div>
                      )}

                      <div className="payment-line-item">
                        <span>Convenience Fee</span>
                        <span className="payment-free-badge">FREE</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                      <div className="payment-total-box">
                        <span className="payment-total-label">Total Payable</span>
                        <span className="payment-total-amount">₹{finalAmountToPay}</span>
                      </div>

                      <div className="review-actions-row">
                        <button 
                          type="button"
                          onClick={handleBack}
                          className="btn-review-back"
                        >
                          <ChevronLeft size={16} /> Back
                        </button>
                        <button 
                          type="button"
                          onClick={confirm}
                          disabled={submitting}
                          className="btn-review-confirm"
                        >
                          {submitting ? (
                            <>
                              <div className="spinner" style={{ width: '15px', height: '15px', borderTopColor: '#fff', border: '2px solid rgba(255,255,255,0.25)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={16} /> Confirm & Pay
                            </>
                          )}
                        </button>
                      </div>

                      <div className="review-trust-note">
                        <ShieldCheck size={13} /> 256-Bit SSL Encrypted & Secure Checkout
                      </div>
                      <p className="review-terms-note">
                        By confirming, you agree to our booking terms & cancellation policy.
                      </p>
                    </div>
                  </section>

                </div>
              </div>
            )}
          </div>
        </div>
      </BookingLayout>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </>
  );
}
