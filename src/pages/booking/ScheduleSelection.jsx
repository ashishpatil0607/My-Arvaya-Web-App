import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  Sun, 
  Sunrise, 
  Sunset, 
  Check, 
  CalendarDays, 
  Clock, 
  Calendar as CalendarIcon, 
  ArrowRight,
  Search,
  X 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";
import BookingLayout from "../../components/layout/BookingLayout";
import Calendar from "../../components/common/Calendar";
import { getDoctorSlots } from "../../services/dataService";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/common/Toast";

/**
 * Sanitizes search input to prevent SQL Injection attempts and malicious payload evaluation.
 * Strips SQL meta-characters, SQL command keywords, and boolean injection tautologies.
 */
export function sanitizeSearchQuery(input = "") {
  if (typeof input !== "string") return "";
  let clean = input.slice(0, 60);
  // Strip dangerous SQL syntax characters: quotes, backticks, semicolons, comments, backslashes, HTML/script tags
  clean = clean.replace(/['"`\\;#<>{}]/g, "");
  clean = clean.replace(/--+/g, "");
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, "");
  // Strip dangerous SQL command keywords (case-insensitive)
  const sqlKeywords =
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|TRUNCATE|DECLARE|CAST|CONVERT|WHERE|FROM|XP_)\b/gi;
  clean = clean.replace(sqlKeywords, "");
  // Strip SQL boolean bypass tautologies (e.g. OR 1=1, AND '1'='1')
  clean = clean.replace(/\b(OR|AND)\s+['"\w\d]+\s*=\s*['"\w\d]+/gi, "");
  // Only allow valid search characters: alphanumeric, spaces, hyphens, commas, ampersands, slashes, periods
  clean = clean.replace(/[^a-zA-Z0-9\s,\-&/.]/g, "");
  return clean;
}

export default function ScheduleSelection() {
  const navigate = useNavigate();
  const { doctor, bookingHospital, date, setDate, slot, setSlot } = useBooking();
  const { user, openLoginModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all"); // 'all' | 'morning' | 'afternoon' | 'evening'
  const [searchQ, setSearchQ] = useState("");
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "error" });

  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });

  useEffect(() => {
    if (!doctor || !date) return;

    setLoading(true);
    setSlot(""); // Reset slot when date changes

    getDoctorSlots(doctor.drkey || doctor.id, date).then(res => {
      const morning = [];
      const afternoon = [];
      const evening = [];

      let rawSlots = [];
      if (res && res.slots && typeof res.slots === 'object') {
        Object.values(res.slots).forEach(locObj => {
          if (locObj && typeof locObj === 'object') {
            Object.values(locObj).forEach(dateArray => {
              if (Array.isArray(dateArray)) {
                rawSlots = rawSlots.concat(dateArray);
              }
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
        
        if (hour24 >= 17) {
          evening.push(s);
        } else if (hour24 >= 12) {
          afternoon.push(s);
        } else {
          morning.push(s);
        }
      });
      
      setAvailableSlots({ morning, afternoon, evening });
      setLoading(false);
    }).catch(err => {
      console.error("Error loading doctor slots:", err);
      setLoading(false);
    });
  }, [date, doctor, setSlot]);

  const formatSlot = (s) => {
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

  const handleSearchChange = (e) => {
    const sanitized = sanitizeSearchQuery(e.target.value);
    setSearchQ(sanitized);
  };

  const handleClearSearch = () => {
    setSearchQ("");
  };

  const filteredSlots = useMemo(() => {
    const q = sanitizeSearchQuery(searchQ).trim().toLowerCase();
    if (!q) return availableSlots;

    const filterArr = (arr) => arr.filter(s => {
      const str = formatSlot(s).toLowerCase();
      return str.includes(q);
    });

    return {
      morning: filterArr(availableSlots.morning),
      afternoon: filterArr(availableSlots.afternoon),
      evening: filterArr(availableSlots.evening)
    };
  }, [availableSlots, searchQ]);

  const handleConfirm = () => {
    if (!slot) {
      setToast({
        isOpen: true,
        message: "Please select an available appointment time slot to proceed.",
        type: "error"
      });
      return;
    }
    if (!date) {
      setToast({
        isOpen: true,
        message: "Please select an appointment date to proceed.",
        type: "error"
      });
      return;
    }
    if (!doctor) {
      setToast({
        isOpen: true,
        message: "Please select a doctor first.",
        type: "error"
      });
      return;
    }

    // Start the 5-minute slot hold; BookingReview reads this expiry to show the countdown
    try {
      sessionStorage.setItem("arvaya_slot_hold_expiry", String(Date.now() + 5 * 60 * 1000));
    } catch (e) {}

    if (!user) {
      openLoginModal("/doctors/review");
    } else {
      navigate("/doctors/review");
    }
  };

  // Quick next-days shortcuts for high-convenience booking
  const quickDates = useMemo(() => {
    const today = new Date();
    const list = [];
    for (let i = 1; i <= 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);
      list.push({
        label: i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        shortLabel: i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        date: d
      });
    }
    return list;
  }, []);

  const totalSlotsCount = availableSlots.morning.length + availableSlots.afternoon.length + availableSlots.evening.length;

  if (!doctor) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px' }}>
          No doctor selected. Please select a doctor first.
        </p>
        <button onClick={() => navigate("/doctors/list")} className="btn btn-primary">
          Back to Doctors
        </button>
      </div>
    );
  }

  return (
    <>
    <BookingLayout 
      currentStep={4} 
      title="Date & Time" 
      subtitle="Select a convenient slot for your appointment."
    >
      <div className="schedule-selection-wrapper">
        
        {/* Calendar & Time Slots 2-Column Responsive Layout */}
        <div className="booking-schedule-grid">
          
          {/* Left Panel: Appointment Date Picker & Quick Days */}
          <div className="schedule-calendar-card">
            <div className="schedule-card-header">
              <h3 className="schedule-card-title">
                <CalendarDays size={16} /> Select Date
              </h3>
              {date && (
                <span className="hospital-location-tag" style={{ fontSize: '11px', padding: '2.5px 7px' }}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {/* Quick Next Days Filter Bar */}
            {/* <div className="schedule-quick-dates">
              {quickDates.map((q) => {
                const isActive = date && date.toDateString() === q.date.toDateString();
                return (
                  <button
                    key={q.label}
                    type="button"
                    className={`quick-date-chip ${isActive ? "active" : ""}`}
                    onClick={() => setDate(q.date)}
                  >
                    {q.shortLabel}
                  </button>
                );
              })}
            </div> */}

            {/* Standard Calendar Widget */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              {(() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return (
                  <Calendar 
                    selectedDate={date}
                    onSelectDate={(d) => setDate(d)}
                    minDate={tomorrow}
                    compact={true}
                    borderless={true}
                  />
                );
              })()}
            </div>
          </div>

          {/* Right Panel: Available Time Slots Container (Feasible for Large Slot Datasets) */}
          <div className="schedule-slots-panel">
            
            {/* Header: Title, Slot Counter & Period Filters */}
            <div className="schedule-slots-header">
              <div className="schedule-slots-title-group">
                <h3 className="schedule-slots-title">
                  <Clock size={16} color="var(--primary)" /> Available Slots
                </h3>
                <span className="hospital-count-badge">
                  {totalSlotsCount} {totalSlotsCount === 1 ? "slot" : "slots"}
                </span>
              </div>

              {/* Period Filters: All / Morning / Afternoon / Evening */}
              {totalSlotsCount > 0 && (
                <div className="schedule-period-filters">
                  <button
                    type="button"
                    className={`period-filter-pill ${periodFilter === "all" ? "active" : ""}`}
                    onClick={() => setPeriodFilter("all")}
                  >
                    All ({totalSlotsCount})
                  </button>
                  {availableSlots.morning.length > 0 && (
                    <button
                      type="button"
                      className={`period-filter-pill ${periodFilter === "morning" ? "active" : ""}`}
                      onClick={() => setPeriodFilter("morning")}
                    >
                      <Sunrise size={13} color="#eab308" /> Morning ({availableSlots.morning.length})
                    </button>
                  )}
                  {availableSlots.afternoon.length > 0 && (
                    <button
                      type="button"
                      className={`period-filter-pill ${periodFilter === "afternoon" ? "active" : ""}`}
                      onClick={() => setPeriodFilter("afternoon")}
                    >
                      <Sun size={13} color="#f97316" /> Afternoon ({availableSlots.afternoon.length})
                    </button>
                  )}
                  {availableSlots.evening.length > 0 && (
                    <button
                      type="button"
                      className={`period-filter-pill ${periodFilter === "evening" ? "active" : ""}`}
                      onClick={() => setPeriodFilter("evening")}
                    >
                      <Sunset size={13} color="#8b5cf6" /> Evening ({availableSlots.evening.length})
                    </button>
                  )}
                </div>
              )}
              {/* SQL Protected Search for Available Slots */}
              {totalSlotsCount > 3 && (
                <div className="hospital-search-box" style={{ maxWidth: '175px', height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 8px', borderRadius: '8px' }}>
                  <Search size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    className="hospital-search-input"
                    placeholder="Search time..."
                    value={searchQ}
                    onChange={handleSearchChange}
                    maxLength={30}
                    autoComplete="off"
                    aria-label="Search slots"
                    style={{ fontSize: '11px', lineHeight: '30px' }}
                  />
                  {searchQ && (
                    <button
                      type="button"
                      className="hospital-search-clear"
                      onClick={handleClearSearch}
                      title="Clear slot search"
                      aria-label="Clear slot search"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Slots Scroll Container */}
            <div className="schedule-slots-scroll-area styled-scrollbar">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                  <div className="spinner" style={{ borderTopColor: 'var(--primary)', width: '36px', height: '36px', border: '3px solid rgba(46, 102, 110, 0.15)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Loading available slots for {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'selected date'}...
                  </span>
                </div>
              ) : totalSlotsCount === 0 ? (
                <div className="hospital-empty-state" style={{ padding: '36px 16px' }}>
                  <div className="hospital-empty-icon-wrap" style={{ width: '56px', height: '56px' }}>
                    <CalendarIcon size={28} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: '4px 0 2px' }}>
                    No Slots Available
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '320px', margin: '0 auto', lineHeight: 1.4 }}>
                    No appointment slots available for {date?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}. Please select another date.
                  </p>
                </div>
              ) : (
                <>
                  {/* Empty state when search yields no slots */}
                  {searchQ && filteredSlots.morning.length === 0 && filteredSlots.afternoon.length === 0 && filteredSlots.evening.length === 0 && (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No slots matching "{searchQ}". <button type="button" onClick={handleClearSearch} style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Clear search</button>
                    </div>
                  )}

                  {/* Morning Slots */}
                  {filteredSlots.morning.length > 0 && (periodFilter === "all" || periodFilter === "morning") && (
                    <div className="slot-section-group">
                      <div className="slot-section-header">
                        <Sunrise size={15} color="#eab308" />
                        <span>Morning</span>
                        <span className="slot-section-tag morning">
                          {filteredSlots.morning.length} slots
                        </span>
                      </div>
                      <div className="time-slots-grid">
                        {filteredSlots.morning.map(s => {
                          const slotStr = formatSlot(s);
                          const isSel = slot === slotStr;
                          return (
                            <button
                              key={slotStr}
                              type="button"
                              onClick={() => setSlot(slotStr)}
                              className={`slot-chip ${isSel ? 'selected' : ''}`}
                              aria-selected={isSel}
                            >
                              <Clock size={11} className="slot-clock-icon" />
                              <span>{slotStr}</span>
                              {isSel && <Check size={11} strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {filteredSlots.afternoon.length > 0 && (periodFilter === "all" || periodFilter === "afternoon") && (
                    <div className="slot-section-group">
                      <div className="slot-section-header">
                        <Sun size={15} color="#f97316" />
                        <span>Afternoon</span>
                        <span className="slot-section-tag afternoon">
                          {filteredSlots.afternoon.length} slots
                        </span>
                      </div>
                      <div className="time-slots-grid">
                        {filteredSlots.afternoon.map(s => {
                          const slotStr = formatSlot(s);
                          const isSel = slot === slotStr;
                          return (
                            <button
                              key={slotStr}
                              type="button"
                              onClick={() => setSlot(slotStr)}
                              className={`slot-chip ${isSel ? 'selected' : ''}`}
                              aria-selected={isSel}
                            >
                              <Clock size={11} className="slot-clock-icon" />
                              <span>{slotStr}</span>
                              {isSel && <Check size={11} strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evening Slots */}
                  {filteredSlots.evening.length > 0 && (periodFilter === "all" || periodFilter === "evening") && (
                    <div className="slot-section-group">
                      <div className="slot-section-header">
                        <Sunset size={15} color="#8b5cf6" />
                        <span>Evening</span>
                        <span className="slot-section-tag evening">
                          {filteredSlots.evening.length} slots
                        </span>
                      </div>
                      <div className="time-slots-grid">
                        {filteredSlots.evening.map(s => {
                          const slotStr = formatSlot(s);
                          const isSel = slot === slotStr;
                          return (
                            <button
                              key={slotStr}
                              type="button"
                              onClick={() => setSlot(slotStr)}
                              className={`slot-chip ${isSel ? 'selected' : ''}`}
                              aria-selected={isSel}
                            >
                              <Clock size={11} className="slot-clock-icon" />
                              <span>{slotStr}</span>
                              {isSel && <Check size={11} strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Bottom Action Bar (Matching HospitalSelection style) */}
        <div className="booking-action-bar">
          <div>
            {slot && date ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', minWidth: 0 }}>
                <CheckCircle2 size={17} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                  <span>Selected: <strong style={{ color: 'var(--primary-dark)', fontWeight: '750' }}>{slot}</strong> on <strong style={{ color: 'var(--primary-dark)', fontWeight: '750' }}>{date?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></span>
                  {doctor?.name && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', background: 'rgba(0,0,0,0.04)', padding: '1.5px 6px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      Dr. {doctor.name}
                    </span>
                  )}
                  {bookingHospital?.name && (
                    <span style={{ color: 'var(--primary-dark)', fontSize: '11px', background: 'rgba(46, 102, 110, 0.08)', padding: '1.5px 6px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      {bookingHospital.name}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Select a date and an available time slot above to proceed
              </span>
            )}
          </div>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            style={{ 
              padding: '11px 26px', 
              fontSize: '14.5px', 
              fontWeight: '650',
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              opacity: slot ? 1 : 0.65,
              cursor: 'pointer',
              boxShadow: slot ? '0 4px 14px rgba(46, 102, 110, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Review Details <ArrowRight size={17} />
          </button>
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
