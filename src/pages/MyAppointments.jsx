import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Video, User, CheckCircle, CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft, Sunrise, Sun, Loader2, MoreHorizontal, Stethoscope, FileText } from "lucide-react";
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

const PAGE_SIZE = 10;

function getPaginationRange(current, total) {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPageFetching, setIsPageFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const pageCacheRef = useRef({});
  const allAppointmentsPoolRef = useRef(null);
  const maxKnownPagesRef = useRef(1);

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

  const fetchAppointmentsForPage = async (pageToFetch = 1) => {
    // Check if page data already exists in memory cache
    if (pageCacheRef.current[pageToFetch]) {
      setAppointments(pageCacheRef.current[pageToFetch]);
      setCurrentPage(pageToFetch);
      return;
    }

    // Check if full array was returned by backend on initial call
    if (allAppointmentsPoolRef.current && allAppointmentsPoolRef.current.length > 0) {
      const start = (pageToFetch - 1) * PAGE_SIZE;
      const sliced = allAppointmentsPoolRef.current.slice(start, start + PAGE_SIZE);
      pageCacheRef.current[pageToFetch] = sliced;
      setAppointments(sliced);
      setCurrentPage(pageToFetch);
      return;
    }

    if (pageToFetch === 1) {
      setLoading(true);
    } else {
      setIsPageFetching(true);
    }

    try {
      const data = await getAppointments({
        pageSize: PAGE_SIZE,
        pageIndex: pageToFetch,
        page: pageToFetch
      });

      const list = Array.isArray(data) ? data : [];

      // If backend returned more than PAGE_SIZE in one call (full dataset)
      if (list.length > PAGE_SIZE) {
        allAppointmentsPoolRef.current = list;
        const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        setTotalPages(total);
        maxKnownPagesRef.current = total;

        const start = (pageToFetch - 1) * PAGE_SIZE;
        const sliced = list.slice(start, start + PAGE_SIZE);
        pageCacheRef.current[pageToFetch] = sliced;
        setAppointments(sliced);
      } else {
        // Backend returned dynamic page data
        pageCacheRef.current[pageToFetch] = list;
        setAppointments(list);

        const totalCount = data?.count ?? data?.total;
        if (totalCount != null) {
          const total = Math.max(1, Math.ceil(Number(totalCount) / PAGE_SIZE));
          setTotalPages(total);
          maxKnownPagesRef.current = total;
        } else if (data?.totalPages != null) {
          const total = Math.max(1, Number(data.totalPages));
          setTotalPages(total);
          maxKnownPagesRef.current = total;
        } else {
          if (list.length === PAGE_SIZE) {
            const nextPages = Math.max(maxKnownPagesRef.current, pageToFetch + 1);
            maxKnownPagesRef.current = nextPages;
            setTotalPages(nextPages);
          } else {
            maxKnownPagesRef.current = Math.max(1, pageToFetch);
            setTotalPages(Math.max(1, pageToFetch));
          }
        }
      }

      setCurrentPage(pageToFetch);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
      setIsPageFetching(false);
    }
  };

  useEffect(() => {
    fetchAppointmentsForPage(1);
  }, []);

  const filteredAppointments = appointments;

  const fetchAppointments = async () => {
    pageCacheRef.current = {};
    allAppointmentsPoolRef.current = null;
    fetchAppointmentsForPage(currentPage);
  };

  const paginationRange = getPaginationRange(currentPage, totalPages);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    fetchAppointmentsForPage(newPage);
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
      case 'upcoming': return (
        <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={13} /> Upcoming
        </span>
      );
      case 'completed': return (
        <span style={{ background: 'var(--success-light, #d1fae5)', color: 'var(--success, #059669)', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={13} /> Completed
        </span>
      );
      case 'cancelled': return (
        <span style={{ background: 'var(--danger-light, #fee2e2)', color: 'var(--danger, #dc2626)', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <XCircle size={13} /> Cancelled
        </span>
      );
      default: return null;
    }
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
            <Loader2 size={48} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>Loading appointments...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Please wait while we fetch your appointments.</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
            <CalendarIcon size={48} color="var(--border)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>No appointments</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>You don't have any appointments at the moment.</p>
          </div>
        ) : (
          filteredAppointments.map(apt => (
            <div key={apt.id} className="appointment-card card-elevated">
              
              {/* Top Row: Doctor Info & Status */}
              <div className="appointment-card-header">
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#e6f7f5',
                      color: '#0d9488',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0b2545', margin: '0 0 3px 0' }}>{apt.doctor}</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                      {apt.specialty}
                    </p>
                  </div>
                </div>
                <div>{getStatusBadge(apt.status)}</div>
              </div>

              {/* Middle Row: Details Grid */}
              <div className="appointment-details-grid">
                {/* 1. Date & Time */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CalendarIcon size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: '500' }}>
                      Date & Time
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>
                      {new Date(apt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {apt.time}
                    </span>
                  </div>
                </div>

                {/* 2. Location */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#f3e8ff',
                      color: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: '500' }}>
                      Location
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'block' }}>
                      {apt.hospital || "Sunrise Health Centre"}
                    </span>
                    {(apt.raw?.hospital_address || apt.raw?.location_name || apt.type) && (
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                        {apt.raw?.hospital_address || apt.raw?.location_name || apt.type}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Fee */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: '700',
                      fontSize: '17px',
                    }}
                  >
                    ₹
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: '500' }}>
                      Fee
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'block' }}>
                      ₹ {apt.amount}
                    </span>
                    {/* <span style={{ fontSize: '12px', color: '#16a34a', display: 'block', marginTop: '1px', fontWeight: '500' }}>
                      {apt.raw?.payment_received ? "(Paid Online)" : (apt.raw?.payment_status ? `(${apt.raw.payment_status})` : "(Paid Online)")}
                    </span> */}
                  </div>
                </div>

                {/* 4. Patient */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#ffedd5',
                      color: '#ea580c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: '500' }}>
                      Patient
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'block' }}>
                      {apt.patientName || "Kundan Bhagat"}
                    </span>
                    {(apt.raw?.patient_age || apt.raw?.patient_gender || apt.patientMobile) && (
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                        {apt.raw?.patient_age && apt.raw?.patient_gender
                          ? `Age ${apt.raw.patient_age} • ${apt.raw.patient_gender}`
                          : (apt.patientMobile ? `${apt.patientMobile}` : '')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Appointment ID on Left, Actions on Right */}
              <div
                className="appointment-footer-row"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                  {/* <FileText size={15} style={{ color: '#0d9488', flexShrink: 0 }} />
                  <span>
                    Appointment ID: <strong style={{ color: '#334155' }}>
                      {apt.raw?.appointment_id ? (String(apt.raw.appointment_id).startsWith('APPT') ? apt.raw.appointment_id : `APPT-${apt.raw.appointment_id}`) : `APPT-${apt.id}`}
                    </strong>
                  </span> */}
                </div>

                {apt.status === "upcoming" && (() => {
                  const isPast = isPastDate(apt.date);
                  return (
                    <div className="appointment-btn-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => !isPast && openRescheduleModal(apt)}
                        disabled={isPast}
                        title={isPast ? "Cannot reschedule past appointments" : ""}
                        className="appointment-btn-reschedule hover-glow"
                        style={{
                          background: '#ffffff',
                          border: `1.5px solid ${isPast ? 'var(--border)' : '#0d9488'}`,
                          color: isPast ? 'var(--text-muted)' : '#0d9488',
                          padding: '8px 18px',
                          fontSize: '13px',
                          fontWeight: '600',
                          borderRadius: '10px',
                          cursor: isPast ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: isPast ? 0.6 : 1,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CalendarIcon size={14} />
                        <span>Reschedule</span>
                      </button>

                      <button
                        onClick={() => !isPast && openCancelModal(apt)}
                        disabled={isPast}
                        title={isPast ? "Cannot cancel past appointments" : ""}
                        className="appointment-btn-cancel hover-glow"
                        style={{
                          background: isPast ? 'var(--border)' : '#0d9488',
                          border: 'none',
                          color: '#ffffff',
                          padding: '8.5px 18px',
                          fontSize: '13px',
                          fontWeight: '600',
                          borderRadius: '10px',
                          cursor: isPast ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: isPast ? 0.6 : 1,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <XCircle size={14} />
                        <span>Cancel</span>
                      </button>

                      {apt.type === "Video Consult" && (
                        <button
                          className="btn btn-primary hover-glow"
                          style={{
                            padding: '8.5px 18px',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '10px',
                          }}
                        >
                          <Video size={14} />
                          <span>Join Call</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {apt.status === "completed" && (
                  <div className="appointment-btn-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="btn btn-secondary hover-glow" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}>
                      View Summary
                    </button>
                    <button className="btn btn-primary hover-glow" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}>
                      Book Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Compact Right-Bottom Corner Pagination ── */}
      {!loading && appointments.length > 0 && totalPages >= 1 && (
        <div className="appointments-pagination-wrapper">
          <div className="appointments-pagination-group" role="navigation" aria-label="Pagination">
            <button
              type="button"
              className="pagination-btn pagination-nav-btn"
              disabled={currentPage === 1 || isPageFetching}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
              <span className="pagination-text">Previous</span>
            </button>

            <div className="pagination-pages">
              {paginationRange.map((p, idx) =>
                p === "..." ? (
                  <div key={`dots-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                    <MoreHorizontal size={15} />
                  </div>
                ) : (
                  <button
                    key={`p-${p}`}
                    type="button"
                    className={`pagination-btn pagination-num-btn ${currentPage === p ? "active" : ""}`}
                    onClick={() => handlePageChange(p)}
                    disabled={isPageFetching}
                    aria-current={currentPage === p ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="pagination-btn pagination-nav-btn"
              disabled={currentPage === totalPages || isPageFetching}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next Page"
            >
              <span className="pagination-text">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
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
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', resize: 'vertical' }}
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
          padding: 30px 0 32px;
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
          font-size: 13.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 10px;
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
          font-size: 28px;
          font-weight: 800;
          color: #0b2545;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .appointments-hero-desc {
          font-size: 14.5px;
          color: #55738d;
          margin: 0;
          line-height: 1.5;
        }

        .appointments-hero-graphic {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .appointments-hero-svg {
          width: 116px;
          height: 116px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }

        /* ── Appointment Card ── */
        .appointment-card {
          padding: 24px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: #ffffff;
          border: 1px solid var(--border, #e2e8f0);
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .appointment-card:hover {
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.07);
        }

        .appointment-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        /* ── 4-Column Details Grid ── */
        .appointment-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          background: var(--bg-app, #f8fafc);
          padding: 16px 20px;
          border-radius: 14px;
          border: 1px solid rgba(226, 232, 240, 0.85);
        }

        .appointment-btn-reschedule:hover:not(:disabled) {
          background: #f0fdfa !important;
          border-color: #0d9488 !important;
          color: #0f766e !important;
        }

        .appointment-btn-cancel:hover:not(:disabled) {
          background: #0f766e !important;
        }

        /* ── Pagination ── */
        .appointments-pagination-wrapper {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 20px;
          width: 100%;
        }

        .appointments-pagination-group {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
        }

        .pagination-pages {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .pagination-btn {
          border: none;
          background: #edf2f7;
          color: #475569;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          outline: none;
          user-select: none;
          height: 38px;
          box-sizing: border-box;
        }

        .pagination-btn:hover:not(:disabled):not(.active) {
          background: #e2e8f0;
          color: #1e293b;
        }

        .pagination-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pagination-nav-btn {
          padding: 0 14px;
          gap: 6px;
        }

        .pagination-num-btn {
          min-width: 38px;
          padding: 0 8px;
          font-size: 14px;
        }

        .pagination-num-btn.active {
          background: var(--primary, #1b6b72);
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(27, 107, 114, 0.28);
          cursor: default;
        }

        .pagination-ellipsis {
          min-width: 38px;
          height: 38px;
          background: #edf2f7;
          color: #64748b;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          pointer-events: none;
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
            padding: 22px 0 24px;
          }
          .appointments-hero-title {
            font-size: 22px;
          }
          .appointments-hero-desc {
            font-size: 13.5px;
          }
          .appointments-hero-svg {
            width: 86px;
            height: 86px;
          }
          .appointment-card {
            padding: 18px 16px;
            gap: 16px;
          }
          .appointment-footer-row {
            flex-direction: column;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .appointment-btn-group {
            width: 100%;
          }
          .appointment-btn-reschedule,
          .appointment-btn-cancel {
            flex: 1;
            justify-content: center;
          }
          .appointments-pagination-wrapper {
            margin-top: 16px;
          }
          .pagination-text {
            display: none;
          }
          .pagination-nav-btn {
            padding: 0 10px;
            min-width: 36px;
            height: 36px;
          }
          .pagination-num-btn {
            min-width: 34px;
            height: 36px;
            font-size: 13px;
          }
          .pagination-ellipsis {
            min-width: 34px;
            height: 36px;
          }
          .appointments-pagination-group {
            gap: 6px;
          }
          .pagination-pages {
            gap: 4px;
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
          .appointments-hero-svg {
            width: 72px;
            height: 72px;
          }
          .appointments-pagination-wrapper {
            justify-content: center;
          }
          .appointments-pagination-group {
            gap: 4px;
          }
          .pagination-nav-btn {
            min-width: 32px;
            height: 34px;
            padding: 0 8px;
          }
          .pagination-num-btn {
            min-width: 30px;
            height: 34px;
            padding: 0 4px;
            font-size: 12.5px;
            border-radius: 8px;
          }
          .pagination-ellipsis {
            min-width: 28px;
            height: 34px;
            border-radius: 8px;
          }
        }
      `}</style>
    </main>
  );
}
