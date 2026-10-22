import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X, MapPin, Phone, User, AlertTriangle, ArrowRight, CheckCircle2, Ambulance, Shield, Loader2, ChevronDown, Navigation, HeartPulse, Car, Wind, Baby, Flame, Brain, HelpCircle, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBooking } from "../../context/BookingContext";
import { useNavigate } from "react-router-dom";
import { EMERGENCY_TYPES, requestAmbulance, reverseGeocode, GOOGLE_MAPS_API_KEY } from "../../services/ambulanceService";
import useGoogleMapsScript from "./useGoogleMapsScript";
import useScrollLock from "../../hooks/useScrollLock";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

/* ── Google Maps pickup picker: click the map or drag the pin to set location ── */

function GoogleLocationPicker({ position, onPick }) {
  const { loaded, error } = useGoogleMapsScript(GOOGLE_MAPS_API_KEY);
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const onPickRef = React.useRef(onPick);
  onPickRef.current = onPick;

  // Create the map once the script is ready
  useEffect(() => {
    if (!loaded || !containerRef.current || mapRef.current) return;
    const gm = window.google.maps;
    const map = new gm.Map(containerRef.current, {
      center: position || DEFAULT_CENTER,
      zoom: position ? 15 : 4,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
    });
    mapRef.current = map;

    map.addListener("click", (e) => {
      onPickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Keep the marker and viewport in sync with the selected position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    const gm = window.google.maps;

    if (!markerRef.current) {
      markerRef.current = new gm.Marker({ position, map, draggable: true, title: "Pickup Location" });
      markerRef.current.addListener("dragend", (e) => {
        onPickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    } else {
      markerRef.current.setPosition(position);
    }

    map.panTo(position);
    if (map.getZoom() < 15) map.setZoom(15);
  }, [loaded, position?.lat, position?.lng]);

  // Cleanup listeners on unmount
  useEffect(() => () => {
    if (markerRef.current) { window.google?.maps?.event.clearInstanceListeners(markerRef.current); markerRef.current.setMap(null); }
    if (mapRef.current) window.google?.maps?.event.clearInstanceListeners(mapRef.current);
  }, []);

  if (error) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", background: "var(--bg-app)" }}>
        <MapPin size={16} /> Map unavailable — please enter your address below.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {!loaded && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", background: "var(--bg-app)" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading map…
        </div>
      )}
    </div>
  );
}

/* ── Emergency type dropdown (custom, since native <select> popups can't be styled) ── */

const EMERGENCY_META = {
  cardiac:   { icon: HeartPulse, color: "#dc2626", bg: "#fef2f2" },
  accident:  { icon: Car,        color: "#ea580c", bg: "#fff7ed" },
  breathing: { icon: Wind,       color: "#0284c7", bg: "#f0f9ff" },
  pregnancy: { icon: Baby,       color: "#db2777", bg: "#fdf2f8" },
  burns:     { icon: Flame,      color: "#d97706", bg: "#fffbeb" },
  stroke:    { icon: Brain,      color: "#7c3aed", bg: "#f5f3ff" },
  other:     { icon: HelpCircle, color: "#475569", bg: "#f1f5f9" },
};
const MENU_MAX_HEIGHT = 300;

function EmergencyTypeSelect({ value, onChange, hasError }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = React.useRef(null);
  const triggerRef = React.useRef(null);

  const selected = EMERGENCY_TYPES.find(t => t.value === value);
  const selectedMeta = selected && (EMERGENCY_META[selected.value] || EMERGENCY_META.other);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      // Flip upward when the scroll area doesn't have room below the trigger
      const rect = triggerRef.current.getBoundingClientRect();
      const bounds = triggerRef.current.closest(".ambulance-modal-scroll")?.getBoundingClientRect() || { top: 0, bottom: window.innerHeight };
      const below = bounds.bottom - rect.bottom;
      const above = rect.top - bounds.top;
      setOpenUp(below < MENU_MAX_HEIGHT && above > below);
      setActive(Math.max(0, EMERGENCY_TYPES.findIndex(t => t.value === value)));
    }
    setOpen(o => !o);
  };

  const pick = (v) => { onChange(v); setOpen(false); triggerRef.current?.focus(); };

  const onKeyDown = (e) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); toggle(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % EMERGENCY_TYPES.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i - 1 + EMERGENCY_TYPES.length) % EMERGENCY_TYPES.length); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (active >= 0) pick(EMERGENCY_TYPES[active].value); }
    else if (e.key === "Tab") setOpen(false);
  };

  const borderColor = hasError ? "var(--danger)" : open ? "var(--primary)" : "var(--border)";
  const SelectedIcon = selectedMeta?.icon;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button ref={triggerRef} type="button" onClick={toggle} onKeyDown={onKeyDown}
        aria-haspopup="listbox" aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px 8px 8px", minHeight: "50px", border: `1.5px solid ${borderColor}`, borderRadius: "10px", background: "#fff", cursor: "pointer", outline: "none", textAlign: "left", fontFamily: "var(--font-sans)", transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: open ? "0 0 0 4px rgba(46,102,110,0.10)" : "none" }}>
        <span style={{ width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: selectedMeta ? selectedMeta.bg : "var(--bg-app)", color: selectedMeta ? selectedMeta.color : "var(--text-muted)", transition: "all 0.2s" }}>
          {SelectedIcon ? <SelectedIcon size={17} /> : <AlertTriangle size={16} />}
        </span>
        <span style={{ flex: 1, fontSize: "15px", fontWeight: selected ? "600" : "500", color: selected ? "var(--text-main)" : "var(--text-muted)" }}>
          {selected ? selected.label : "Select emergency type"}
        </span>
        <ChevronDown size={18} color="var(--text-muted)" style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <ul role="listbox" style={{ position: "absolute", left: 0, right: 0, [openUp ? "bottom" : "top"]: "calc(100% + 6px)", margin: 0, padding: "6px", listStyle: "none", background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,0.16), 0 2px 6px rgba(15,23,42,0.06)", maxHeight: `${MENU_MAX_HEIGHT}px`, overflowY: "auto", zIndex: 50, animation: "emgMenuIn 0.15s ease-out", transformOrigin: openUp ? "bottom" : "top" }}>
          {EMERGENCY_TYPES.map((t, i) => {
            const meta = EMERGENCY_META[t.value] || EMERGENCY_META.other;
            const Icon = meta.icon;
            const isSel = t.value === value;
            const isActive = i === active;
            return (
              <li key={t.value} role="option" aria-selected={isSel}
                onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(t.value)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", background: isSel ? meta.bg : isActive ? "var(--bg-app)" : "transparent", transition: "background 0.12s" }}>
                <span style={{ width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: meta.bg, color: meta.color }}>
                  <Icon size={16} />
                </span>
                <span style={{ flex: 1, fontSize: "14.5px", fontWeight: isSel ? "700" : "500", color: isSel ? meta.color : "var(--text-main)" }}>{t.label}</span>
                {isSel && <Check size={16} color={meta.color} strokeWidth={2.5} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── Small shared atoms ──────────────────────────────────────────────────── */

function Overlay({ children }) {
  const content = (
    <div className="ambulance-modal-overlay">
      <div style={{ width: "100%", maxWidth: "860px", margin: "auto", position: "relative" }}>{children}</div>
    </div>
  );
  if (typeof window === "undefined") return content;
  return ReactDOM.createPortal(content, document.body);
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />{msg}
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div data-field-error style={{ marginTop: "6px", color: "var(--danger)", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
      <AlertTriangle size={12} style={{ flexShrink: 0 }} />{msg}
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "accent", fullWidth = true, type = "button" }) {
  const base = { width: fullWidth ? "100%" : "auto", padding: "14px 24px", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s", border: "none", fontFamily: "var(--font-sans)" };
  const styles = {
    accent: { background: disabled ? "var(--border)" : "var(--accent)", color: disabled ? "var(--text-muted)" : "#fff", boxShadow: disabled ? "none" : "0 2px 12px rgba(251,145,63,0.25)" },
    primary: { background: disabled ? "var(--border)" : "var(--primary)", color: disabled ? "var(--text-muted)" : "#fff", boxShadow: disabled ? "none" : "0 2px 12px rgba(46,102,110,0.25)" },
    danger: { background: disabled ? "var(--border)" : "#dc2626", color: disabled ? "var(--text-muted)" : "#fff", boxShadow: disabled ? "none" : "0 2px 12px rgba(220,38,38,0.25)" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...styles[variant] }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}>
      {children}
    </button>
  );
}

/* ── Main Modal ──────────────────────────────────────────────────────────── */

export default function AmbulanceRequestModal({ onClose, onSuccess }) {
  const { user, showToast } = useAuth();
  const { globalLocation } = useBooking();
  const go = useNavigate();

  const [step, setStep]               = useState(1); // 1 = form, 2 = success
  const [patientName, setPatientName] = useState((user?.name || "").replace(/[^a-zA-Z\s]/g, ""));
  const [contactNumber, setContact]   = useState(user?.phone || user?.mobile || "");
  const [pickupAddress, setPickup]    = useState("");
  const [pickupLat, setPickupLat]     = useState(null);
  const [pickupLng, setPickupLng]     = useState(null);
  const [emergencyType, setEmergency] = useState("");
  const [busy, setBusy]               = useState(false);
  const [locating, setLocating]       = useState(false);
  const [err, setErr]                 = useState("");
  const [result, setResult]           = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  // Synchronous locks so a fast double-click can't fire duplicate requests
  const submitLockRef = useRef(false);
  const locateLockRef = useRef(false);

  const clearFieldError = (field) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleMapClick = async (latlng) => {
    setPickupLat(latlng.lat);
    setPickupLng(latlng.lng);
    try {
      setLocating(true);
      const addr = await reverseGeocode(latlng.lat, latlng.lng);
      setPickup(addr);
    } catch(e) {
      // ignore
    } finally {
      setLocating(false);
    }
  };

  const handleLocate = () => {
    if (locateLockRef.current) return;
    if (!navigator.geolocation) { setErr("Geolocation is not supported by your browser."); return; }
    locateLockRef.current = true;
    setLocating(true); setErr("");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickupLat(lat);
          setPickupLng(lng);
          const addr = await reverseGeocode(lat, lng);
          setPickup(addr);
        } finally {
          locateLockRef.current = false;
          setLocating(false);
        }
      },
      () => { setErr("Unable to fetch location. Please enter manually."); locateLockRef.current = false; setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useScrollLock();

  useEffect(() => {
    handleLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    if (!patientName.trim()) { setErr("Patient name is required."); return; }
    if (!contactNumber.trim() || contactNumber.length < 10) {
      const msg = "Please enter a valid 10-digit contact number.";
      if (showToast) showToast(msg, "error");
      setErr(msg);
      return;
    }
    if (!/^[6-9]/.test(contactNumber.trim())) {
      const msg = "Please enter a valid mobile number starting with 6, 7, 8, or 9.";
      if (showToast) showToast(msg, "error");
      setErr(msg);
      return;
    }
    if (!pickupAddress.trim()) { setErr("Pickup address is required."); return; }
    if (!emergencyType) {
      const msg = "Please select an emergency type.";
      if (showToast) showToast(msg, "error");
      setErr(msg);
      return;
    }
    submitLockRef.current = true;
    setErr(""); setBusy(true);

    let locationKey = globalLocation?.entitylocation || globalLocation?.location_key || "";
    if (!locationKey) {
      try {
        const savedLoc = localStorage.getItem("arvaya_location");
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          locationKey = parsed?.entitylocation || parsed?.location_key || "";
        }
      } catch (e) {}
    }

    let patientId = user?.id || user?.user_id || user?.patient_id || user?.app_user_id || "";
    if (!patientId) {
      try {
        const savedUser = localStorage.getItem("arvaya_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          patientId = parsed?.id || parsed?.user_id || parsed?.patient_id || parsed?.app_user_id || "";
        }
      } catch (e) {}
    }

    try {
      const submitted = {
        patient_id: patientId,
        patient_name: patientName.trim(),
        requester_phone: contactNumber.trim(),
        emergency_type: emergencyType,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_address: pickupAddress.trim(),
        location_key: locationKey
      };
      const res = await requestAmbulance(submitted);

      if (onSuccess) onSuccess(res, submitted);
      onClose();
      // The modal is opened from Header/Home/Ambulance; hand the booking to the
      // Ambulance page via route state so it can show it immediately
      go("/ambulance", { state: { bookedRequest: { res, submitted, at: Date.now() } } });
    } catch (e) { setErr(e.message || "Failed to submit request. Please try again."); }
    finally { submitLockRef.current = false; setBusy(false); }
  };

  // Don't let the modal be dismissed mid-request
  const handleClose = () => { if (!busy) onClose(); };

  /* ── Left Panel ──────────────────────────────────────────────────────── */
  const leftPanel = (
    <div className="ambulance-modal-left-content" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
      {/* Icon */}
      <div className="ambulance-modal-left-icon" style={{ width: "60px", height: "60px", borderRadius: "18px", background: "rgba(220,38,38,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px", border: "1px solid rgba(220,38,38,0.3)" }}>
        <Ambulance size={28} color="#ef4444" />
      </div>
      <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#fff", lineHeight: 1.15, margin: "0 0 14px", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
        Emergency<br/>Ambulance
      </h2>
      <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 32px" }}>
        Help is just a click away. Fill in the details and we'll dispatch the nearest ambulance to your location.
      </p>

      {/* Info box */}
      <div className="ambulance-modal-left-info" style={{ background: "rgba(0,0,0,0.15)", padding: "20px", borderRadius: "14px", marginTop: "auto" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <Shield size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "#fff", display: "block", marginBottom: "4px", fontSize: "13px" }}>Arvaya Promise</strong>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>Average response time under 10 minutes. NABH-certified ambulances with trained paramedics.</span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Right Panel — Form ──────────────────────────────────────────────── */
  const formPanel = (
    <div style={{ animation: "fadeIn 0.25s ease" }}>
      <ErrorBanner msg={err} />

      <div className="ambulance-form-row">
      {/* Patient Name */}
      <div>
        <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Patient Name <span className="required-star">*</span></label>
        <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${fieldErrors.patientName ? "var(--danger)" : "var(--border)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.2s" }}
          onFocusCapture={e => { if (!fieldErrors.patientName) e.currentTarget.style.borderColor = "var(--primary)"; }}
          onBlurCapture={e => { if (!fieldErrors.patientName) e.currentTarget.style.borderColor = "var(--border)"; }}>
          <div style={{ padding: "0 10px 0 12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}><User size={18} /></div>
          <input value={patientName} onChange={e => setPatientName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))} placeholder="Full name of patient"
            style={{ flex: 1, padding: "12px 12px 12px 0", border: "none", outline: "none", fontSize: "15px", color: "var(--text-main)", fontWeight: "500" }} />
        </div>
        <FieldError msg={fieldErrors.patientName} />
      </div>

      {/* Contact Number */}
      <div>
        <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Contact Number <span className="required-star">*</span></label>
        <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${fieldErrors.contactNumber ? "var(--danger)" : "var(--border)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.2s" }}
          onFocusCapture={e => { if (!fieldErrors.contactNumber) e.currentTarget.style.borderColor = "var(--primary)"; }}
          onBlurCapture={e => { if (!fieldErrors.contactNumber) e.currentTarget.style.borderColor = "var(--border)"; }}>
          <div style={{ padding: "0 10px 0 12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}><Phone size={18} /></div>
          <input value={contactNumber} onChange={e => { setContact(e.target.value.replace(/\D/g, "").slice(0, 10)); clearFieldError("contactNumber"); }} placeholder="10-digit mobile number" type="tel"
            style={{ flex: 1, padding: "12px 12px 12px 0", border: "none", outline: "none", fontSize: "15px", color: "var(--text-main)", fontWeight: "500", letterSpacing: "0.03em" }} />
        </div>
        <FieldError msg={fieldErrors.contactNumber} />
      </div>
      </div>

      {/* Pickup Address */}
      <div style={{ marginBottom: "18px" }}>
        <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
          <span>Pickup Location <span className="required-star">*</span></span>
          <button type="button" onClick={handleLocate} disabled={locating || busy}
            style={{ background: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--primary-soft)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: "700", cursor: locating || busy ? "default" : "pointer", opacity: locating || busy ? 0.6 : 1, display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s" }}
            onMouseEnter={e => { if (!locating && !busy) e.currentTarget.style.background = "var(--primary-soft)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--primary-light)"; }}>
            {locating ? <><Loader2 size={12} className="animate-spin" /> Locating…</> : <><Navigation size={12} /> Use My Location</>}
          </button>
        </label>

        <div style={{ height: "170px", borderRadius: "10px", overflow: "hidden", marginBottom: "10px", border: "1px solid var(--border)", position: "relative", zIndex: 0, isolation: "isolate" }}>
          <GoogleLocationPicker position={pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null} onPick={handleMapClick} />
        </div>

        <div style={{ border: `1.5px solid ${fieldErrors.pickupAddress ? "var(--danger)" : "var(--border)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.2s" }}
          onFocusCapture={e => { if (!fieldErrors.pickupAddress) e.currentTarget.style.borderColor = "var(--primary)"; }}
          onBlurCapture={e => { if (!fieldErrors.pickupAddress) e.currentTarget.style.borderColor = "var(--border)"; }}>
          <textarea value={pickupAddress} onChange={e => { setPickup(e.target.value); clearFieldError("pickupAddress"); }} placeholder="Enter or select your pickup address on map" rows={2}
            style={{ width: "100%", padding: "12px 14px", border: "none", outline: "none", fontSize: "14px", color: "var(--text-main)", resize: "none", lineHeight: 1.5, fontFamily: "var(--font-sans)" }} />
        </div>
        <FieldError msg={fieldErrors.pickupAddress} />
      </div>

      {/* Emergency Type */}
      <div style={{ marginBottom: "8px", position: "relative", zIndex: 20 }}>
        <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Emergency Type <span className="required-star">*</span></label>
        <div data-field-error>
          <EmergencyTypeSelect value={emergencyType} hasError={!!fieldErrors.emergencyType}
            onChange={v => { setEmergency(v); clearFieldError("emergencyType"); }} />
        </div>
        <FieldError msg={fieldErrors.emergencyType} />
      </div>

    </div>
  );

  /* ── Right Panel — Success ───────────────────────────────────────────── */
  const successPanel = result && (
    <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeIn 0.35s var(--ease-out)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
      <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 0 0 14px rgba(22,163,74,0.06)" }}>
        <CheckCircle2 size={44} color="var(--success)" strokeWidth={2} />
      </div>
      <h3 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-main)", marginBottom: "12px", fontFamily: "var(--font-display)" }}>Ambulance Requested!</h3>
      <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "32px", lineHeight: 1.6, maxWidth: "320px" }}>
        Your request has been submitted. An ambulance is being dispatched to your location.
      </p>

      {/* Details card */}
      <div style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", width: "100%", textAlign: "left", marginBottom: "32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Request ID</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", fontFamily: "monospace" }}>{result.id}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Estimated Time</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--accent)" }}>{result.eta} minutes</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Ambulance</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-main)" }}>{result.ambulanceId}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Driver</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-main)" }}>{result.driverName}</div>
          </div>
        </div>
      </div>

      <Btn variant="primary" onClick={onClose}>Back to Dashboard</Btn>
    </div>
  );

  return (
    <Overlay>
      <div className="ambulance-modal-card">

        {/* Left Panel */}
        <div className="ambulance-modal-left">
          <div style={{ position: "absolute", top: "-80px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "#dc2626", opacity: 0.15 }} />
          <div style={{ position: "absolute", bottom: "-100px", left: "-40px", width: "260px", height: "260px", borderRadius: "50%", background: "var(--accent)", opacity: 0.08 }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
            {leftPanel}
          </div>
        </div>

        {/* Right Panel */}
        <div className="ambulance-modal-right">
          {/* Header strip stays fixed above the scrolling form */}
          <div className="ambulance-modal-header">
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-main)", margin: "0 0 4px", fontFamily: "var(--font-display)" }}>{step === 1 && "Request Details"}</h3>
              {step === 1 && <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: 0 }}>All fields marked with * are required</p>}
            </div>
            <button className="ambulance-modal-close" onClick={handleClose} disabled={busy} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="ambulance-modal-scroll" style={{ justifyContent: step === 2 ? "center" : "flex-start" }}>
            {step === 1 ? formPanel : successPanel}
          </div>
          {/* Submit stays pinned below the scroll area so it's always reachable */}
          {step === 1 && (
            <div className="ambulance-modal-footer">
              <Btn variant="danger" disabled={busy} onClick={handleSubmit}>
                {busy ? <><Loader2 size={18} className="animate-spin" /> Requesting…</> : <><Ambulance size={18} /> Call Ambulance</>}
              </Btn>
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframes for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes emgMenuIn { from { opacity: 0; transform: scaleY(0.96); } to { opacity: 1; transform: scaleY(1); } }`}</style>
    </Overlay>
  );
}
