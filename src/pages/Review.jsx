import { ArrowLeft, CheckCircle2, FileText, BadgePercent } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import { bookAppointment, verifyPayment } from "../services/dataService";
import { stripTitle } from "../utils/formatName";
import Steps from "../components/common/Steps";
import Avatar from "../components/common/Avatar";

export default function Review() {
  let { doctor, date, slot, setBookingId } = useBooking(),
    go = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  let confirm = async () => {
    setSubmitting(true);
    try {
      const patient_id = user?.id || user?.user_id || user?.patient_id || "";
      const dStrRaw = typeof date === 'string' ? date : (date instanceof Date ? 
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` 
        : "");
      const dStr = dStrRaw.replace(/-/g, '');

      const payload = {
        patient_id: patient_id,
        dr: doctor.id || doctor.drkey,
        entitylocation: doctor.locations?.[0]?.location_key || "",
        date: dStr,
        start: slot,
        end: slot,
        entitykey: "secure-hospitals",
        session: "",
        sessionval: `${slot}-${slot}`,
        appnotes: "",
        referred_by: "",
        referredbykey: "",
        extphid: "",
        fname: user?.name || "Guest",
        phone: user?.mobile || user?.phone || "N/A",
        title: user?.title || "",
        age: user?.age || "",
        altphone: user?.altphone || user?.alt_phone || "",
        email: user?.email || "",
        amount: parseInt(doctor.fee) || 0,
        wallet_amount_used: 0,
        drname: doctor?.name ? (doctor.name.startsWith("Dr") ? doctor.name : `Dr.${doctor.name}`) : "",
        patient_name: stripTitle(user?.name) || "Guest"
      };

      const result = await bookAppointment(payload);

      const amountToPay = parseInt(doctor.fee) || 0;

      if (amountToPay <= 0) {
        setBookingId(result.order_id || result.bookingId || "APMNT" + Date.now().toString().slice(-8));
        go("/confirmed");
        return;
      }

      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you offline?");
        setSubmitting(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amountToPay * 100,
        currency: "INR",
        name: "Arvaya Healthcare",
        description: "Doctor Consultation",
        order_id: result.razorpay_order_id,
        handler: async function (response) {
          try {
            const { amount, wallet_amount_used, ...verifyPayload } = payload;
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              token_no: result.token_no || 1,
              ...verifyPayload
            });
            setBookingId(result.razorpay_order_id || result.bookingId || "APMNT" + Date.now().toString().slice(-8));
            go("/confirmed");
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

  const formattedDate = date && date instanceof Date
    ? date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : "";

  if (!doctor) return null;

  return (
    <main className="page page-enter" style={{ background: 'var(--bg-app)', minHeight: '100vh', padding: '24px 0' }}>
      <div className="container">

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '600', transition: 'color 0.2s' }} onClick={() => go(-1)} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-main)'}>
          <ArrowLeft size={20} /> <span>Back to Selection</span>
        </div>

        <Steps current={3} />

        <style>{`
          .review-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; margin-top: 32px; }
          @media (max-width: 900px) { .review-layout { grid-template-columns: 1fr; } }
          .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px dashed var(--border); }
          .summary-row:last-child { border-bottom: none; }
        `}</style>

        <div className="review-layout">
          <section className="card-elevated animate-fade-in-up" style={{ padding: '32px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>Review Appointment</h1>
            </div>

            <div style={{ display: "flex", gap: "20px", marginBottom: "32px", border: "1px solid var(--border)", padding: "20px", borderRadius: "var(--radius-lg)", background: 'var(--bg-app)', alignItems: 'center' }}>
              <Avatar doctor={doctor} size="64px" />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <b style={{ fontSize: "18px", color: "var(--text-main)", display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {doctor.name} <CheckCircle2 size={16} className="text-success" />
                </b>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                  <span>{doctor.specialty}</span>
                  <span style={{ color: 'var(--border)' }}>|</span>
                  <span>{doctor.hospital}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-app)', padding: '0 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              {[
                ["Date", formattedDate],
                ["Time", slot],
                ["Patient", user?.name || "Patient"],
                ["Purpose of Visit", "Regular Checkup"],
                ["Mode", "In-clinic"],
              ].map((x) => (
                <div className="summary-row" key={x[0]}>
                  <span style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: '500' }}>{x[0]}</span>
                  <b style={{ color: 'var(--text-main)', fontSize: '15px' }}>{x[1]}</b>
                </div>
              ))}
            </div>
          </section>

          <aside className="card-elevated animate-fade-in-up" style={{ alignSelf: 'start', padding: '32px', background: 'var(--bg-surface)', animationDelay: '100ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <BadgePercent size={20} className="text-primary" />
              <b style={{ fontSize: '16px', color: 'var(--text-main)' }}>Apply Coupon</b>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input placeholder="Enter code" style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              <button className="btn btn-secondary" style={{ padding: '0 24px' }}>Apply</button>
            </div>
            
            <div className="badge badge-success" style={{ display: 'inline-flex', marginBottom: '32px' }}>
              Available: FREECONSULT
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <span>Consultation Fee</span>
              <span>₹{doctor.fee || "0"}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', color: 'var(--success)', fontSize: '14px', fontWeight: '600' }}>
              <span>Platform Fee Discount</span>
              <span>-₹49</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 32px', borderTop: '2px dashed var(--border)', paddingTop: '24px' }}>
              <span style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: '700' }}>Total Amount</span>
              <b style={{ fontSize: '28px', color: 'var(--text-main)' }}>₹{doctor.fee || "0"}</b>
            </div>

            <button className="btn btn-primary" onClick={confirm} disabled={submitting} style={{ padding: '16px', width: '100%', justifyContent: 'center', fontSize: '16px', fontWeight: '700', boxShadow: '0 8px 24px rgba(46, 102, 110, 0.25)', height: '56px' }}>
              {submitting ? <div className="loading-spinner"></div> : "Confirm Booking"}
            </button>
            <p className="text-muted text-center mt-4" style={{ fontSize: '12px' }}>By confirming, you agree to our terms and conditions.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
