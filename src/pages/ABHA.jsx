import { useState, useEffect, useRef } from "react";
import {
  ChevronRight, QrCode, CreditCard, User, Users, Plus, LogOut,
  Download, X, Shield, Clock, CheckCircle2, XCircle, AlertCircle,
  Info, ArrowLeft, MapPin, ShieldCheck, Copy, FileText, Building2, Phone, Calendar, UserCircle, Loader2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { abhaSendOtp, abhaVerifyOtp, abhaConfirmAddress, abhaGetSuggestions } from "../services/abhaService";

/* ─── Mock ABHA Data ─────────────────────────────── */
const MOCK_ABHA = {
  name: "Shubham Shrikant Harpanhalli",
  abhaAddress: "91678056082723@sbx",
  abhaNumber: "91-6780-5608-2723",
  gender: "Male",
  dob: { day: "10", month: "4", year: "2000" },
  address: "Behind 41/Manik Nagar, Samta Nagar, Miraj, Miraj, Sangli, Maharashtra, SANGLI, MAHARASHTRA",
  photoInitials: "SSH",
  photoColor: "#1F4F57",
};

const MOCK_CONSENTS = {
  Pending: [],
  Granted: [
    { id: 1, requester: "Apollo Hospitals",  purpose: "Care Management",   period: "Jan 2025 – Jan 2026", granted: "15 Jan 2025", records: "Lab Results, Prescriptions", icon: Building2 },
  ],
  Denied: [],
  Expired: [
    { id: 2, requester: "Manipal Health",    purpose: "Diagnosis Support", period: "Jan 2024 – Jan 2025", granted: "10 Jan 2024", records: "Discharge Summary",          icon: FileText  },
  ],
};

/* ═══════════════════════════════════════════════════
   MAIN PAGE — Sidebar Layout
   ═══════════════════════════════════════════════════ */
export default function ABHA() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab]           = useState("abha");
  const [showQrModal, setShowQrModal]       = useState(false);
  const [showSwitch, setShowSwitch]         = useState(false);
  const [showCreate, setShowCreate]         = useState(false);

  const abhaData = { ...MOCK_ABHA, name: user?.name || MOCK_ABHA.name };

  const tabs = [
    { id: "abha",     label: "ABHA Hub", icon: CreditCard },
    { id: "consent",  label: "Consents", icon: Shield     },
    { id: "provider", label: "Providers",icon: Building2  },
  ];

  return (
    <main style={{ background: "radial-gradient(circle at 15% 10%, rgba(46,102,110,0.06) 0%, transparent 25%), radial-gradient(circle at 85% 85%, rgba(251,145,63,0.06) 0%, transparent 25%), var(--bg-app)", minHeight: "100vh", padding: "40px 24px" }}>
      <div className="container" style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "260px 1fr", gap: "36px", alignItems: "start" }}>
        
        {/* ── Sidebar Navigation ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "14px", fontWeight: "600", textDecoration: "none", width: "fit-content", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color="var(--primary)"} onMouseLeave={e => e.currentTarget.style.color="var(--text-muted)"}>
            <ArrowLeft size={16} /> Back to Home
          </Link>

          {/* User Summary Card */}
          <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)", backdropFilter: "blur(20px)" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: abhaData.photoColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "18px", marginBottom: "12px", border: "3px solid var(--primary-light)" }}>
              {abhaData.photoInitials}
            </div>
            <div style={{ fontWeight: "800", color: "var(--text-main)", fontSize: "16px", marginBottom: "4px" }}>{abhaData.name}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace", background: "var(--bg-app)", padding: "4px 8px", borderRadius: "6px" }}>{abhaData.abhaAddress}</div>
          </div>

          {/* Nav Menu */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px",
                  borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600",
                  background: isActive ? "linear-gradient(90deg, var(--primary-light) 0%, rgba(255,255,255,0) 100%)" : "transparent",
                  color: isActive ? "var(--primary-dark)" : "var(--text-muted)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", textAlign: "left",
                  transform: "translateY(0)"
                }}
                onMouseEnter={e => {
                  if(!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.6)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }
                }}
                onMouseLeave={e => {
                  if(!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
                >
                  <Icon size={18} color={isActive ? "var(--primary)" : "var(--text-muted)"} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Main Content Area ── */}
        <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "24px", padding: "40px", minHeight: "600px", boxShadow: "0 24px 48px -12px rgba(0,0,0,0.06)", backdropFilter: "blur(20px)" }}>
          <div id="static-abha-tab-hub" style={{ display: activeTab === "abha" ? "block" : "none" }}>
            <AbhaTab abhaData={abhaData} onShowQr={() => setShowQrModal(true)} onLogout={logout} onSwitch={() => setShowSwitch(true)} onCreate={() => setShowCreate(true)} />
          </div>
          <div id="static-abha-tab-consent" style={{ display: activeTab === "consent" ? "block" : "none" }}>
            <ConsentTab />
          </div>
          <div id="static-abha-tab-provider" style={{ display: activeTab === "provider" ? "block" : "none" }}>
            <ProviderTab />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showQrModal  && <QrModal           abhaData={abhaData}          onClose={() => setShowQrModal(false)} />}
      {showSwitch   && <SwitchProfileModal onClose={() => setShowSwitch(false)} />}
      {showCreate   && <CreateAddressModal abhaData={abhaData}          onClose={() => setShowCreate(false)} />}
    </main>
  );
}

