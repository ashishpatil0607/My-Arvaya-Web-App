import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, X, ArrowRight, ArrowLeft, UserPlus, Loader2, KeyRound, Sparkles, User, FileText, ChevronRight } from "lucide-react";
import { Overlay } from "./SharedComponents";
import { abhaCreateRequestOtp, abhaCreateVerifyOtp, abhaGetSuggestions } from "../../../services/abhaService";
import { useAuth } from "../../../context/AuthContext";

function ErrorBox({ msg }) {
  return !msg ? null : (
    <div style={{
      background: '#fef2f2', color: '#dc2626', padding: '14px 18px',
      borderRadius: '12px', fontSize: '13.5px', marginBottom: '24px',
      fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px',
      border: '1px solid #fecaca', boxShadow: '0 4px 12px rgba(220,38,38,0.08)',
      animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <X size={16} style={{ flexShrink: 0, background: '#fee2e2', borderRadius: '50%', padding: '2px' }} />
      {msg}
    </div>
  );
}

function StepIndicator({ current, total }) {
  const steps = ["Verify Mobile", "Enter OTP", "Create Address"];
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
            <div style={{
              flex: 1, height: '4px', borderRadius: '99px',
              background: i < current ? 'var(--primary)' : i === current ? 'var(--accent)' : '#f3f4f6',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative', overflow: 'hidden'
            }}>
              {(i === current) && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%', width: '50%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                  animation: 'shimmer 1.5s infinite'
                }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
        {steps.map((label, i) => (
          <div key={i} style={{
            fontSize: '11px', fontWeight: i === current ? '700' : '600',
            color: i <= current ? 'var(--text-main)' : 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            transition: 'color 0.3s'
          }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreateAddressModal({ abhaData, profileInfo, user, onClose }) {
  const { showToast } = useAuth();
  // Step: 'send_otp' | 'verify_otp' | 'select_address' | 'success'
  const [step, setStep] = useState("send_otp");
  const [txnId, setTxnId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [createdAddr, setCreatedAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const otpRefs = useRef([]);
  // Synchronous lock so a fast double-click can't fire the same request twice
  const requestLockRef = useRef(false);

  // Block closing the modal while a request is in flight
  const handleClose = () => {
    if (requestLockRef.current) return;
    onClose();
  };

  const mobileNumber = user?.mobile_number || user?.phone || user?.mobile || localStorage.getItem("mobile_number") || "";
  const maskedMobile = mobileNumber ? `${mobileNumber.slice(0, 2)}******${mobileNumber.slice(-2)}` : "your registered number";

  // ── STEP 1: Send OTP ──
  const handleSendOtp = async () => {
    if (requestLockRef.current) return;
    if (!mobileNumber) {
      const msg = "Mobile number not found. Please login again.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const res = await abhaCreateRequestOtp(mobileNumber);
      if (res?.txnId) {
        setTxnId(res.txnId);
        if (showToast) showToast("OTP sent successfully", "success");
        setStep("verify_otp");
      } else {
        const msg = res?.message || "You have exceeded ABHA address creation limit";
        setErr(msg);
        if (showToast) showToast(msg, "error");
      }
    } catch (error) {
      const msg = error?.message || "You have exceeded ABHA address creation limit";
      setErr(msg);
      if (showToast) showToast(msg, "error");
    } finally {
      setBusy(false);
      requestLockRef.current = false;
    }
  };

  // ── STEP 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    if (requestLockRef.current) return;
    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      const msg = "Please enter the full 6-digit OTP.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const verifyRes = await abhaCreateVerifyOtp(otpValue, txnId);
      const newTxnId = verifyRes?.txnId || txnId;
      setTxnId(newTxnId);
      if (showToast) showToast("OTP verified successfully", "success");
      await fetchSuggestions(newTxnId);
    } catch (error) {
      const msg = error?.message || "OTP verification failed. Please try again.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      setBusy(false);
    } finally {
      // fetchSuggestions clears `busy`; release the lock once the whole chain settles
      requestLockRef.current = false;
    }
  };

  const fetchSuggestions = async (currentTxnId) => {
    try {
      const profileData = {
        firstName: profileInfo?.firstName || abhaData?.name?.split(" ")?.[0] || "",
        lastName: profileInfo?.lastName || abhaData?.name?.split(" ")?.slice(-1)?.[0] || "",
        dayOfBirth: profileInfo?.dayOfBirth || abhaData?.dob?.day || "",
        monthOfBirth: profileInfo?.monthOfBirth || abhaData?.dob?.month || "",
        yearOfBirth: profileInfo?.yearOfBirth || abhaData?.dob?.year || "",
        email: user?.email || "",
      };
      const res = await abhaGetSuggestions(currentTxnId, profileData);
      if (res?.abhaAddressList) {
        setSuggestions(res.abhaAddressList);
        if (res.txnId) setTxnId(res.txnId);
      }
      setStep("select_address");
    } catch (error) {
      setErr(error?.message || "Failed to fetch suggestions. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── STEP 3: Create Address ──
  const handleCreateAddress = async () => {
    if (requestLockRef.current) return;
    const finalAddress = selectedAddr || (customPrefix ? `${customPrefix}@abdm` : "");
    if (!finalAddress) { setErr("Please select or enter an ABHA address."); return; }
    if (customPrefix && !selectedAddr) {
      if (customPrefix.length < 4) { setErr("ABHA address must be at least 4 characters."); return; }
      if (!/^[a-zA-Z0-9._]+$/.test(customPrefix)) { setErr("Only letters, numbers, dots and underscores allowed."); return; }
    }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      // Mock success as API is unavailable
      await new Promise(r => setTimeout(r, 600));
      setCreatedAddr(finalAddress);
      setStep("success");
    } catch (error) {
      setErr(error?.message || "Failed to create address. Please try again.");
    } finally {
      setBusy(false);
      requestLockRef.current = false;
    }
  };

  // ── OTP Input Handling ──
  const handleOtpChange = (idx, val) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length > 0) {
      const newOtp = [...otp];
      paste.split("").forEach((ch, i) => { newOtp[i] = ch; });
      setOtp(newOtp);
      const focusIdx = Math.min(paste.length, 5);
      otpRefs.current[focusIdx]?.focus();
    }
  };

  const stepIndex = step === "send_otp" ? 0 : step === "verify_otp" ? 1 : step === "select_address" ? 2 : 3;

  // ── SUCCESS VIEW ──
  if (step === "success") {
    return (
      <Overlay onClose={onClose}>
        <div style={{
          background: '#fff', borderRadius: '28px', width: '100%', maxWidth: '440px',
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh', fontFamily: 'var(--font-sans)',
          animation: 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ padding: '36px 32px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
              boxShadow: '0 0 0 12px rgba(22,163,74,0.08)', position: 'relative'
            }}>
              <CheckCircle2 size={44} color="#16a34a" strokeWidth={2.5} style={{ animation: 'popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
              <Sparkles size={20} color="#16a34a" style={{ position: 'absolute', top: '-10px', right: '-10px', animation: 'spin 4s linear infinite' }} />
            </div>
            <h3 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', letterSpacing: '-0.02em' }}>Address Created!</h3>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.6 }}>Your digital health identity is now ready to use.</p>

            <div style={{
              background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid #bbf7d0',
              borderRadius: '16px', padding: '20px 24px', fontFamily: 'monospace', fontSize: '18px',
              fontWeight: '700', color: '#166534', marginBottom: '36px', letterSpacing: '0.02em',
              width: '100%', textAlign: 'center', boxShadow: 'inset 0 2px 8px rgba(22,163,74,0.05)'
            }}>
              {createdAddr}
            </div>

            <button onClick={onClose} style={{
              width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, #1a4a50 100%)',
              color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 20px rgba(46,102,110,0.3)'
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              Continue to Dashboard
            </button>
          </div>
        </div>
        <style>{`
          @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes scaleIn { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
      </Overlay>
    );
  }

  // ── MAIN MODAL ──
  return (
    <Overlay onClose={handleClose}>
      <div style={{
        background: '#fff', borderRadius: '28px', width: '100%', maxWidth: '500px',
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh', fontFamily: 'var(--font-sans)',
        animation: 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {step !== "send_otp" && (
              <button onClick={() => { setErr(""); setStep(step === "select_address" ? "verify_otp" : "send_otp"); }} disabled={busy} style={{
                background: '#f3f4f6', border: 'none', cursor: busy ? 'default' : 'pointer', padding: '6px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', transition: 'background 0.2s', opacity: busy ? 0.6 : 1
              }}
                onMouseEnter={e => !busy && (e.currentTarget.style.background = '#e5e7eb')} onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>
                <ArrowLeft size={18} color="var(--text-main)" />
              </button>
            )}
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary-light) 0%, #e0f2fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5)' }}>
              <UserPlus size={20} color="var(--primary)" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {step === "send_otp" ? "Create Address" : step === "verify_otp" ? "Verify Identity" : "Choose Address"}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>ABHA Digital Health Mission</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={busy} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'default' : 'pointer', flexShrink: 0, transition: 'all 0.2s', opacity: busy ? 0.6 : 1 }}
            onMouseEnter={e => { if (busy) return; e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.transform = 'rotate(90deg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.transform = 'rotate(0deg)'; }}>
            <X size={16} color="#6b7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, position: 'relative' }}>
          <StepIndicator current={stepIndex} total={3} />
          {err && <ErrorBox msg={err} />}

          {/* ── STEP 1: Send OTP ── */}
          {step === "send_otp" && (
            <div style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #e2e8f0' }}>
                  <User size={36} color="#94a3b8" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px' }}>Verify your mobile number</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, padding: '0 20px' }}>
                  We will send a one-time password to your registered number <strong>{maskedMobile}</strong>.
                </p>
              </div>

              <div style={{
                background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid #bbf7d0', borderRadius: '16px',
                padding: '16px 20px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '12px',
                boxShadow: '0 4px 12px rgba(22,165,74,0.03)'
              }}>
                <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '10px' }}>
                  <KeyRound size={20} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#166534', fontWeight: '700', marginBottom: '4px' }}>Secure Verification</div>
                  <div style={{ fontSize: '13px', color: '#15803d', opacity: 0.8 }}>This ensures only you can create an address linked to your profile.</div>
                </div>
              </div>

              <button
                disabled={busy}
                onClick={handleSendOtp}
                style={{
                  width: '100%', background: busy ? '#e5e7eb' : 'linear-gradient(135deg, var(--primary) 0%, #1a4a50 100%)',
                  color: busy ? '#9ca3af' : '#fff', border: 'none', padding: '16px',
                  borderRadius: '14px', fontSize: '15px', fontWeight: '700',
                  cursor: busy ? 'default' : 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: busy ? 'none' : '0 8px 20px rgba(46,102,110,0.25)',
                  transform: busy ? 'none' : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
                onMouseEnter={e => !busy && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {busy ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending OTP...</> : <>Send OTP <ArrowRight size={18} /></>}
              </button>
            </div>
          )}

          {/* ── STEP 2: Verify OTP ── */}
          {step === "verify_otp" && (
            <div style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#3b82f6' }}>
                  <KeyRound size={28} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px' }}>Enter Verification Code</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  Please enter the 6-digit OTP sent to<br /><strong>{maskedMobile}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '36px' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    style={{
                      width: '52px', height: '60px', textAlign: 'center', fontSize: '24px',
                      fontWeight: '700', border: digit ? '2px solid var(--primary)' : '2px solid #e5e7eb',
                      borderRadius: '14px', outline: 'none', background: digit ? 'var(--primary-light)' : '#f9fafb',
                      color: 'var(--primary-dark)', transition: 'all 0.2s', fontFamily: 'monospace',
                      boxShadow: digit ? '0 4px 12px rgba(46,102,110,0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(46,102,110,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = digit ? 'var(--primary)' : '#e5e7eb'; e.currentTarget.style.background = digit ? 'var(--primary-light)' : '#f9fafb'; e.currentTarget.style.boxShadow = digit ? '0 4px 12px rgba(46,102,110,0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                  />
                ))}
              </div>
              <button
                disabled={busy || otp.join("").length < 6}
                onClick={handleVerifyOtp}
                style={{
                  width: '100%', background: busy || otp.join("").length < 6 ? '#e5e7eb' : 'linear-gradient(135deg, var(--primary) 0%, #1a4a50 100%)',
                  color: busy || otp.join("").length < 6 ? '#9ca3af' : '#fff',
                  border: 'none', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: '700',
                  cursor: busy || otp.join("").length < 6 ? 'default' : 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: busy || otp.join("").length < 6 ? 'none' : '0 8px 20px rgba(46,102,110,0.25)',
                  transform: busy ? 'none' : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
                onMouseEnter={e => !(busy || otp.join("").length < 6) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {busy ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</> : <>Verify OTP <ArrowRight size={18} /></>}
              </button>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Didn't receive the code? </span>
                <button onClick={handleSendOtp} disabled={busy} style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: '13.5px', fontWeight: '700', cursor: busy ? 'default' : 'pointer', padding: '4px', opacity: busy ? 0.6 : 1
                }}>
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Select / Create Address ── */}
          {step === "select_address" && (
            <div style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#fef9c3', padding: '4px', borderRadius: '6px' }}><Sparkles size={14} color="#ca8a04" /></div> Suggested For You
                    </label>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {suggestions.map(addr => {
                      const isSelected = selectedAddr === addr;
                      return (
                        <button key={addr} disabled={busy} onClick={() => { setSelectedAddr(addr); setCustomPrefix(""); setErr(""); }}
                          style={{
                            padding: '16px 20px', borderRadius: '14px', textAlign: 'left',
                            border: isSelected ? '2px solid var(--primary)' : '1.5px solid #e5e7eb',
                            background: isSelected ? 'var(--primary-light)' : '#fff',
                            color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                            fontSize: '15px', fontFamily: 'monospace', fontWeight: isSelected ? '700' : '600',
                            cursor: busy ? 'default' : 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: busy && !isSelected ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            boxShadow: isSelected ? '0 4px 12px rgba(46,102,110,0.1)' : '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                          onMouseEnter={e => !isSelected && !busy && (e.currentTarget.style.borderColor = '#d1d5db')}
                          onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = '#e5e7eb')}
                        >
                          <span style={{ letterSpacing: '0.02em' }}>{addr}</span>
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            border: isSelected ? 'none' : '2px solid #d1d5db',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}>
                            {isSelected && <CheckCircle2 size={14} color="#fff" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Address */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR CREATE CUSTOM</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                <div style={{
                  display: 'flex', border: selectedAddr ? '1.5px solid #e5e7eb' : '2px solid var(--primary)',
                  borderRadius: '14px', overflow: 'hidden', background: '#fff', transition: 'all 0.3s',
                  boxShadow: selectedAddr ? '0 2px 6px rgba(0,0,0,0.02)' : '0 4px 16px rgba(46,102,110,0.1)'
                }}>
                  <div style={{ padding: '16px 14px 16px 20px', display: 'flex', alignItems: 'center', color: '#9ca3af' }}>
                    <FileText size={18} />
                  </div>
                  <input type="text" value={customPrefix} disabled={busy}
                    onChange={e => { setCustomPrefix(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").toLowerCase()); setSelectedAddr(""); }}
                    placeholder="e.g. rahul.sharma"
                    style={{ flex: 1, padding: '16px 0', border: 'none', outline: 'none', fontSize: '16px', fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: '600', background: 'transparent', letterSpacing: '0.02em' }} />
                  <div style={{ padding: '16px 20px', background: '#f8fafc', color: 'var(--text-muted)', fontSize: '15px', fontFamily: 'monospace', fontWeight: '700', borderLeft: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    @abdm
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChevronRight size={12} /> Minimum 4 characters. Letters, numbers, dots, and underscores only.
                </p>
              </div>

              <button
                disabled={busy || (!selectedAddr && !customPrefix.trim())}
                onClick={handleCreateAddress}
                style={{
                  width: '100%',
                  background: busy || (!selectedAddr && !customPrefix.trim()) ? '#e5e7eb' : 'linear-gradient(135deg, var(--accent) 0%, #ea580c 100%)',
                  color: busy || (!selectedAddr && !customPrefix.trim()) ? '#9ca3af' : '#fff',
                  border: 'none', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: '700',
                  cursor: busy || (!selectedAddr && !customPrefix.trim()) ? 'default' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: busy || (!selectedAddr && !customPrefix.trim()) ? 'none' : '0 8px 24px rgba(234,88,12,0.3)',
                  transform: busy ? 'none' : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
                onMouseEnter={e => !(busy || (!selectedAddr && !customPrefix.trim())) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {busy ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <>Complete Setup <ArrowRight size={18} /></>}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes scaleIn { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeInUp { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { 0% { transform: translateY(-10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      `}</style>
    </Overlay>
  );
}
