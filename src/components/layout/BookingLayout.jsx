import { Building2, Stethoscope, User, FileText, CalendarDays, CheckCircle2, ClipboardCheck, ChevronRight, ShieldCheck, Clock, Heart, Sparkles } from "lucide-react";
import { useBooking } from "../../context/BookingContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

const STEPS = [
  { id: 0, title: "Hospital", icon: Building2, path: "/doctors" },
  { id: 1, title: "Specialty", icon: Stethoscope, path: "/doctors/specialty" },
  { id: 2, title: "Doctor", icon: User, path: "/doctors/list" },
  { id: 3, title: "Type", icon: FileText, path: "/doctors/visit-type" },
  { id: 4, title: "Time", icon: CalendarDays, path: "/doctors/schedule" },
  { id: 5, title: "Review", icon: ClipboardCheck, path: "/doctors/review" },
];

export default function BookingLayout({ currentStep, title, subtitle, children }) {
  const { bookingHospital, bookingSpecialty, doctor, date, slot } = useBooking();
  const navigate = useNavigate();
  const location = useLocation();
  const bodySplitRef = useRef(null);

  // Scroll the booking body area into view whenever the step changes
  // so the user doesn't get thrown to the top of the page
  useEffect(() => {
    if (bodySplitRef.current) {
      bodySplitRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  const handleStepClick = (e, step) => {
    e.preventDefault();
    // Only navigate if it's a completed (earlier) step AND we're not already there
    if (step.id < currentStep && location.pathname !== step.path) {
      navigate(step.path);
    }
  };

  const breadcrumbParts = [];
  if (bookingHospital && currentStep >= 1) breadcrumbParts.push({ label: bookingHospital.name, bold: false });
  if (bookingSpecialty && currentStep >= 2) breadcrumbParts.push({ label: bookingSpecialty, bold: false });
  if (doctor && currentStep >= 3) breadcrumbParts.push({ label: doctor.name, bold: true, color: 'var(--primary-dark)' });
  if (date && slot && currentStep >= 5) breadcrumbParts.push({ label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${slot}`, bold: true, color: 'var(--primary)' });

  return (
    <main className="page booking-page-layout animate-fade-in-up">
      <div className="container booking-main-container">

        {/* Booking Flow Hero Banner */}
        <div className="booking-hero-banner">
          <div className="booking-hero-left">
            <div className="booking-hero-icon" aria-hidden="true"><CalendarDays size={26} /></div>
            <div className="booking-hero-copy">
              <div className="booking-hero-pill-tag">
                <Sparkles size={13} /> Verified Hospitals & Specialists
              </div>
              <h1>Book your doctor appointment in minutes.</h1>
              <p>Choose your preferred medical center, specialty and time slot.</p>
              <div className="booking-hero-badges">
                <span><ShieldCheck size={14} color="#4ade80" /> Verified Hospitals</span>
                <span><Clock size={14} color="#67e8f9" /> Real-time Availability</span>
                <span><Heart size={14} color="#fb923c" /> Trusted Healthcare</span>
              </div>
            </div>
          </div>
          <div className="booking-hero-img-wrap" aria-hidden="true">
            <img src="/images/consult-doctor.png" alt="" className="booking-hero-img" />
            <div className="booking-hero-stat-badge">
              <CheckCircle2 size={14} />
              <span>Instant Confirmation</span>
            </div>
          </div>
        </div>

        {/* Body Split: Left Vertical Stepper Sidebar & Right Content */}
        <div className="booking-body-split" ref={bodySplitRef}>
          {/* Left Sidebar: Vertical Stepper */}
          <aside className="booking-sidebar">
            <div className="booking-stepper-vertical">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const Icon = step.icon;
                const canClick = step.id < currentStep;
                const hasLineBelow = index < STEPS.length - 1;
                const isLineFilled = currentStep > step.id;

                let iconBg = 'var(--bg-surface)';
                let iconColor = 'var(--text-muted)';
                let iconBorder = '2px solid var(--border)';

                if (isCompleted || isCurrent) {
                  iconBg = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
                  iconColor = '#fff';
                  iconBorder = '2px solid var(--primary)';
                }

                return (
                  <div
                    key={step.id}
                    onClick={(e) => handleStepClick(e, step)}
                    className={`booking-step-item-vertical${isCurrent ? ' is-current' : ''}${isCompleted ? ' is-completed' : ''}`}
                    style={{
                      cursor: canClick ? 'pointer' : 'default',
                      opacity: (isCompleted || isCurrent) ? 1 : 0.45
                    }}
                  >
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="booking-step-icon-vertical" style={{ background: iconBg, border: iconBorder, color: iconColor }}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                      </div>
                      {hasLineBelow && (
                        <div className="booking-step-connector">
                          <div
                            className="booking-step-connector-fill"
                            style={{ height: isLineFilled ? '100%' : '0%' }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="booking-step-text-vertical">
                      <span className="booking-step-num">Step 0{step.id + 1}</span>
                      <span className="booking-step-title-vertical" style={{ fontWeight: isCurrent ? '700' : '600', color: isCurrent ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                        {step.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Main Content */}
          <div className="booking-main-content">
            <div className="booking-content-header">
              {breadcrumbParts.length > 0 && currentStep < 5 && (
                <div style={{ display: 'flex', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-main)', flexWrap: 'wrap' }}>
                    {breadcrumbParts.map((p, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {i > 0 && <ChevronRight size={10} color="var(--text-muted)" />}
                        <span style={{ fontWeight: p.bold ? '700' : '600', color: p.color || 'inherit' }}>{p.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <h1 className="booking-header-title">{title}</h1>
              {subtitle && <p className="booking-header-subtitle">{subtitle}</p>}
            </div>

            <div className="booking-content-area">
              {children}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