/* ═══════════════════════════════════════════════════
   ABHA TAB
   ═══════════════════════════════════════════════════ */
function AbhaTab({ abhaData, onShowQr, onLogout, onSwitch, onCreate }) {
  const [cardView, setCardView] = useState("card");
  const [copied, setCopied]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Synchronous lock so a fast double-click can't fire logout twice
  const logoutLockRef = useRef(false);

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

  const copyAbhaNumber = () => {
    navigator.clipboard.writeText(abhaData.abhaNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {/* ── Top: Card / QR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "540px", width: "100%", margin: "0 auto" }}>
          
          {/* Segmented Toggle */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "4px", display: "inline-flex", gap: "4px" }}>
            {[{ id: "card", label: "ABHA Card", icon: CreditCard }, { id: "qr", label: "QR Code", icon: QrCode }].map(({ id, label, icon: Icon }) => (
              <button
                key={id} onClick={() => setCardView(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 20px", borderRadius: "9px", border: "none",
                  background: cardView === id ? "var(--primary)" : "transparent",
                  color:      cardView === id ? "#fff"           : "var(--text-muted)",
                  fontWeight: "600", fontSize: "14px", cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: cardView === id ? "0 2px 8px rgba(46,102,110,0.25)" : "none",
                }}
              >
                <Icon size={16} />{label}
              </button>
            ))}
          </div>

          {/* ABHA Card View */}
          <div id="static-abha-card-view" style={{ display: cardView === "card" ? "block" : "none", animation: "fadeInUp 0.35s var(--ease-out) forwards" }}>
            {/* Premium dark ABHA ID Card */}
            <div style={{
              background: "linear-gradient(135deg, var(--primary-dark) 0%, #12333A 50%, #0d2028 100%)",
              borderRadius: "20px", padding: "32px", color: "#fff",
              boxShadow: "0 20px 48px -12px rgba(18,51,58,0.5)",
              position: "relative", overflow: "hidden", marginBottom: "16px",
              height: "260px", display: "flex", flexDirection: "column", justifyContent: "space-between"
            }}>
              <div style={{ position: "absolute", right: "-40px", top: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(251,145,63,0.06)" }} />
              <div style={{ position: "absolute", left: "-30px", bottom: "-50px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(46,102,110,0.15)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <img src="/abha.svg" alt="ABHA" style={{ height: "28px", filter: "brightness(0) invert(1)", opacity: 0.9 }} onError={e => { e.currentTarget.style.display = "none"; }} />
                  <div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ayushman Bharat</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>Digital Mission</div>
                  </div>
                </div>
                <div style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />Active
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Account Holder</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.01em" }}>{abhaData.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>ABHA Address</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent)", fontFamily: "monospace" }}>{abhaData.abhaAddress}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>ABHA Number</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "0.08em", fontFamily: "monospace" }}>{abhaData.abhaNumber}</div>
                  </div>
                </div>
                <div onClick={() => setCardView("qr")} style={{ background: "#fff", padding: "10px", borderRadius: "12px", cursor: "pointer", opacity: 0.9 }} title="View full QR">
                  <QrCode size={60} color="#12333A" />
                </div>
              </div>
            </div>

            <button onClick={copyAbhaNumber} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "12px", background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "12px", fontSize: "14px", fontWeight: "600",
              color: copied ? "var(--success)" : "var(--primary)", cursor: "pointer", transition: "all 0.2s",
            }}>
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? "Copied to clipboard!" : "Copy ABHA Number"}
            </button>
          </div>

          {/* QR Code View */}
          <div id="static-abha-qr-view" style={{ display: cardView === "qr" ? "block" : "none", animation: "fadeInUp 0.35s var(--ease-out) forwards" }}>
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", height: "260px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
              <div style={{ padding: "16px", background: "#fff", borderRadius: "16px", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
                <QrCode size={140} color="#12333A" strokeWidth={1.2} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", marginBottom: "4px" }}>Scan to Share ABHA</div>
              </div>
            </div>
            <button onClick={onShowQr} style={{
              width: "100%", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px",
              background: "var(--accent)", color: "#fff", border: "none", borderRadius: "12px",
              fontSize: "14px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(251,145,63,0.35)", transition: "all 0.2s",
            }}>
              <Download size={18} />Download QR Code
            </button>
          </div>
        </div>

        {/* ── Bottom: Profile Details ── */}
        <div style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: "24px", padding: "32px", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <div style={{ background: "linear-gradient(135deg, var(--primary-light) 0%, rgba(46,102,110,0.05) 100%)", padding: "12px", borderRadius: "14px", border: "1px solid rgba(46,102,110,0.1)" }}>
              <UserCircle size={22} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "var(--text-main)", letterSpacing: "-0.01em" }}>Profile Details</h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Verified via Aadhaar</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", marginBottom: "24px" }}>
            
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
                <User size={18} color="var(--text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px", fontWeight: "600" }}>Name</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)" }}>{abhaData.name}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
                <Users size={18} color="var(--text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px", fontWeight: "600" }}>Gender</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)" }}>{abhaData.gender}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", gridColumn: "span 2" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
                <Calendar size={18} color="var(--text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", fontWeight: "600" }}>Date of Birth</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ background: "#fff", padding: "4px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", border: "1px solid var(--border)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>{abhaData.dob.day}</span>
                  <span style={{ color: "var(--text-muted)", padding: "4px 2px" }}>/</span>
                  <span style={{ background: "#fff", padding: "4px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", border: "1px solid var(--border)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>{abhaData.dob.month}</span>
                  <span style={{ color: "var(--text-muted)", padding: "4px 2px" }}>/</span>
                  <span style={{ background: "#fff", padding: "4px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", border: "1px solid var(--border)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>{abhaData.dob.year}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", gridColumn: "1 / -1" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
                <MapPin size={18} color="var(--text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px", fontWeight: "600" }}>Address</div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-main)", lineHeight: "1.6" }}>{abhaData.address}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: 0 }} />

      {/* ── Bottom: Actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
        
        {/* Quick ABHA Services */}
        <QuickServiceBtn icon={Users} label="Switch Your Profile"          onClick={onSwitch} />
        <QuickServiceBtn icon={Plus}  label="Create Another Address"       onClick={onCreate} />
        
        {/* Logout ABHA Profile */}
        <button onClick={handleLogoutClick} disabled={loggingOut} aria-busy={loggingOut} style={{
          background: "linear-gradient(145deg, rgba(254,226,226,0.7) 0%, rgba(254,226,226,0.2) 100%)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "20px", padding: "16px",
          display: "flex", alignItems: "center", gap: "16px", cursor: loggingOut ? "default" : "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", textAlign: "left", width: "100%",
          opacity: loggingOut ? 0.6 : 1, transform: loggingOut ? "none" : undefined,
        }}
        onMouseEnter={e => {
          if (loggingOut) return;
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 10px 20px -10px rgba(239,68,68,0.3)";
          e.currentTarget.style.background = "linear-gradient(145deg, rgba(254,226,226,0.9) 0%, rgba(254,226,226,0.4) 100%)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.background = "linear-gradient(145deg, rgba(254,226,226,0.7) 0%, rgba(254,226,226,0.2) 100%)";
        }}
        >
          <div style={{ background: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)", color: "#fff", width: "44px", height: "44px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 10px rgba(220,38,38,0.2)" }}>
            {loggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#b91c1c", marginBottom: "4px" }}>{loggingOut ? "Logging out..." : "Logout Profile"}</div>
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "500" }}>Unlink session</div>
          </div>
        </button>

      </div>
      
      {/* NHA note */}
      <div style={{ padding: "14px 16px", background: "var(--primary-light)", border: "1px solid var(--primary-soft)", borderRadius: "12px", display: "flex", gap: "10px", alignItems: "flex-start", width: "fit-content" }}>
        <ShieldCheck size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <p style={{ fontSize: "12px", color: "var(--primary-dark)", lineHeight: "1.6", margin: 0 }}>
          Your ABHA data is protected by <strong>NHA</strong> encryption and processed as per ABDM guidelines.
        </p>
      </div>

    </div>
  );
}

