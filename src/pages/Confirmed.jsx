import { useEffect, useRef } from "react";
import { CheckCircle2, CalendarDays, Clock, MapPin, Building2, Download, Share2, Mail, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import Steps from "../components/common/Steps";
import Avatar from "../components/common/Avatar";
import LabItemIcon from "../components/labs/LabItemIcon";

export default function Confirmed() {
  let { doctor, date, slot, bookingId, bookingType, labPackage, labVisitType, clearBooking } = useBooking(),
    go = useNavigate();
  const isCenterVisit = bookingType === "lab" && labVisitType === "lab";

  // clearBooking is recreated on every render; calling it from a dependency-driven
  // cleanup re-renders the provider and loops. Keep the latest one in a ref and
  // clear only once, when the page actually unmounts.
  const clearRef = useRef(clearBooking);
  clearRef.current = clearBooking;
  useEffect(() => {
    return () => {
      if (clearRef.current) clearRef.current();
    };
  }, []);

  const formattedDate = date && date instanceof Date
    ? date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : "";

  const handleAddToCalendar = () => {
    if (!date || !(date instanceof Date)) return;
    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatIcsDate = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}Z`;
    };
    const title = bookingType === 'lab' ? labPackage?.title : doctor?.name;
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Arvaya Healthcare//Booking Confirmation//EN",
      "BEGIN:VEVENT",
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${title || "Booking with Arvaya Healthcare"}`,
      "DESCRIPTION:Booking confirmed with Arvaya Healthcare",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arvaya-booking.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareDetails = () => {
    const details = `My ${bookingType === 'lab' ? 'lab test' : 'appointment'} is confirmed with Arvaya Healthcare.\nBooking ID: ${bookingId || "APMNT12345678"}\nDate: ${formattedDate}`;
    if (navigator.share) {
      navigator.share({
        title: "Arvaya Healthcare Booking Confirmation",
        text: details,
      }).catch((err) => {
        console.error("Share failed:", err);
        navigator.clipboard.writeText(details).then(() => {
          alert("Booking details copied to clipboard!");
        });
      });
    } else {
      navigator.clipboard.writeText(details).then(() => {
        alert("Booking details copied to clipboard!");
      }).catch(() => {
        alert("Unable to share. Please copy the details manually.");
      });
    }
  };

  return (
    <main className="page page-enter confirmed-page" style={{ background: 'var(--bg-app)', minHeight: '100vh', padding: '24px 0' }}>
      <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Steps current={4} />
        
        <section className="card-elevated animate-scale-in cf-card">

          <style>{`
            .cf-card {
              text-align: center; position: relative; overflow: hidden;
              padding: 24px 28px 24px; margin-top: 16px;
              background: var(--bg-surface);
              border-radius: 24px;
              box-shadow: 0 24px 60px rgba(46, 102, 110, 0.14), 0 2px 6px rgba(46, 102, 110, 0.06);
            }
            .cf-card::before {
              content: ""; position: absolute; inset: 0 0 auto 0; height: 160px;
              -webkit-mask-image: linear-gradient(to bottom, #000 45%, transparent);
              mask-image: linear-gradient(to bottom, #000 45%, transparent);
              background:
                radial-gradient(circle at 20% 0%, rgba(34, 197, 94, 0.18), transparent 55%),
                radial-gradient(circle at 85% 10%, rgba(13, 148, 136, 0.18), transparent 50%),
                linear-gradient(180deg, rgba(220, 252, 231, 0.6), rgba(255, 255, 255, 0));
              pointer-events: none;
            }
            .cf-card > * { position: relative; }

            @keyframes cf-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
            @keyframes cf-ring { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.7); opacity: 0; } }
            @keyframes cf-float { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.9; } 50% { transform: translateY(-8px) scale(1.2); opacity: 0.5; } }
            @keyframes cf-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
            @keyframes cf-shine { 0% { left: -60%; } 100% { left: 130%; } }

            .cf-icon-stage { position: relative; width: 76px; height: 76px; margin: 0 auto 10px; }
            .cf-ring {
              position: absolute; inset: 12px; border-radius: 50%;
              border: 2px solid rgba(34, 197, 94, 0.5);
              animation: cf-ring 2.2s ease-out infinite;
            }
            .cf-ring.delay { animation-delay: 1.1s; }
            .cf-icon-halo {
              position: absolute; inset: 0; border-radius: 50%;
              background: radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, rgba(34, 197, 94, 0.06) 60%, transparent 70%);
            }
            .success-icon-wrap {
              position: absolute; inset: 12px; border-radius: 50%;
              background: linear-gradient(135deg, #34d399 0%, var(--success) 55%, #15803d 100%);
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 8px 18px rgba(22, 163, 74, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.35);
              animation: cf-pop 0.6s cubic-bezier(.2, .9, .3, 1.4) both;
            }
            .cf-spark { position: absolute; border-radius: 50%; animation: cf-float 2.6s ease-in-out infinite; }
            .cf-spark.s1 { width: 7px; height: 7px; background: #fbbf24; top: 4px; left: 0; }
            .cf-spark.s2 { width: 5px; height: 5px; background: #0d9488; top: 0; right: 8px; animation-delay: .4s; }
            .cf-spark.s3 { width: 6px; height: 6px; background: #f472b6; bottom: 8px; right: -4px; animation-delay: .8s; }
            .cf-spark.s4 { width: 5px; height: 5px; background: #60a5fa; bottom: 4px; left: 10px; animation-delay: 1.2s; }

            .cf-title {
              font-size: 22px; color: var(--text-main); margin: 0 0 12px;
              line-height: 1.25; letter-spacing: -0.02em; font-weight: 800;
              animation: cf-rise .5s .15s ease-out both;
            }
            .cf-hl {
              background: linear-gradient(90deg, var(--success), #0d9488);
              -webkit-background-clip: text; background-clip: text; color: transparent;
            }

            .cf-ticket {
              position: relative; display: inline-flex; flex-direction: column; gap: 2px;
              padding: 7px 26px; margin-bottom: 16px;
              background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
              border: 1.5px dashed rgba(13, 148, 136, 0.45);
              border-radius: 16px;
              animation: cf-rise .5s .25s ease-out both;
            }
            .cf-ticket::before, .cf-ticket::after {
              content: ""; position: absolute; top: 50%; width: 14px; height: 14px; margin-top: -7px;
              border-radius: 50%; background: var(--bg-surface);
              border: 1.5px dashed rgba(13, 148, 136, 0.45);
            }
            .cf-ticket::before { left: -8px; border-left-color: transparent; border-bottom-color: transparent; transform: rotate(45deg); }
            .cf-ticket::after { right: -8px; border-right-color: transparent; border-top-color: transparent; transform: rotate(45deg); }
            .cf-ticket-label { font-size: 10px; color: #0f766e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }
            .cf-ticket-code { font-size: 16px; color: var(--primary-dark); letter-spacing: 1.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }

            .cf-details {
              border: 1px solid var(--border); padding: 18px 20px; border-radius: 18px;
              text-align: left; margin-bottom: 16px; background: #fff;
              box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
              transition: transform .25s ease, box-shadow .25s ease;
              animation: cf-rise .5s .35s ease-out both;
            }
            .cf-details:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08); }
            .cf-thumb {
              width: 56px; height: 56px; border-radius: 14px; flex-shrink: 0; object-fit: cover;
              background: linear-gradient(135deg, var(--primary-light), #d1fae5);
              display: flex; align-items: center; justify-content: center; color: var(--primary);
            }

            .receipt-row { display: flex; align-items: center; gap: 14px; font-size: 15px; color: var(--text-main); font-weight: 500; }
            .receipt-row svg { flex-shrink: 0; color: var(--primary); }
            .cf-row-icon {
              width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
              display: inline-flex; align-items: center; justify-content: center;
              background: var(--primary-light);
            }

            .cf-note {
              display: flex; align-items: flex-start; gap: 14px;
              text-align: left; margin: 0 0 16px;
              padding: 14px 16px; border-radius: 14px;
              background: linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(13, 148, 136, 0.02));
              border: 1px solid rgba(13, 148, 136, 0.16);
              border-left: 4px solid var(--primary);
              animation: cf-rise .5s .45s ease-out both;
            }
            .cf-note-icon {
              flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px;
              display: grid; place-items: center;
              background: var(--primary); color: #fff;
              box-shadow: 0 6px 14px rgba(13, 148, 136, 0.28);
            }
            .cf-note-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
            .cf-note-title { font-size: 14px; font-weight: 600; color: var(--text, #0f172a); line-height: 1.3; }
            .cf-note-text { font-size: 13px; color: var(--muted); line-height: 1.5; }
            .cf-note-chips { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
            .cf-chip {
              display: inline-flex; align-items: center; gap: 4px;
              font-size: 11px; font-weight: 600; color: var(--primary);
              padding: 3px 8px; border-radius: 999px;
              background: rgba(13, 148, 136, 0.1);
            }

            .cf-btn {
              position: relative; overflow: hidden;
              padding: 16px; justify-content: center; font-size: 16px; height: 56px;
              border-radius: 14px;
              box-shadow: 0 10px 24px rgba(13, 148, 136, 0.3);
              transition: transform .2s ease, box-shadow .2s ease;
              animation: cf-rise .5s .55s ease-out both;
            }
            .cf-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(13, 148, 136, 0.38); }
            .cf-btn::after {
              content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
              background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent);
              transform: skewX(-20deg);
              animation: cf-shine 3s 1.2s ease-in-out infinite;
            }

            @media (max-width: 600px) {
              .cf-card { padding: 24px 16px 20px; }
              .cf-title { font-size: 20px; }
              .cf-ticket { padding: 7px 20px; }
              .cf-ticket-code { font-size: 14px; }
            }
            @media (prefers-reduced-motion: reduce) {
              .cf-card *, .cf-card *::before, .cf-card *::after { animation: none !important; }
            }
          `}</style>

          <div className="cf-icon-stage">
            <span className="cf-icon-halo" />
            <span className="cf-ring" />
            <span className="cf-ring delay" />
            <div className="success-icon-wrap">
              <CheckCircle2 color="white" size={28} strokeWidth={2.2} />
            </div>
            <span className="cf-spark s1" />
            <span className="cf-spark s2" />
            <span className="cf-spark s3" />
            <span className="cf-spark s4" />
          </div>

          <h1 className="cf-title">
            Your {bookingType === 'lab' ? (isCenterVisit ? "diagnostic center visit" : "sample collection") : "appointment"} has<br /><span className="cf-hl">been confirmed!</span>
          </h1>

          <div className="cf-ticket">
            <span className="cf-ticket-label">Booking ID</span>
            <b className="cf-ticket-code">
              {bookingId || "APMNT12345678"}
            </b>
          </div>

          <div className="cf-details">
            <div style={{ display: "flex", gap: "16px", marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px dashed var(--border)" }}>
              {bookingType === 'lab' && labPackage ? (
                <>
                  <span className="cf-thumb"><LabItemIcon item={labPackage} size={28} /></span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
                    <b style={{ fontSize: "18px", color: "var(--text-main)" }}>{labPackage.title}</b>
                    <small style={{ fontSize: "14px", color: "var(--muted)" }}>{labPackage.tests}</small>
                  </div>
                </>
              ) : (
                <>
                  <Avatar doctor={doctor} size="64px" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
                    <b style={{ fontSize: "18px", color: "var(--text-main)", display: 'flex', alignItems: 'center', gap: '6px' }}>{doctor?.name} <CheckCircle2 size={16} className="text-success" /></b>
                    <small style={{ fontSize: "14px", color: "var(--muted)" }}>{doctor?.specialty}</small>
                  </div>
                </>
              )}
            </div>
            
             <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
               <span className="receipt-row">
                 <span className="cf-row-icon"><CalendarDays size={18} /></span> {formattedDate}
               </span>
               {bookingType !== 'lab' && (
               <span className="receipt-row">
                 <span className="cf-row-icon"><Clock size={18} /></span> {slot}
               </span>
               )}
               <span className="receipt-row">
                 <span className="cf-row-icon">{isCenterVisit ? <Building2 size={18} /> : <MapPin size={18} />}</span> {bookingType === 'lab' ? (isCenterVisit ? "Diagnostic Center Visit" : "Home Collection") : (doctor?.hospital || "Arvaya Clinic")}
               </span>
             </div>
          </div>

          <div className="cf-note">
            <span className="cf-note-icon"><Mail size={20} /></span>
            <div className="cf-note-body">
              <strong className="cf-note-title">Confirmation sent</strong>
              <span className="cf-note-text">Appointment details and instructions are on their way to your registered email and phone.</span>
              <div className="cf-note-chips">
                <span className="cf-chip"><Mail size={12} /> Email</span>
                <span className="cf-chip"><MessageSquare size={12} /> SMS</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
            <button className="btn btn-primary cf-btn" onClick={() => go(bookingType === 'lab' ? "/orders" : "/my-appointments")}>
              {bookingType === 'lab' ? "My Orders" : "Go to My Appointments"}
            </button>
           
          </div>
        </section>
      </div>
    </main>
  );
}
