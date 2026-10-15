import React, { useState, useEffect, useRef } from "react";
import { X, ArrowLeft, CheckCircle2, Users, Phone, Loader2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { abhaSendOtp, abhaVerifyOtp, abhaGetSuggestions, abhaConfirmAddress } from "../../../services/abhaService";
import { Overlay } from "./SharedComponents";

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", marginBottom: "16px", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: "8px" }}>
      <X size={14} style={{ flexShrink: 0 }} />{msg}
    </div>
  );
}

export function SwitchProfileModal({ onClose }) {
  const { saveSession, showToast } = useAuth();
  const [step, setStep]               = useState(1);
  const [mobile, setMobile]           = useState("");
  const [otp, setOtp]                 = useState("");
  const [txnId, setTxnId]             = useState("");
  const [addresses, setAddresses]     = useState([]);
  const [selected, setSelected]       = useState("");
  const [busy, setBusy]               = useState(false);
  const [err, setErr]                 = useState("");
  const [countdown, setCountdown]     = useState(600);
  const [canResend, setCanResend]     = useState(false);
  const [switchedProfile, setSwitchedProfile] = useState(null);
  const otpRefs = useRef([]);
  // Synchronous lock so a fast double-click can't fire the same request twice
  const requestLockRef = useRef(false);

  // Block closing the modal while a request is in flight
  const handleClose = () => {
    if (requestLockRef.current) return;
    onClose();
  };

  /* ── Countdown timer (step 2) ── */
  useEffect(() => {
    if (step !== 2 || countdown <= 0) { if (countdown <= 0) setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ── Step 1: Send OTP to mobile ── */
  const handleSendOtp = async () => {
    if (requestLockRef.current) return;
    const cleanMobile = mobile.replace(/\D/g, "");
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      const msg = "Mobile number must start with a digit between 6 and 9";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const res = await abhaSendOtp(cleanMobile);
      setTxnId(res?.transactionId || res?.txnId || "mock_txn_" + Date.now());
      setOtp(""); setCountdown(600); setCanResend(false);
      if (showToast) showToast("OTP sent successfully", "success");
      setStep(2);
    } catch (e) {
      const msg = e.message || "Failed to send OTP. Please try again.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
    }
    finally { setBusy(false); requestLockRef.current = false; }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = async () => {
    if (requestLockRef.current) return;
    if (otp.length < 6) {
      const msg = "Enter the 6-digit OTP.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const res = await abhaVerifyOtp(otp, txnId);
      const newTxn = res?.transactionId || res?.txnId || txnId;
      setTxnId(newTxn);
      const addrRes = await abhaGetSuggestions(newTxn, {}).catch(() => null);
      const list = addrRes?.abhaAddressList || addrRes?.addresses || [
        { id: 1, address: `91${mobile}@sbx`, isPrimary: true },
      ];
      setAddresses(list);
      setSelected(list[0]?.address || list[0]?.id || "");
      if (showToast) showToast("OTP verified successfully", "success");
      setStep(3);
    } catch (e) {
      const msg = e.message || "Invalid OTP. Please try again.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
    }
    finally { setBusy(false); requestLockRef.current = false; }
  };

  /* ── Step 3: Confirm address & switch ── */
  const handleConfirm = async () => {
    if (requestLockRef.current) return;
    if (!selected) {
      const msg = "Please select an ABHA address.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const res = await abhaConfirmAddress(selected, "", txnId);
      const abhaResponseToken = res?.token || res?.tokens?.token || res?.data?.tokens?.token || "mock_abha_token_" + Date.now();
      localStorage.setItem("abha_user_token", abhaResponseToken);
      localStorage.setItem("abha_token", abhaResponseToken);
      saveSession({
        token: res?.token || "mock_abha_token_" + Date.now(),
        user: res?.user || { name: "ABHA User" },
        loginMethod: "abha"
      });
      setSwitchedProfile(selected);
      setStep(4);
    } catch (e) {
      const msg = e.message || "Could not switch profile. Please try again.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
    }
    finally { setBusy(false); requestLockRef.current = false; }
  };

  /* ── OTP input grid ── */
  const handleOtpChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;
    const nv = (otp.slice(0, idx) + val + otp.slice(idx + 1)).slice(0, 6);
    setOtp(nv);
    if (idx < 5 && otpRefs.current[idx + 1]) otpRefs.current[idx + 1].focus();
  };
  const handleOtpKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (otp[idx]) { setOtp(otp.slice(0, idx) + otp.slice(idx + 1)); }
      else if (idx > 0 && otpRefs.current[idx - 1]) { otpRefs.current[idx - 1].focus(); setOtp(otp.slice(0, idx - 1) + otp.slice(idx)); }
    } else if (e.key === 'ArrowLeft' && idx > 0) { otpRefs.current[idx - 1]?.focus(); }
    else if (e.key === 'ArrowRight' && idx < 5) { otpRefs.current[idx + 1]?.focus(); }
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { setOtp(p); otpRefs.current[Math.min(p.length, 5)]?.focus(); }
  };

  const stepLabels = ["Mobile Number", "Verify OTP", "Select Address", "Done"];

  return (
    <Overlay onClose={handleClose}>
      <div style={{
        background: "#fff", borderRadius: "24px", width: "100%", maxWidth: "520px",
        position: "relative", boxShadow: "0 30px 60px -12px rgba(0,0,0,0.4)",
        animation: "modalIn 0.35s var(--ease-out) forwards", overflow: "hidden",
        maxHeight: "calc(100dvh - 32px)", display: "flex", flexDirection: "column"
      }}>

        {/* ── Header ── */}
        <div style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)", padding: "24px 28px" }}>
          <button onClick={handleClose} disabled={busy} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.15)", border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, color: "#fff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "10px", padding: "8px", backdropFilter: "blur(8px)" }}>
              <Users size={20} color="white" />
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em" }}>ABHA</div>
              <div style={{ color: "#fff", fontSize: "16px", fontWeight: "800" }}>Switch Profile</div>
            </div>
          </div>

          {/* Step progress bar */}
          <div style={{ display: "flex", gap: "6px" }}>
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const isDone = step > n;
              const isActive = step === n;
              return (
                <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "100%", height: "3px", borderRadius: "99px", background: isDone || isActive ? "var(--accent)" : "rgba(255,255,255,0.2)", transition: "all 0.4s" }} />
                  <span style={{ fontSize: "10px", fontWeight: "600", color: isDone || isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "28px", overflowY: "auto", minHeight: 0 }}>

          {err && <ErrorBox msg={err} />}

          {/* STEP 1 — Mobile */}
          {step === 1 && (
            <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", marginBottom: "6px" }}>Enter Mobile Number</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: "1.6" }}>
                Enter the 10-digit mobile number linked with the ABHA profile you want to switch to.
              </p>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-main)", marginBottom: "8px" }}>Mobile Number</label>
              <div style={{ display: "flex", alignItems: "center", position: "relative", marginBottom: "24px" }}>
                <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", display: "flex", alignItems: "center", padding: "0 14px", borderRight: "1.5px solid var(--border)", color: "var(--text-main)", fontWeight: "700", fontSize: "15px", gap: "4px" }}>
                  🇮🇳 <span>+91</span>
                </div>
                <input
                  autoFocus className="input-field" type="tel"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                  style={{ paddingLeft: "96px", padding: "15px 16px 15px 96px", fontSize: "16px", borderRadius: "12px", background: "var(--bg-app)", letterSpacing: mobile ? "0.06em" : "0", width: "100%" }}
                />
              </div>
              <button disabled={busy || mobile.length < 10} onClick={handleSendOtp} style={{
                width: "100%", padding: "15px", background: busy || mobile.length < 10 ? "var(--border)" : "var(--accent)",
                color: busy || mobile.length < 10 ? "var(--text-muted)" : "#fff",
                border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700",
                cursor: busy || mobile.length < 10 ? "default" : "pointer", transition: "all 0.2s",
                boxShadow: busy || mobile.length < 10 ? "none" : "0 4px 14px rgba(251,145,63,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> Sending OTP...</> : <><Phone size={16} /> Send OTP</>}
              </button>
            </div>
          )}

          {/* STEP 2 — OTP */}
          {step === 2 && (
            <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <button onClick={() => { setStep(1); setErr(""); }} disabled={busy} style={{ background: "var(--bg-app)", border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowLeft size={16} color="var(--text-main)" />
                </button>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", margin: 0 }}>Verify OTP</h3>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", paddingLeft: "40px", lineHeight: "1.6" }}>
                Enter the 6-digit OTP sent to <strong style={{ color: "var(--text-main)" }}>+91 {mobile}</strong>
              </p>

              {/* OTP boxes */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-start", marginBottom: "20px" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <input key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={otp[i] || ""}
                    onChange={e => handleOtpChange(e, i)}
                    onKeyDown={e => handleOtpKey(e, i)}
                    onPaste={handleOtpPaste}
                    autoFocus={i === 0}
                    onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 4px rgba(46,102,110,0.14)"; e.target.style.background = "#fff"; }}
                    onBlur={e => { e.target.style.borderColor = otp[i] ? "var(--primary-soft)" : "var(--border)"; e.target.style.boxShadow = "none"; e.target.style.background = "var(--bg-app)"; }}
                    style={{
                      width: "48px", height: "56px",
                      border: otp[i] ? "2px solid var(--primary-soft)" : "1.5px solid var(--border)",
                      borderRadius: "12px", textAlign: "center", fontSize: "22px", fontWeight: "700",
                      color: "var(--text-main)", outline: "none",
                      background: otp[i] ? "var(--primary-light)" : "var(--bg-app)",
                      transition: "all 0.2s", cursor: "text",
                    }}
                  />
                ))}
              </div>

              {/* Countdown / Resend */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  {canResend ? "Didn't receive the code?" : `Resend in ${fmt(countdown)}`}
                </span>
                {canResend && (
                  <button disabled={busy} onClick={() => { if (requestLockRef.current) return; setOtp(""); setCountdown(600); setCanResend(false); handleSendOtp(); }}
                    style={{ color: "var(--primary)", fontWeight: "700", fontSize: "13px", background: "none", border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                    Resend OTP
                  </button>
                )}
              </div>

              <button disabled={busy || otp.length < 6} onClick={handleVerifyOtp} style={{
                width: "100%", padding: "15px",
                background: busy || otp.length < 6 ? "var(--border)" : "var(--primary)",
                color: busy || otp.length < 6 ? "var(--text-muted)" : "#fff",
                border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700",
                cursor: busy || otp.length < 6 ? "default" : "pointer", transition: "all 0.2s",
                boxShadow: busy || otp.length < 6 ? "none" : "0 4px 14px rgba(46,102,110,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : "Verify OTP"}
              </button>
            </div>
          )}

          {/* STEP 3 — Select Address */}
          {step === 3 && (
            <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <button onClick={() => { setStep(2); setErr(""); }} disabled={busy} style={{ background: "var(--bg-app)", border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowLeft size={16} color="var(--text-main)" />
                </button>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", margin: 0 }}>Select ABHA Address</h3>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", paddingLeft: "40px" }}>
                Choose the ABHA profile you want to switch to:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px", maxHeight: "240px", overflowY: "auto" }}>
                {addresses.map((addr, i) => {
                  const val = addr.address || addr.id || addr;
                  const isSel = selected === val;
                  return (
                    <button key={i} onClick={() => setSelected(val)} disabled={busy} style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px",
                      borderRadius: "12px", border: isSel ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                      background: isSel ? "var(--primary-light)" : "var(--bg-app)",
                      cursor: busy ? "default" : "pointer", textAlign: "left", transition: "all 0.2s", width: "100%",
                      opacity: busy && !isSel ? 0.6 : 1,
                    }}>
                      <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: isSel ? "5px solid var(--primary)" : "2px solid var(--border)", transition: "all 0.2s", background: "white", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--primary-dark)", fontFamily: "monospace" }}>{val}</div>
                        {addr.isPrimary && <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>● Primary</span>}
                      </div>
                      {isSel && <CheckCircle2 size={18} color="var(--primary)" />}
                    </button>
                  );
                })}
              </div>

              <button disabled={busy || !selected} onClick={handleConfirm} style={{
                width: "100%", padding: "15px",
                background: busy || !selected ? "var(--border)" : "var(--accent)",
                color: busy || !selected ? "var(--text-muted)" : "#fff",
                border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700",
                cursor: busy || !selected ? "default" : "pointer", transition: "all 0.2s",
                boxShadow: busy || !selected ? "none" : "0 4px 14px rgba(251,145,63,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {busy ? <><Loader2 size={17} className="animate-spin" /> Switching...</> : <><Users size={17} /> Switch to This Profile</>}
              </button>
            </div>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div style={{ animation: "fadeIn 0.3s ease-in-out", textAlign: "center", padding: "12px 0 8px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle2 size={36} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px" }}>Profile Switched!</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: "1.6" }}>
                You are now using the ABHA profile linked to <strong style={{ color: "var(--text-main)" }}>+91 {mobile}</strong>
              </p>
              {switchedProfile && (
                <div style={{ background: "var(--primary-light)", border: "1.5px solid var(--primary-soft)", borderRadius: "12px", padding: "14px 18px", fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: "var(--primary)", marginBottom: "24px" }}>
                  {switchedProfile}
                </div>
              )}
              <button onClick={onClose} style={{
                width: "100%", padding: "15px", background: "var(--primary)", color: "#fff",
                border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700",
                cursor: "pointer", boxShadow: "0 4px 14px rgba(46,102,110,0.28)",
              }}>
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </Overlay>
  );
}