/* ── Shared action row ── */
function ActionRow({ icon: Icon, iconBg, iconColor, title, titleColor, subtitle, onClick }) {
  return (
    <button onClick={onClick} className="hover-glow" style={{
      display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px",
      background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px",
      cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.25s",
    }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>
        <Icon size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: titleColor || "var(--text-main)" }}>{title}</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>{subtitle}</div>
      </div>
      <ChevronRight size={18} color="var(--text-muted)" />
    </button>
  );
}

/* ── Quick Service button ── */
function QuickServiceBtn({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", padding: 0, width: "100%" }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
        padding: "20px 12px", background: "rgba(255,255,255,0.7)", borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        width: "100%", textAlign: "center", boxShadow: "0 4px 12px -4px rgba(0,0,0,0.03)"
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(251,145,63,0.3)";
          e.currentTarget.style.background = "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(251,145,63,0.05) 100%)";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 10px 20px -10px rgba(251,145,63,0.2)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          e.currentTarget.style.background = "rgba(255,255,255,0.7)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px -4px rgba(0,0,0,0.03)";
        }}
      >
        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, var(--accent) 0%, #e67e22 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(251,145,63,0.3)" }}>
          <Icon size={22} color="white" />
        </div>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-main)", lineHeight: "1.4", letterSpacing: "-0.01em" }}>{label}</span>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   CONSENT TAB
   ═══════════════════════════════════════════════════ */
