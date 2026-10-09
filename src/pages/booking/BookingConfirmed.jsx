import { 
  CheckCircle2, 
  CalendarDays, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Building2, 
  Stethoscope,
  ArrowLeft
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";
import { toDisplayTime } from "../../utils/formatTime";

export default function BookingConfirmed() {
  const { 
    doctor, 
    date, 
    slot,
    bookingVisitType, 
    bookingHospital, 
    bookingSpecialty,
    clearBooking 
  } = useBooking();
  
  const navigate = useNavigate();

  const handleBackToBooking = () => {
    if (clearBooking) clearBooking();
    navigate("/doctors", { replace: true });
  };

  useEffect(() => {
    // Intercept browser back button to redirect back to the BookingLayout flow (/doctors)
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      if (clearBooking) clearBooking();
      navigate("/doctors", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, clearBooking]);

  const handleViewAppointments = () => {
    if (clearBooking) clearBooking();
    navigate("/my-appointments");
  };

  const formattedDate = (() => {
    if (!date) return "Scheduled Date";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const rawDocName = (
    doctor?.name || 
    doctor?.doctor_name || 
    doctor?.dr_name || 
    doctor?.drname || 
    doctor?.full_name || 
    ""
  )?.trim();

  // Omit generic default fallback placeholders or doctor IDs
  const isInvalidOrPlaceholder = !rawDocName || 
    /^consultant(\s+doctor)?$/i.test(rawDocName) || 
    /^doctor$/i.test(rawDocName) ||
    rawDocName.toLowerCase() === "sh-dummy";

  const doctorDisplayName = !isInvalidOrPlaceholder
    ? (rawDocName.toLowerCase().startsWith("dr") ? rawDocName : `Dr. ${rawDocName}`)
    : "";

  const doctorInitials = doctorDisplayName
    ? doctorDisplayName.replace(/^Dr\.?\s+/i, '').substring(0, 2).toUpperCase()
    : "";

  const doctorSpecialty = (doctor?.specialty || bookingSpecialty || "")?.trim();
  const doctorQualification = (doctor?.qualification || "")?.trim();

  return (
    <main className="confirmed-page-wrapper animate-fade-in-up">
      <div className="confirmed-container">
        
        <section className="confirmed-horizontal-card animate-scale-in">
          
          {/* ================= LEFT SECTION: Status, Booking ID & Actions ================= */}
          <div className="confirmed-left-pane">
            <div className="confirmed-status-header">
              <div className="confirmed-badge-row">
                <div className="confirmed-check-icon">
                  <CheckCircle2 size={24} strokeWidth={2.5} />
                </div>
                <span className="confirmed-status-pill">
                  <span className="confirmed-pulse-dot" />
                  Booking Confirmed
                </span>
              </div>

              <h1 className="confirmed-title">Appointment Confirmed!</h1>
              <p className="confirmed-subtitle">
                Your consultation has been reserved. A confirmation with appointment instructions has been sent via SMS & WhatsApp.
              </p>
            </div>

            {/* Actions Group */}
            <div className="confirmed-actions-group">
              <button 
                type="button"
                className="confirmed-btn-primary" 
                onClick={handleViewAppointments}
              >
                <span>View My Appointments</span>
              </button>
              <button 
                type="button"
                className="confirmed-btn-secondary" 
                onClick={handleBackToBooking}
              >
                <ArrowLeft size={16} />
                <span>Back to Booking</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT SECTION: Receipt / Appointment Ticket ================= */}
          <div className="confirmed-right-pane">
            <div className="confirmed-ticket-header">
              <span className="confirmed-ticket-label">Appointment Receipt</span>
              <span className="confirmed-type-chip">
                <Stethoscope size={12} />
                <span>{bookingVisitType || "In-Person Consultation"}</span>
              </span>
            </div>

            {/* Doctor Card - Only displayed if valid doctor data is available */}
            {doctorDisplayName && (
              <div className="confirmed-doctor-card">
                {doctor?.image && !doctor.image.includes('ui-avatars') ? (
                  <img 
                    src={doctor.image} 
                    alt={doctorDisplayName} 
                    className="confirmed-doc-avatar" 
                  />
                ) : (
                  <div className="confirmed-doc-initials">
                    {doctorInitials}
                  </div>
                )}
                
                <div className="confirmed-doc-info">
                  <div className="confirmed-doc-name">
                    <span>{doctorDisplayName}</span>
                    <CheckCircle2 size={15} color="#059669" />
                  </div>
                  {(doctorQualification || doctorSpecialty) && (
                    <div className="confirmed-doc-sub">
                      {doctorQualification ? `${doctorQualification}${doctorSpecialty ? ' • ' : ''}` : ""}
                      {doctorSpecialty}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date, Time & Hospital Details Card */}
            <div className="confirmed-details-card">
              <div className="confirmed-meta-grid">
                <div className="confirmed-meta-item">
                  <div className="confirmed-meta-icon">
                    <CalendarDays size={16} />
                  </div>
                  <div className="confirmed-meta-text">
                    <span className="confirmed-meta-label">Date</span>
                    <span className="confirmed-meta-val">{formattedDate}</span>
                  </div>
                </div>

                <div className="confirmed-meta-item">
                  <div className="confirmed-meta-icon">
                    <Clock size={16} />
                  </div>
                  <div className="confirmed-meta-text">
                    <span className="confirmed-meta-label">Time Slot</span>
                    <span className="confirmed-meta-val">{toDisplayTime(slot) || "Not specified"}</span>
                  </div>
                </div>
              </div>

              <div className="confirmed-location-row">
                <div className="confirmed-location-icon">
                  <MapPin size={16} />
                </div>
                <div className="confirmed-location-text">
                  <span className="confirmed-meta-label">Hospital / Clinic</span>
                  <span className="confirmed-hospital-name">
                    {bookingHospital?.name || doctor?.hospital || "Arvaya Health Center"}
                  </span>
                  <span className="confirmed-hospital-addr">
                    {bookingHospital?.address ? `${bookingHospital.address}, ${bookingHospital.city || ''}` : "Main OPD Wing, Arvaya Healthcare Hub"}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Guideline Alert */}
            <div className="confirmed-info-note">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Please arrive 15 minutes before your slot time with previous medical prescriptions or reports.</span>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}
