import React, { useState, useEffect, useRef } from "react";
import { QrCode, CreditCard, User, Users, Plus, LogOut, Download, CheckCircle2, Copy, MapPin, Calendar, ShieldCheck, UserCircle, RefreshCcw, ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";
import { fetchImageBlob } from "../../../services/uploadService";

export function AbhaTab({ abhaData, onShowQr, onLogout, onSwitch, onCreate }) {
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [phrBlobUrl, setPhrBlobUrl] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loggingOut, setLoggingOut] = useState(false);
  // Synchronous lock so a fast double-click can't fire logout twice
  const logoutLockRef = useRef(false);

  useEffect(() => {
    const rawUrl = abhaData?.phrCardUrl;
    if (rawUrl) {
      setCardLoading(true);
      setPhrBlobUrl(null);
      fetchImageBlob(rawUrl, "abhaCard")
        .then((blobUrl) => {
          if (blobUrl) setPhrBlobUrl(blobUrl);
        })
        .finally(() => {
          setCardLoading(false);
        });
    }
  }, [abhaData?.phrCardUrl]);

  const cardDisplayUrl = phrBlobUrl;

  const copyAbhaNumber = () => {
    if (abhaData.abhaNumber) {
      navigator.clipboard.writeText(abhaData.abhaNumber).then(() => {
        setCopiedNumber(true);
        setTimeout(() => setCopiedNumber(false), 2000);
      });
    }
  };

  const copyAbhaAddress = () => {
    if (abhaData.abhaAddress) {
      navigator.clipboard.writeText(abhaData.abhaAddress).then(() => {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      });
    }
  };

  const handleDownloadCard = () => {
    if (cardDisplayUrl) {
      const a = document.createElement("a");
      a.href = cardDisplayUrl;
      a.download = `ABHA_Card_${(abhaData?.name || 'Card').replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleLogoutClick = async () => {
    if (logoutLockRef.current) return;
    logoutLockRef.current = true;
    setLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      logoutLockRef.current = false;
      setLoggingOut(false);
    }
  };

  const handleZoomIn = (e) => {
    if (e) e.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.3, 2.5));
  };

  const handleZoomOut = (e) => {
    if (e) e.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.3, 1));
  };

  const handleResetZoom = (e) => {
    if (e) e.stopPropagation();
    setZoomLevel(1);
  };

  const handleToggleZoom = () => {
    setZoomLevel(prev => (prev === 1 ? 1.5 : 1));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* ── Top Grid: ABHA Card & Details ── */}
      <div style={{ display: "grid", gridTemplateColumns: "500px 1fr", gap: "24px", alignItems: "stretch" }}>
        
        {/* Left Col: ABHA Card Panel */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={18} color="#6b7280" /> Digital Health Card
            </h2>
            <div style={{ background: "#dcfce7", color: "#166534", fontSize: "12px", fontWeight: "600", padding: "2px 8px", borderRadius: "99px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }} /> Active
            </div>
          </div>
          
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
            {cardLoading ? (
              /* ── Shimmer Skeleton Loader ── */
              <div style={{ marginBottom: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    position: "relative",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    background: "linear-gradient(110deg, #f0f4f8 8%, #e2e8f0 18%, #f0f4f8 33%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s linear infinite",
                    minHeight: "440px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  <Loader2
                    size={28}
                    color="#94a3b8"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
                    Loading Digital Health Card…
                  </span>
                </div>
                <style>{`
                  @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : cardDisplayUrl ? (
              <div style={{ marginBottom: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    position: "relative",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    background: "#f8fafc",
                    minHeight: "440px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: zoomLevel > 1 ? "zoom-out" : "zoom-in",
                    userSelect: "none"
                  }}
                  onClick={handleToggleZoom}
                >
                  {/* Floating Zoom Control Toolbar */}
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      background: "rgba(15, 23, 42, 0.8)",
                      backdropFilter: "blur(6px)",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={handleZoomIn}
                      title="Zoom In"
                      style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: "4px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      title="Zoom Out"
                      style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: "4px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <ZoomOut size={15} />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      title="Reset Zoom"
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.9)", cursor: "pointer", padding: "3px 6px", fontSize: "11px", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <RotateCcw size={12} /> {Math.round(zoomLevel * 100)}%
                    </button>
                  </div>

                  <div style={{ width: "100%", height: "100%", overflow: zoomLevel > 1 ? "auto" : "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}>
                    <img
                      src={cardDisplayUrl}
                      alt="Digital Health Card"
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "center center",
                        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#1f2937", borderRadius: "12px", padding: "24px", color: "#fff", position: "relative", overflow: "hidden", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", position: "relative", zIndex: 2 }}>
                  <img src="/abha.svg" alt="ABHA" style={{ height: "24px", filter: "brightness(0) invert(1)" }} onError={e => e.currentTarget.style.display="none"} />
                  <QrCode size={24} color="#9ca3af" style={{ cursor: "pointer" }} onClick={onShowQr} />
                </div>
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Account Holder</div>
                  <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>{abhaData.name}</div>
                  
                  <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>ABHA Number</div>
                  <div style={{ fontSize: "18px", fontWeight: "500", fontFamily: "monospace", letterSpacing: "0.05em" }}>{abhaData.abhaNumber}</div>
                </div>
                {/* Subtle background decoration */}
                <div style={{ position: "absolute", right: "-30px", bottom: "-30px", width: "120px", height: "120px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.05)" }} />
                <div style={{ position: "absolute", right: "20px", bottom: "-50px", width: "120px", height: "120px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.05)" }} />
              </div>
            )}

            {cardDisplayUrl && (
              <button
                onClick={handleDownloadCard}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(46,102,110,0.25)",
                  transition: "all 0.2s ease",
                  marginTop: "auto"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
              >
                <Download size={16} /> Download ABHA Card
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Details Panel */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
              <UserCircle size={18} color="#6b7280" /> Profile Verification Details
            </h2>
          </div>
          
          <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", background: "#eff6ff", color: "#1d4ed8", padding: "12px 16px", borderRadius: "6px", border: "1px solid #bfdbfe", fontSize: "13px" }}>
              <ShieldCheck size={18} /> KYC verified via Aadhaar. Data is protected by NHA encryption.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}><User size={14}/> Full Name</div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>{abhaData.name}</div>
              </div>
              
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}><Users size={14}/> Gender</div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>{abhaData.gender}</div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14}/> Date of Birth</div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>{abhaData.dateOfBirth || `${abhaData.dob.day} / ${abhaData.dob.month} / ${abhaData.dob.year}`}</div>
              </div>

              {/* ABHA Number & ABHA Address in ONE Row */}
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CreditCard size={14}/> ABHA Number
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", fontFamily: "monospace" }}>{abhaData.abhaNumber}</span>
                  <button
                    onClick={copyAbhaNumber}
                    title="Copy ABHA Number"
                    style={{ background: "none", border: "none", cursor: "pointer", color: copiedNumber ? "#16a34a" : "#6b7280", display: "flex", alignItems: "center", gap: "4px", padding: "4px", borderRadius: "4px", transition: "all 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    {copiedNumber ? <CheckCircle2 size={16} color="#16a34a" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <UserCircle size={14}/> ABHA Address
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{abhaData.abhaAddress}</span>
                  <button
                    onClick={copyAbhaAddress}
                    title="Copy ABHA Address"
                    style={{ background: "none", border: "none", cursor: "pointer", color: copiedAddress ? "#16a34a" : "#6b7280", display: "flex", alignItems: "center", gap: "4px", padding: "4px", borderRadius: "4px", transition: "all 0.15s", flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    {copiedAddress ? <CheckCircle2 size={16} color="#16a34a" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Registered Address */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}><MapPin size={14}/> Registered Address</div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: "#374151", lineHeight: "1.6", background: "#f9fafb", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  {abhaData.address}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Action Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
        
        <button onClick={onSwitch} disabled={loggingOut} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: loggingOut ? "default" : "pointer", opacity: loggingOut ? 0.6 : 1, transition: "border-color 0.15s, box-shadow 0.15s", textAlign: "left" }} onMouseEnter={e => { if (loggingOut) return; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}><RefreshCcw size={18} /></div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Switch Profile</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Login with another ABHA</div>
          </div>
        </button>

        <button onClick={onCreate} disabled={loggingOut} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: loggingOut ? "default" : "pointer", opacity: loggingOut ? 0.6 : 1, transition: "border-color 0.15s, box-shadow 0.15s", textAlign: "left" }} onMouseEnter={e => { if (loggingOut) return; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}><Plus size={18} /></div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Create Address</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Register a new ABHA</div>
          </div>
        </button>

        <button onClick={handleLogoutClick} disabled={loggingOut} aria-busy={loggingOut} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#fff", border: "1px solid #fecaca", borderRadius: "8px", cursor: loggingOut ? "default" : "pointer", opacity: loggingOut ? 0.6 : 1, transition: "border-color 0.15s, box-shadow 0.15s", textAlign: "left" }} onMouseEnter={e => { if (loggingOut) return; e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(239,68,68,0.1)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.boxShadow = "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>{loggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#991b1b" }}>{loggingOut ? "Logging out..." : "Logout Profile"}</div>
            <div style={{ fontSize: "12px", color: "#ef4444" }}>Unlink current session</div>
          </div>
        </button>
      </div>
    </div>
  );
}