function ConsentTab() {
  const [activeFilter, setActiveFilter] = useState("Pending");
  const filters = ["Pending", "Granted", "Denied", "Expired"];
  const filterMeta = {
    Pending: { icon: Clock,         color: "#f59e0b" },
    Granted: { icon: CheckCircle2,  color: "#16a34a" },
    Denied:  { icon: XCircle,       color: "#dc2626" },
    Expired: { icon: AlertCircle,   color: "#6b7280" },
  };
  const items = MOCK_CONSENTS[activeFilter] || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-main)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>Consent Manager</h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>Review and manage data sharing consents</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {filters.map(f => {
            const { icon: Icon, color } = filterMeta[f];
            const isActive = activeFilter === f;
            const count = (MOCK_CONSENTS[f] || []).length;
            return (
              <button key={f} onClick={() => setActiveFilter(f)} style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "99px",
                border: isActive ? `2px solid ${color}` : "1.5px solid var(--border)",
                background: isActive ? `${color}18` : "var(--bg-surface)",
                color: isActive ? color : "var(--text-muted)",
                fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s",
              }}>
                <Icon size={14} />{f}
                {count > 0 && <span style={{ background: color, color: "#fff", borderRadius: "99px", fontSize: "11px", fontWeight: "700", padding: "0 6px", minWidth: "18px", textAlign: "center" }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {items.length === 0 ? <ConsentEmptyState filter={activeFilter} filterMeta={filterMeta} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {items.map(item => <ConsentCard key={item.id} item={item} filter={activeFilter} />)}
        </div>
      )}
    </div>
  );
}

function ConsentEmptyState({ filter, filterMeta }) {
  const { icon: Icon, color } = filterMeta[filter];
  const emptyText = {
    Pending: ["No Pending Requests",  "All your consent requests are up to date. New requests will appear here."],
    Granted: ["No Granted Consents",  "You haven't granted access to any provider yet."],
    Denied:  ["No Denied Requests",   "You haven't denied any consent requests."],
    Expired: ["No Expired Consents",  "Consents that have passed their validity period will appear here."],
  };
  const [title, desc] = emptyText[filter];
  return (
    <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "20px" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Icon size={32} color={color} />
      </div>
      <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-main)", marginBottom: "8px" }}>{title}</h3>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "320px", margin: "0 auto", lineHeight: "1.6" }}>{desc}</p>
    </div>
  );
}

