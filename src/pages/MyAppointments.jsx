import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Video, User, CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronLeft, Sunrise, Sun, Stethoscope, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { getAppointments, cancelAppointment, rescheduleAppointment, getStoredUserId, getDoctorSlots } from "../services/dataService";
import Modal from "../components/common/Modal";
import Toast from "../components/common/Toast";
import Calendar from "../components/common/Calendar";

const getLocalDateString = (dateObj) => {
  const d = dateObj || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const PAGE_SIZE = 5;

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) pages.push("...");
  for (let p = from; p <= to; p++) pages.push(p);
  if (to < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const requestIdRef = useRef(0);

  // Toast
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const showToast = (message, type = "success") => setToast({ isOpen: true, message, type });

  // Cancel
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const fetchAppointmentsForPage = async (page) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const data = await getAppointments({
        pageSize: PAGE_SIZE,
        pageIndex: page,
        page
      });
      if (requestId !== requestIdRef.current) return;

      const list = Array.isArray(data) ? data : [];
      // Backend may ignore paging and return the full list — slice it client-side.
      const isFullList = list.length > PAGE_SIZE;
      const total = isFullList ? list.length : Number(list.total) || list.length;
      const start = (page - 1) * PAGE_SIZE;

      setAppointments(isFullList ? list.slice(start, start + PAGE_SIZE) : list);
      setTotalCount(total);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentsForPage(currentPage);
  }, [currentPage]);

  const filteredAppointments = appointments;

  const fetchAppointments = () => fetchAppointmentsForPage(currentPage);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCancelModal = (apt) => {
    setAppointmentToCancel(apt);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      showToast("Please provide a cancellation reason.", "error");
      return;
    }
    setIsCancelling(true);
    try {
      const patientId = getStoredUserId();
      const res = await cancelAppointment({
        appointment_id: appointmentToCancel.raw?.appointment_id || appointmentToCancel.id,
        patient_id: patientId,
        cancellation_reason: cancelReason
      });
      const msg = res?.message || "Appointment cancelled successfully!";
      showToast(msg);
      setCancelModalOpen(false);
      fetchAppointments();
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to cancel appointment.";
      showToast(errMsg, "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const openRescheduleModal = (apt) => {
    setAppointmentToReschedule(apt);
    const aptDate = new Date(apt.date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    aptDate.setHours(0, 0, 0, 0);
    
    if (aptDate < tomorrow) {
      setRescheduleDate(tomorrow);
    } else {
      setRescheduleDate(new Date(apt.date));
    }
    
    setRescheduleSlot("");
    setRescheduleModalOpen(true);
  };

  useEffect(() => {
    if (rescheduleModalOpen && appointmentToReschedule) {
      const fetchSlots = async () => {
        setSlotsLoading(true);
        setRescheduleSlot("");
        try {
          const docId = appointmentToReschedule.raw?.drkey || appointmentToReschedule.raw?.doctor_id;
          if (!docId) {
            setSlotsLoading(false);
            return;
          }
          const res = await getDoctorSlots(docId, rescheduleDate);
          const morning = [];
          const afternoon = [];
          const evening = [];

          let rawSlots = [];
          if (res && res.slots && typeof res.slots === 'object') {
            Object.values(res.slots).forEach(locObj => {
              if (locObj && typeof locObj === 'object') {
                Object.values(locObj).forEach(dateArray => {
                  if (Array.isArray(dateArray)) rawSlots = rawSlots.concat(dateArray);
                });
              }
            });
          } else {
            rawSlots = Array.isArray(res) ? res : (res.data || res.list || []);
          }
          
          rawSlots.forEach(s => {
            const timeStr = typeof s === 'string' ? s : (s.start_time || s.time || s.slot_time || "");
            if (!timeStr) return;
            const hourMatch = timeStr.match(/^\d+/);
            let hour24 = hourMatch ? parseInt(hourMatch[0]) : 0;
            if (timeStr.toLowerCase().includes('pm') && hour24 !== 12) hour24 += 12;
            if (timeStr.toLowerCase().includes('am') && hour24 === 12) hour24 = 0;
            
            if (hour24 >= 17) evening.push(s);
            else if (hour24 >= 12) afternoon.push(s);
            else morning.push(s);
          });
          
          setAvailableSlots({ morning, afternoon, evening });
        } catch (err) {
          console.error(err);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchSlots();
    }
  }, [rescheduleDate, rescheduleModalOpen, appointmentToReschedule]);

  const getSlotDisplay = (s) => {
    let str = typeof s === 'string' ? s : (s.start_time || s.time || s.slot_time || "Slot");
    if (/^\d{1,2}:\d{2}$/.test(str)) {
      let [h, m] = str.split(':');
      let hour = parseInt(h);
      let ampm = hour >= 12 ? 'PM' : 'AM';
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;
      str = `${hour}:${m} ${ampm}`;
    }
    return str;
  };

  const confirmReschedule = async () => {
    if (!rescheduleSlot) {
      showToast("Please select a new time slot.", "error");
      return;
    }
    setIsRescheduling(true);
    try {
      const patientId = getStoredUserId();
      const newDateStr = getLocalDateString(rescheduleDate);
      const newStartStr = typeof rescheduleSlot === 'string' ? rescheduleSlot : (rescheduleSlot.start_time || rescheduleSlot.time);
      const locationKey = appointmentToReschedule.raw?.entitylocation || appointmentToReschedule.raw?.location_key;

      const res = await rescheduleAppointment({
        appointment_id: appointmentToReschedule.raw?.appointment_id || appointmentToReschedule.id,
        patient_id: patientId,
        new_date: newDateStr,
        new_start: newStartStr,
        new_location_key: locationKey
      });
      const msg = res?.message || "Appointment rescheduled successfully!";
      showToast(msg);
      setRescheduleModalOpen(false);
      fetchAppointments();
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to reschedule appointment.";
      showToast(errMsg, "error");
    } finally {
      setIsRescheduling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return (
        <span style={{ background: 'var(--success-light, #d1fae5)', color: 'var(--success, #059669)', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={12} /> Completed
        </span>
      );
      case 'cancelled': return (
        <span style={{ background: 'var(--danger-light, #fee2e2)', color: 'var(--danger, #dc2626)', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <XCircle size={12} /> Cancelled
        </span>
      );
      default: return null;
    }
  };

  const formatTime = (time) => {
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(time || "").trim());
    if (!m) return time;
    const h = Number(m[1]);
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
  };

  const formatVisitType = (type) => {
    if (!type) return "";
    return String(type)
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const isPastDate = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aptDate = new Date(dateString);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate < today;
  };

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>
      {/* ── Internal Hero Banner with Gradient & Calendar Graphic ── */}
      <div className="appointments-hero-banner">
        <svg
          className="appointments-hero-wave"
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,40 C150,90 320,10 500,45 L500,0 L0,0 Z"
            fill="rgba(255, 255, 255, 0.42)"
          />
        </svg>

        <div className="container">
          <div className="appointments-hero-inner">
            <div className="appointments-hero-content">
              <nav aria-label="Breadcrumb" className="appointments-hero-breadcrumb">
                <Link to="/" className="appointments-breadcrumb-link">
                  Home
                </Link>
                <ChevronRight size={13} className="appointments-breadcrumb-sep" />
                <span className="appointments-breadcrumb-current">My Appointments</span>
              </nav>

              <h1 className="appointments-hero-title">My Appointments</h1>
              <p className="appointments-hero-desc">
                Manage your upcoming and past medical consultations.
              </p>
            </div>

            <div className="appointments-hero-graphic" aria-hidden="true">
              <svg
                className="appointments-hero-svg"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Sparkles */}
                <path
                  d="M107 19C107 23.2 109.8 26 114 26C109.8 26 107 28.8 107 33C107 28.8 104.2 26 100 26C104.2 26 107 23.2 107 19Z"
                  fill="#14b8a6"
                />
                <path
                  d="M13 46C13 49.5 15.5 52 19 52C15.5 52 13 54.5 13 58C13 54.5 10.5 52 7 52C10.5 52 13 49.5 13 46Z"
                  fill="#14b8a6"
                />
                <circle cx="16" cy="74" r="2" fill="#2dd4bf" />
                <circle cx="112" cy="45" r="1.5" fill="#2dd4bf" />

                {/* Calendar Body */}
                <rect
                  x="26"
                  y="28"
                  width="68"
                  height="66"
                  rx="12"
                  fill="#ffffff"
                  stroke="#0d9488"
                  strokeWidth="3.2"
                />

                {/* Calendar Ring Loops */}
                <path
                  d="M44 22V32"
                  stroke="#0d9488"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M76 22V32"
                  stroke="#0d9488"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Calendar Grid */}
                <rect x="38" y="44" width="7" height="6" rx="2" fill="#0d9488" />
                <rect x="52" y="44" width="7" height="6" rx="2" fill="#0d9488" />
                <rect x="66" y="44" width="7" height="6" rx="2" fill="#0d9488" />

                <rect x="38" y="56" width="7" height="6" rx="2" fill="#0d9488" />
                <rect x="52" y="56" width="7" height="6" rx="2" fill="#0d9488" />
                <rect x="66" y="56" width="7" height="6" rx="2" fill="#0d9488" />

                <rect x="38" y="68" width="7" height="6" rx="2" fill="#0d9488" />
                <rect x="52" y="68" width="7" height="6" rx="2" fill="#0d9488" />

                {/* Green Plus Badge */}
                <circle cx="86" cy="86" r="15" fill="#0d9488" />
                <path
                  d="M86 78V94M78 86H94"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '24px', paddingBottom: '60px' }}>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} aria-busy={loading}>
        {loading ? (
          Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="appointment-card appointment-card--skeleton" aria-busy="true">
              <div className="appointment-card-header">
                <div className="appointment-doctor" style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '10px' }} />
                    <div className="skeleton" style={{ height: '11px', width: '25%' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: '22px', width: '84px', borderRadius: '999px' }} />
              </div>
              <div className="appointment-details-grid">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="appointment-detail">
                    <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '10px', width: '50%', marginBottom: '8px' }} />
                      <div className="skeleton" style={{ height: '13px', width: '80%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : filteredAppointments.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
            <CalendarIcon size={48} color="var(--border)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>No appointments</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>You don't have any appointments at the moment.</p>
          </div>
        ) : (
          filteredAppointments.map(apt => {
            const isPast = isPastDate(apt.date);
            const visitType = formatVisitType(apt.type);
            const location = apt.raw?.hospital_address || apt.raw?.location_name;
            const patientMeta = apt.raw?.patient_age && apt.raw?.patient_gender
              ? `Age ${apt.raw.patient_age} • ${apt.raw.patient_gender}`
              : apt.patientMobile;
            const showFooter = apt.status === "upcoming" || apt.status === "completed";

            return (
            <div key={apt.id} className="appointment-card">

              {/* Top Row: Doctor Info & Status */}
              <div className="appointment-card-header">
                <div className="appointment-doctor">
                  <div className="appointment-doctor-icon">
                    <Stethoscope size={19} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="appointment-doctor-name">{apt.doctor}</h3>
                    <div className="appointment-doctor-meta">
                      <span>{apt.specialty}</span>
                      {visitType && <span className="appointment-type-chip">{visitType}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>{getStatusBadge(apt.status)}</div>
              </div>

              {/* Middle Row: Details Grid */}
              <div className="appointment-details-grid">
                <div className="appointment-detail">
                  <div className="appointment-detail-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <CalendarIcon size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="appointment-detail-label">Date & Time</span>
                    <span className="appointment-detail-value">
                      {new Date(apt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {formatTime(apt.time)}
                    </span>
                  </div>
                </div>

                <div className="appointment-detail">
                  <div className="appointment-detail-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                    <MapPin size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="appointment-detail-label">Location</span>
                    <span className="appointment-detail-value">{apt.hospital || "Sunrise Health Centre"}</span>
                    {location && <span className="appointment-detail-sub">{location}</span>}
                  </div>
                </div>

                <div className="appointment-detail">
                  <div className="appointment-detail-icon" style={{ background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: '13px' }}>
                    ₹
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="appointment-detail-label">Fee</span>
                    <span className="appointment-detail-value">₹ {apt.amount}</span>
                  </div>
                </div>

                <div className="appointment-detail">
                  <div className="appointment-detail-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                    <User size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="appointment-detail-label">Patient</span>
                    <span className="appointment-detail-value">{apt.patientName || "Kundan Bhagat"}</span>
                    {patientMeta && <span className="appointment-detail-sub">{patientMeta}</span>}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Past-date note / Actions */}
              {showFooter && (
              <div className="appointment-footer-row">
                <div className="appointment-footer-note">
                  {apt.status === "upcoming" && isPast && (
                    <>
                      <AlertCircle size={14} />
                      <span>This appointment date has passed and can no longer be changed.</span>
                    </>
                  )}
                </div>

                {apt.status === "upcoming" && !isPast && (
                  <div className="appointment-btn-group">
                    <button
                      type="button"
                      onClick={() => openRescheduleModal(apt)}
                      className="appointment-btn appointment-btn-reschedule"
                    >
                      <CalendarIcon size={14} />
                      <span>Reschedule</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openCancelModal(apt)}
                      className="appointment-btn appointment-btn-cancel"
                    >
                      <XCircle size={14} />
                      <span>Cancel</span>
                    </button>

                    {apt.type === "Video Consult" && (
                      <button type="button" className="appointment-btn appointment-btn-primary">
                        <Video size={14} />
                        <span>Join Call</span>
                      </button>
                    )}
                  </div>
                )}

                {apt.status === "completed" && (
                  <div className="appointment-btn-group">
                    <button type="button" className="appointment-btn appointment-btn-reschedule">
                      View Summary
                    </button>
                    <button type="button" className="appointment-btn appointment-btn-primary">
                      Book Again
                    </button>
                  </div>
                )}
              </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {totalCount > 0 && (
        <div className="specialty-pagination-bar" style={{ marginTop: '16px', paddingTop: 0, borderTop: 'none' }}>
          <span className="pagination-info-text">
            Showing <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(currentPage * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong> {totalCount === 1 ? "appointment" : "appointments"}
          </span>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                disabled={loading || currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <div className="pagination-pages-list">
                {getPageRange(currentPage, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="pagination-info-text" aria-hidden="true">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`pagination-num-btn ${currentPage === p ? "active" : ""}`}
                      onClick={() => goToPage(p)}
                      disabled={loading}
                      aria-label={`Page ${p}`}
                      aria-current={currentPage === p ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="pagination-btn"
                disabled={loading || currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                aria-label="Next page"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      </div>
      
      {/* Cancel Modal */}
      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Appointment">
        <div style={{ padding: '8px 0 24px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            Are you sure you want to cancel your appointment with <strong>{appointmentToCancel?.doctor}</strong>?
          </p>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '8px' }}>Reason for cancellation</label>
          <textarea 
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            maxLength={250}
            rows={4}
            placeholder="Please tell us why you are cancelling..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.5 }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {cancelReason.length}/250
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setCancelModalOpen(false)} disabled={isCancelling}>
              Keep Appointment
            </button>
            <button className="btn" onClick={confirmCancel} disabled={isCancelling} style={{ background: 'var(--danger, #dc2626)', color: 'white', border: 'none' }}>
              {isCancelling ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal isOpen={rescheduleModalOpen} onClose={() => setRescheduleModalOpen(false)} title="Reschedule Appointment" maxWidth="800px">
        <div style={{ padding: '8px 0 24px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Select a new date and time for your appointment with <strong>{appointmentToReschedule?.doctor}</strong>.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: '24px', alignItems: 'start' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Select Date</h4>
              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                {(() => {
                  const minDate = new Date();
                  minDate.setDate(minDate.getDate() + 1);
                  return <Calendar selectedDate={rescheduleDate} onSelectDate={setRescheduleDate} minDate={minDate} />;
                })()}
              </div>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Available Slots</h4>
              {slotsLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading slots...</div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                  {/* Morning */}
                  {availableSlots.morning.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>
                        <Sunrise size={16} color="#eab308" /> Morning
                      </div>
                      <div className="time-slots-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                        {availableSlots.morning.map((slotItem, idx) => {
                          const isCurrent = appointmentToReschedule?.time === getSlotDisplay(slotItem) && new Date(appointmentToReschedule?.date).toDateString() === rescheduleDate.toDateString();
                          return (
                            <button key={`m-${idx}`} disabled={isCurrent} onClick={() => setRescheduleSlot(slotItem)} className={`time-slot-btn ${rescheduleSlot === slotItem ? 'active' : ''}`} style={{ opacity: isCurrent ? 0.5 : 1, cursor: isCurrent ? 'not-allowed' : 'pointer', fontSize: '13px', padding: '8px 4px' }}>
                              {getSlotDisplay(slotItem)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon */}
                  {availableSlots.afternoon.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>
                        <Sun size={16} color="#f97316" /> Afternoon
                      </div>
                      <div className="time-slots-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                        {availableSlots.afternoon.map((slotItem, idx) => {
                          const isCurrent = appointmentToReschedule?.time === getSlotDisplay(slotItem) && new Date(appointmentToReschedule?.date).toDateString() === rescheduleDate.toDateString();
                          return (
                            <button key={`a-${idx}`} disabled={isCurrent} onClick={() => setRescheduleSlot(slotItem)} className={`time-slot-btn ${rescheduleSlot === slotItem ? 'active' : ''}`} style={{ opacity: isCurrent ? 0.5 : 1, cursor: isCurrent ? 'not-allowed' : 'pointer', fontSize: '13px', padding: '8px 4px' }}>
                              {getSlotDisplay(slotItem)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evening */}
                  {availableSlots.evening.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>
                        <Sun size={16} color="#4f46e5" /> Evening
                      </div>
                      <div className="time-slots-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                        {availableSlots.evening.map((slotItem, idx) => {
                          const isCurrent = appointmentToReschedule?.time === getSlotDisplay(slotItem) && new Date(appointmentToReschedule?.date).toDateString() === rescheduleDate.toDateString();
                          return (
                            <button key={`e-${idx}`} disabled={isCurrent} onClick={() => setRescheduleSlot(slotItem)} className={`time-slot-btn ${rescheduleSlot === slotItem ? 'active' : ''}`} style={{ opacity: isCurrent ? 0.5 : 1, cursor: isCurrent ? 'not-allowed' : 'pointer', fontSize: '13px', padding: '8px 4px' }}>
                              {getSlotDisplay(slotItem)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {availableSlots.morning.length === 0 && availableSlots.afternoon.length === 0 && availableSlots.evening.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      No slots available for this date.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setRescheduleModalOpen(false)} disabled={isRescheduling}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={confirmReschedule} disabled={isRescheduling || !rescheduleSlot}>
              {isRescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, isOpen: false })} />

      <style>{`
        /* ── Appointments Hero Banner ── */
        .appointments-hero-banner {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #effaf7 0%, #e3f7f2 50%, #ccf4eb 100%);
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
          padding: 16px 0;
        }

        .appointments-hero-wave {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }

        .appointments-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .appointments-hero-content {
          max-width: 680px;
        }

        .appointments-hero-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 4px;
        }

        .appointments-breadcrumb-link {
          color: #55738d;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .appointments-breadcrumb-link:hover {
          color: #0b2545;
        }

        .appointments-breadcrumb-sep {
          color: #7a94a9;
          flex-shrink: 0;
        }

        .appointments-breadcrumb-current {
          color: #55738d;
        }

        .appointments-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .appointments-hero-desc {
          font-size: 13.5px;
          color: #55738d;
          margin: 2px 0 0 0;
          line-height: 1.5;
        }

        .appointments-hero-graphic {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .appointments-hero-svg {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }

        /* ── Appointment Card ── */
        .appointment-card {
          padding: 14px 16px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .appointment-card:not(.appointment-card--skeleton):hover {
          transform: translateY(-2px);
          border-color: rgba(13, 148, 136, 0.35);
          box-shadow: 0 10px 24px rgba(13, 148, 136, 0.08);
        }

        .appointment-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .appointment-doctor {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .appointment-doctor-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #e6f7f5;
          color: #0d9488;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .appointment-doctor-name {
          font-size: 15px;
          font-weight: 700;
          color: #0b2545;
          margin: 0 0 1px 0;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .appointment-doctor-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12.5px;
          color: #64748b;
        }

        .appointment-type-chip {
          padding: 1px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11.5px;
          font-weight: 600;
        }

        /* ── 4-Column Details Grid ── */
        .appointment-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          background: #f8fafb;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #edf2f4;
        }

        .appointment-detail {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .appointment-detail-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .appointment-detail-label {
          display: block;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          margin-bottom: 1px;
        }

        .appointment-detail-value {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main, #0f172a);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .appointment-detail-sub {
          display: block;
          font-size: 11.5px;
          color: #64748b;
          margin-top: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Footer ── */
        .appointment-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          border-top: none;
          padding-top: 0;
        }

        .appointment-footer-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
        }

        .appointment-btn-group {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-left: auto;
        }

        .appointment-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
        }

        .appointment-btn-reschedule {
          background: #ffffff;
          border-color: #0d9488;
          color: #0d9488;
        }

        .appointment-btn-reschedule:hover {
          background: #f0fdfa;
          color: #0f766e;
        }

        .appointment-btn-cancel {
          background: #ffffff;
          border-color: #fecaca;
          color: #dc2626;
        }

        .appointment-btn-cancel:hover {
          background: #fef2f2;
          border-color: #f87171;
        }

        .appointment-btn-primary {
          background: #0d9488;
          color: #ffffff;
        }

        .appointment-btn-primary:hover {
          background: #0f766e;
        }

        /* ── Breakpoints ── */
        @media (max-width: 960px) {
          .appointment-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 640px) {
          .appointments-hero-banner {
            padding: 12px 0;
          }
          .appointments-hero-title {
            font-size: 19px;
          }
          .appointments-hero-desc {
            font-size: 12.5px;
          }
          .appointments-hero-svg {
            width: 52px;
            height: 52px;
          }
          .appointment-card {
            padding: 16px 14px;
            gap: 12px;
          }
          .appointment-footer-row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .appointment-footer-note:empty {
            display: none;
          }
          .appointment-btn-group {
            width: 100%;
            margin-left: 0;
          }
          .appointment-btn {
            flex: 1;
          }
        }

        @media (max-width: 520px) {
          .appointment-details-grid {
            grid-template-columns: 1fr;
            padding: 14px 16px;
            gap: 14px;
          }
        }

        @media (max-width: 440px) {
          .appointments-hero-inner {
            gap: 12px;
          }
          .appointments-hero-graphic {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
