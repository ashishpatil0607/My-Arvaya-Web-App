import { ChevronLeft, ChevronRight, ChevronDown, CalendarX2, Calendar, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalFooter } from "../common/Modal";

export default function SelectSlotUI({ doctor, onConfirm, type = "doctor", submitting = false }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateObj, setSelectedDateObj] = useState(today);
  const [selectedTime, setSelectedTime] = useState(type === "lab" ? "10:00 AM" : null);
  // Synchronous guard so a fast double-click can't call onConfirm twice
  const confirmLockRef = useRef(false);
  const modalFooterEl = useModalFooter();

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleConfirm = async () => {
    if (confirmLockRef.current || submitting || !selectedTime) return;
    confirmLockRef.current = true;
    try {
      await onConfirm({ date: formatDateForDisplay(selectedDateObj), time: selectedTime });
    } finally {
      confirmLockRef.current = false;
    }
  };

  const confirmAction = (
    <div
      className="bottom-fixed-action"
      style={modalFooterEl
        ? { margin: 0, padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }
        : { borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: type === "lab" ? '12px' : '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
    >
      <button
        className="btn btn-primary"
        disabled={!selectedTime || submitting}
        onClick={handleConfirm}
        aria-busy={submitting}
        style={{
          padding: '12px 24px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          ...((!selectedTime || submitting) && { opacity: 0.6, cursor: 'default', transform: 'none', boxShadow: 'none' })
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {type === "lab" ? "Scheduling..." : "Booking..."}
          </>
        ) : (
          <>
            <Calendar size={18} style={{ marginRight: '8px' }} />
            {type === "lab" ? "Confirm Schedule" : "Confirm Booking"}
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="select-slot-container">
      {/* Doctor Mini Card - Conditionally Rendered */}
      {doctor && (
        <div className="doc-mini-card">
          <div className="dmc-avatar">
            <img src={doctor.image} alt={doctor.name} />
          </div>
          <div className="dmc-info">
            <h4>{doctor.name}</h4>
            <span className="dmc-spec">{doctor.specialty}</span>
          </div>
        </div>
      )}

      {type !== "lab" && (
      <div className="slot-grid-layout">
        <div className="date-selector-section">
          <div className="section-title-row">
            <Calendar size={18} color="var(--primary)" />
            <h4 className="step-prompt" style={{ margin: 0, color: 'var(--text-main)', fontSize: '15px' }}>
              Select a Date
            </h4>
          </div>

          <div className="full-calendar-card">
            <div className="fc-header">
              <button className="icon-btn" onClick={prevMonth} disabled={submitting}><ChevronLeft size={16} /></button>
              <span className="fc-month">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
              <button className="icon-btn" onClick={nextMonth} disabled={submitting}><ChevronRight size={16} /></button>
            </div>
            <div className="fc-grid">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={`wd-${i}`} className="fc-weekday">{d}</div>
              ))}
              
              {/* Empty days */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="fc-empty"></div>
              ))}
              
              {/* Actual days */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const isPast = date < today;
                const isSelected = selectedDateObj && date.toDateString() === selectedDateObj.toDateString();
                
                return (
                  <button
                    key={`day-${day}`}
                    className={`fc-date ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedDateObj(date)}
                    disabled={isPast || submitting}
                    style={{ 
                      opacity: isPast ? 0.3 : 1, 
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      background: isPast ? 'transparent' : ''
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="slots-section">
          <div className="section-title-row" style={{ justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Calendar size={18} color="var(--primary)" />
              <h4 className="step-prompt" style={{ margin: 0 }}>Available Slots</h4>
            </div>
            <span className="selected-date-badge">{selectedDateObj ? formatDateForDisplay(selectedDateObj) : 'Select a date'}</span>
          </div>

          <div className="time-slots-grid">
            {["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "02:00 PM", "02:30 PM", "03:00 PM", "04:30 PM", "05:00 PM"].map((time) => (
              <button
                key={time}
                className={`time-slot-btn ${selectedTime === time ? 'active' : ''}`}
                onClick={() => setSelectedTime(time)}
                disabled={submitting}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Inside a Modal the button is portaled into the modal's footer slot, so it stays
          pinned below the scrolling body; elsewhere it renders inline */}
      {modalFooterEl ? createPortal(confirmAction, modalFooterEl) : confirmAction}
    </div>
  );
}