function ConsentCard({ item, filter }) {
  const colorMap = { Granted: { color: "#16a34a", bg: "#dcfce7" }, Denied: { color: "#dc2626", bg: "#fee2e2" }, Expired: { color: "#6b7280", bg: "#f3f4f6" } };
  const { color, bg } = colorMap[filter] || { color: "#f59e0b", bg: "#fef3c7" };
  const Icon = item.icon;
  return (
    <div className="card-elevated hover-glow" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", flexShrink: 0 }}>
          <Icon size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)" }}>{item.requester}</div>
            <span style={{ background: bg, color, padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "700" }}>{filter}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginTop: "8px" }}>
            {[["Purpose", item.purpose], ["Period", item.period], ["Records", item.records], ["Date", item.granted]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-main)", marginTop: "2px" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {filter === "Granted" && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
          <button style={{ padding: "8px 16px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
            Revoke Access
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PROVIDER TAB
   ═══════════════════════════════════════════════════ */
function ProviderTab() {
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-main)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>Linked Providers</h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>Healthcare facilities and practitioners with access</p>
      </div>
      <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "20px" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Info size={32} color="var(--primary)" />
        </div>
        <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-main)", marginBottom: "8px" }}>No Provider Data Available</h3>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "320px", margin: "0 auto", lineHeight: "1.6" }}>
          Healthcare providers you've interacted with will appear here once linked to your ABHA account.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SWITCH PROFILE MODAL — Full ABHA re-auth flow
   Steps: 1 Enter Mobile  2 Verify OTP  3 Select Address  4 Done
   ═══════════════════════════════════════════════════ */
function SwitchProfileModal({ onClose }) {
  const { saveSession } = useAuth();
  const [step, setStep]               = useState(1);
  const [mobile, setMobile]           = useState("");
  const [otp, setOtp]                 = useState("");
  const [txnId, setTxnId]             = useState("");
  const [addresses, setAddresses]     = useState([]);
  const [selected, setSelected]       = useState("");
  const [busy, setBusy]               = useState(false);
  const [err, setErr]                 = useState("");
  const [countdown, setCountdown]     = useState(120);
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
    if (mobile.length < 10) { setErr("Enter a valid 10-digit mobile number."); return; }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const res = await abhaSendOtp(mobile);
      setTxnId(res?.transactionId || res?.txnId || "mock_txn_" + Date.now());
      setOtp(""); setCountdown(120); setCanResend(false);
      setStep(2);
    } catch (e) { setErr(e.message || "Failed to send OTP. Please try again."); }
    finally { setBusy(false); requestLockRef.current = false; }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = async () => {
    if (requestLockRef.current) return;
    if (otp.length < 6) { setErr("Enter the 6-digit OTP."); return; }
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
      setStep(3);
    } catch (e) { setErr(e.message || "Invalid OTP. Please try again."); }
    finally { setBusy(false); requestLockRef.current = false; }
  };

  /* ── Step 3: Confirm address & switch ── */
  const handleConfirm = async () => {
    if (requestLockRef.current) return;
    if (!selected) { setErr("Please select an ABHA address."); return; }
    requestLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      const res = await abhaConfirmAddress(selected, "", txnId);
      saveSession({ token: res?.token || "mock_abha_token_" + Date.now(), user: res?.user || { name: "ABHA User" } });
      setSwitchedProfile(selected);
      setStep(4);
    } catch (e) { setErr(e.message || "Could not switch profile. Please try again."); }
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
        animation: "modalIn 0.35s var(--ease-out) forwards", overflow: "hidden"
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
        <div style={{ padding: "28px" }}>

          {err && (
            <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "500", marginBottom: "16px", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: "8px" }}>
              <X size={14} style={{ flexShrink: 0 }} />{err}
            </div>
          )}

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
                  <button disabled={busy} onClick={() => { if (requestLockRef.current) return; setOtp(""); setCountdown(120); setCanResend(false); handleSendOtp(); }}
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

/* ═══════════════════════════════════════════════════
   CREATE ANOTHER ABHA ADDRESS MODAL
   ═══════════════════════════════════════════════════ */
function CreateAddressModal({ abhaData, onClose }) {
  const [step, setStep]       = useState(1); // 1 = form, 2 = success
  const [form, setForm]       = useState({ prefix: "", suffix: "@abdm" });
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");
  const [created, setCreated] = useState("");
  // Synchronous lock so a fast double-click can't fire the request twice
  const createLockRef = useRef(false);

  // Block closing the modal while the request is in flight
  const handleClose = () => {
    if (createLockRef.current) return;
    onClose();
  };

  const suggestions = [
    `${abhaData.name.split(" ")[0].toLowerCase()}2@abdm`,
    `${abhaData.name.split(" ").join(".").toLowerCase()}2@abdm`,
    `health.${abhaData.name.split(" ")[0].toLowerCase()}@abdm`,
  ];

  const handleCreate = async () => {
    if (createLockRef.current) return;
    if (!form.prefix.trim()) { setErr("Please enter a valid ABHA address prefix."); return; }
    if (form.prefix.length < 4) { setErr("ABHA address must be at least 4 characters."); return; }
    if (!/^[a-zA-Z0-9._]+$/.test(form.prefix)) { setErr("Only letters, numbers, dots and underscores allowed."); return; }
    createLockRef.current = true;
    setErr(""); setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 1400));
      setCreated(`${form.prefix.toLowerCase()}${form.suffix}`);
      setStep(2);
    } finally {
      setBusy(false);
      createLockRef.current = false;
    }
  };

  return (
    <Overlay onClose={handleClose}>
      <ModalShell title="Create Another ABHA Address" onClose={handleClose} closeDisabled={busy} width={460}>
        {step === 1 ? (
          <>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: "1.6" }}>
              Create an additional ABHA address linked to your account. You can use it to receive health records from different providers.
            </p>

            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "500", marginBottom: "16px", border: "1px solid #fecaca" }}>{err}</div>}

            {/* Suggestions */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Suggestions</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {suggestions.map(s => (
                  <button key={s} disabled={busy} onClick={() => setForm(f => ({ ...f, prefix: s.replace("@abdm", "") }))} style={{
                    padding: "6px 12px", border: "1.5px solid var(--border)", borderRadius: "8px",
                    background: "var(--bg-app)", fontSize: "13px", fontFamily: "monospace",
                    color: "var(--primary)", cursor: busy ? "default" : "pointer", transition: "all 0.2s",
                    fontWeight: "600", opacity: busy ? 0.6 : 1,
                  }}
                    onMouseEnter={e => { if (busy) return; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-light)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)";   e.currentTarget.style.background = "var(--bg-app)"; }}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-main)", marginBottom: "8px" }}>Custom ABHA Address</label>
              <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: "12px", overflow: "hidden", background: "var(--bg-app)", transition: "all 0.2s" }}>
                <input
                  type="text"
                  disabled={busy}
                  value={form.prefix}
                  onChange={e => setForm(f => ({ ...f, prefix: e.target.value.replace(/[^a-zA-Z0-9._]/g, "").toLowerCase() }))}
                  placeholder="yourname"
                  style={{ flex: 1, padding: "13px 16px", border: "none", outline: "none", background: "transparent", fontSize: "15px", fontFamily: "monospace", color: "var(--text-main)" }}
                />
                <div style={{ padding: "13px 16px", background: "var(--primary-light)", color: "var(--primary)", fontSize: "15px", fontFamily: "monospace", fontWeight: "600", borderLeft: "1px solid var(--border)" }}>
                  @abdm
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>Min 4 characters. Letters, numbers, dots and underscores only.</div>
            </div>

            <button disabled={busy || !form.prefix.trim()} onClick={handleCreate} style={{
              width: "100%", padding: "14px", background: busy || !form.prefix.trim() ? "var(--border)" : "var(--accent)",
              color: busy || !form.prefix.trim() ? "var(--text-muted)" : "#fff",
              border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700",
              cursor: busy || !form.prefix.trim() ? "default" : "pointer", transition: "all 0.2s",
              boxShadow: busy || !form.prefix.trim() ? "none" : "0 4px 16px rgba(251,145,63,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Creating Address...</> : "Create ABHA Address"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px" }}>ABHA Address Created!</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: "1.6" }}>Your new ABHA address is ready to use.</p>
            <div style={{ background: "var(--primary-light)", border: "1.5px solid var(--primary-soft)", borderRadius: "12px", padding: "16px", fontFamily: "monospace", fontSize: "16px", fontWeight: "700", color: "var(--primary)", marginBottom: "24px" }}>
              {created}
            </div>
            <button onClick={onClose} style={{
              width: "100%", padding: "14px", background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(46,102,110,0.28)",
            }}>
              Done
            </button>
          </div>
        )}
      </ModalShell>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════════════
   PROFILE PANEL
   ═══════════════════════════════════════════════════ */
function ProfilePanel({ abhaData, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "480px", maxWidth: "90vw",
        background: "var(--bg-surface)", boxShadow: "-20px 0 60px rgba(18,51,58,0.2)",
        zIndex: 1001, display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "slideInRight 0.35s var(--ease-out) forwards",
      }}>
        {/* Panel Header */}
        <div style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>ABHA Profile</h2>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: abhaData.photoColor, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#fff", fontSize: "22px", fontWeight: "800", border: "3px solid rgba(255,255,255,0.4)", boxShadow: "0 0 0 6px rgba(255,255,255,0.1)" }}>
              {abhaData.photoInitials}
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: "0 0 4px" }}>{abhaData.name}</h3>
            <div style={{ color: "var(--accent)", fontSize: "13px", fontFamily: "monospace", fontWeight: "600" }}>{abhaData.abhaAddress}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", fontFamily: "monospace", marginTop: "2px" }}>{abhaData.abhaNumber}</div>
          </div>
        </div>

        {/* Panel Body */}
        <div className="styled-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Personal Information */}
          <SectionHeader color="var(--primary)" label="Personal Information" />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
            <ProfileField label="Full Name"  value={abhaData.name}   icon={User} />
            <ProfileField label="Gender"     value={abhaData.gender} icon={User} />
            {/* DOB — plain display, no custom icon overlay (avoid double calendar) */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Date of Birth</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "10px" }}>
                {[["Day", abhaData.dob.day], ["Month", abhaData.dob.month], ["Year", abhaData.dob.year]].map(([lbl, val]) => (
                  <div key={lbl} style={{ background: "var(--bg-app)", border: "1.5px solid var(--border)", borderRadius: "10px", padding: "10px 14px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{lbl}</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--border)", margin: "4px 0 24px" }} />

          {/* Address Information */}
          <SectionHeader color="var(--accent)" label="Address Information" />
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin size={13} color="var(--text-muted)" />Complete Address
            </div>
            <div style={{ background: "var(--bg-app)", border: "1.5px solid var(--border)", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", color: "var(--text-main)", lineHeight: "1.6" }}>
              {abhaData.address}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   QR DOWNLOAD MODAL
   ═══════════════════════════════════════════════════ */
function QrModal({ abhaData, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <ModalShell title="Your ABHA QR Code" subtitle="Scan to share your ABHA with providers" onClose={onClose} width={420}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          <div style={{ padding: "24px", background: "#fff", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <QrCode size={220} color="#12333A" strokeWidth={1} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "2px" }}>{abhaData.name}</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "monospace" }}>{abhaData.abhaAddress}</div>
          </div>
          <button style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            padding: "16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "14px",
            fontSize: "16px", fontWeight: "700", cursor: "pointer", boxShadow: "0 6px 20px rgba(251,145,63,0.4)",
          }}>
            <Download size={20} />Download QR Code
          </button>
        </div>
      </ModalShell>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════ */
function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2000, padding: "16px", overflowY: "auto" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ margin: "auto 0", flexShrink: 0, width: "100%", display: "flex", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, closeDisabled = false, width = 480, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: `${width}px`, position: "relative", boxShadow: "0 30px 60px -12px rgba(0,0,0,0.4)", animation: "modalIn 0.35s var(--ease-out) forwards" }}>
      <button onClick={onClose} disabled={closeDisabled} style={{ position: "absolute", top: "16px", right: "16px", background: "var(--bg-app)", border: "1px solid var(--border)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: closeDisabled ? "default" : "pointer", opacity: closeDisabled ? 0.6 : 1 }}>
        <X size={18} color="var(--text-muted)" />
      </button>
      <div style={{ marginBottom: "20px", paddingRight: "40px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)", margin: "0 0 4px" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <div style={{ width: "4px", height: "18px", background: color, borderRadius: "2px" }} />
      <h3 style={{ fontSize: "16px", fontWeight: "800", color, margin: 0 }}>{label}</h3>
    </div>
  );
}

function ProfileField({ label, value, icon: Icon }) {
  return (
    <div>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
        <Icon size={13} color="var(--text-muted)" />{label}
      </div>
      <div style={{ background: "var(--bg-app)", border: "1.5px solid var(--border)", borderRadius: "10px", padding: "12px 16px", fontSize: "15px", fontWeight: "500", color: "var(--text-main)" }}>
        {value}
      </div>
    </div>
  );
}
