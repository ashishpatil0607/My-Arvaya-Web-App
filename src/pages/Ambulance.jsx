import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  ArrowLeft,
  Ambulance,
  Phone,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Navigation,
  Search,
  FileX2,
  Zap,
  ShieldCheck,
  Map,
  HeartPulse,
  Wind,
  Activity,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAmbulanceRequests,
  STATUS_FLOW,
  EMERGENCY_TYPES,
} from "../services/ambulanceService";
import LiveAmbulanceTracker from "../components/ambulance/LiveAmbulanceTracker";
import AmbulanceRequestModal from "../components/ambulance/AmbulanceRequestModal";
import CancelAmbulanceModal from "../components/ambulance/CancelAmbulanceModal";

class AmbulanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("AmbulanceErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "18px 20px",
            background: "#fef2f2",
            borderRadius: "12px",
            border: "1px solid #fecaca",
            margin: "10px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#dc2626",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                Tracker details currently unavailable
              </div>
              <div
                style={{
                  color: "#7f1d1d",
                  fontSize: "11.5px",
                  marginTop: "2px",
                }}
              >
                {this.state.error?.message || "Click another request or retry."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: "5px 12px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ITEMS_PER_PAGE = 5;

export default function AmbulancePage() {
  const go = useNavigate();
  const defaultRequests = [];

  const [requests, setRequests] = useState(defaultRequests);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMapRequest, setViewMapRequest] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [activeTracking, setActiveTracking] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [addressExpanded, setAddressExpanded] = useState(false);

  const getEmergencyIcon = (type, customColor, iconSize = 18) => {
    const t = String(type || "").toLowerCase();
    const iconColor = customColor || "#2e666e";
    if (t.includes("cardiac") || t.includes("heart"))
      return <HeartPulse size={iconSize} color={iconColor} />;
    if (t.includes("breath") || t.includes("respir") || t.includes("lungs"))
      return <Wind size={iconSize} color={iconColor} />;
    if (t.includes("pregnan") || t.includes("mater"))
      return <User size={iconSize} color={iconColor} />;
    if (
      t.includes("trans") ||
      t.includes("routine") ||
      t.includes("accid") ||
      t.includes("trauma")
    )
      return <Truck size={iconSize} color={iconColor} />;
    return <Activity size={iconSize} color={iconColor} />;
  };

  const load = async () => {
    const data = await getAmbulanceRequests();
    if (Array.isArray(data) && data.length > 0) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancelRequest = (canceledId, reqItem, cancellationReason) => {
    const targetId =
      canceledId || reqItem?.requestId || reqItem?.request_id || reqItem?.id;
    setRequests((prev) =>
      prev.map((r) => {
        const match = (r.requestId || r.request_id || r.id) === targetId;
        return match ? { ...r, status: "Cancelled", cancellationReason } : r;
      }),
    );
  };

  const getDriverInitials = (name) => {
    if (
      !name ||
      String(name).toLowerCase().includes("awaiting") ||
      String(name).toLowerCase().includes("unassigned") ||
      String(name).toLowerCase().includes("n/a")
    ) {
      return "RP";
    }
    const parts = String(name).trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const getStatusIndex = (status) => {
    if (!status) return 0;
    const s = String(status).trim().toLowerCase().replace(/_/g, " ");
    if (s.includes("cancel") || s.includes("unavailable")) return -1;
    if (s.includes("complete") || s.includes("done")) return 4;
    if (s.includes("arriv") || s.includes("delay")) return 3;
    if (s.includes("dispatch")) return 2;
    if (s.includes("assign")) return 1;
    return 0;
  };

  const getStatusColor = (status) => {
    const s = String(status || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");
    if (s.includes("cancel"))
      return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    if (s.includes("unavailable"))
      return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
    if (s.includes("delay"))
      return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
    if (s.includes("complete") || s.includes("done"))
      return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
    if (s.includes("arriv"))
      return { bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
    if (s.includes("dispatch"))
      return { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" };
    if (s.includes("assign"))
      return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" };
    if (s.includes("request"))
      return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
  };

  const getStatusIcon = (status) => {
    const s = String(status).trim().toLowerCase().replace(/_/g, " ");
    if (s.includes("cancel") || s.includes("unavailable"))
      return <FileX2 size={16} />;
    if (s.includes("delay")) return <AlertTriangle size={16} />;
    const idx = getStatusIndex(status);
    switch (idx) {
      case 0:
        return <Clock size={16} />;
      case 1:
        return <User size={16} />;
      case 2:
        return <Truck size={16} />;
      case 3:
        return <Navigation size={16} />;
      case 4:
        return <CheckCircle2 size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getEmergencyLabel = (val) =>
    EMERGENCY_TYPES.find((t) => t.value === val)?.label || val;

  const formatTime = (iso) => {
    if (
      !iso ||
      iso === "0000-00-00 00:00:00" ||
      iso === "null" ||
      iso === "undefined"
    )
      return "";
    try {
      const normalized =
        typeof iso === "string" && iso.includes(" ")
          ? iso.replace(" ", "T")
          : iso;
      let d = new Date(normalized);
      if (isNaN(d.getTime())) d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, "0");
      return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
    } catch {
      return String(iso);
    }
  };

  const formatTimeShort = (iso) => {
    if (
      !iso ||
      iso === "0000-00-00 00:00:00" ||
      iso === "null" ||
      iso === "undefined"
    )
      return "";
    if (
      typeof iso === "string" &&
      (iso.toLowerCase().includes("am") || iso.toLowerCase().includes("pm"))
    ) {
      return iso;
    }
    try {
      const normalized =
        typeof iso === "string" && iso.includes(" ")
          ? iso.replace(" ", "T")
          : iso;
      const d = new Date(normalized);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
      const dFallback = new Date(iso);
      if (!isNaN(dFallback.getTime())) {
        return dFallback.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      return "";
    }
    return "";
  };

  const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pageNumbers = new Set();
    pageNumbers.add(1);
    pageNumbers.add(totalPages);

    if (currentPage <= 2) {
      // Show 1, 2, 3 ... last
      pageNumbers.add(2);
      pageNumbers.add(3);
    } else if (currentPage === 3) {
      // When user clicks 3: show 1, 2, 3 and the next two (4, 5) ... last
      pageNumbers.add(2);
      pageNumbers.add(3);
      pageNumbers.add(4);
      pageNumbers.add(5);
    } else if (currentPage >= totalPages - 1) {
      // Near the end: show last few pages
      pageNumbers.add(totalPages - 3);
      pageNumbers.add(totalPages - 2);
      pageNumbers.add(totalPages - 1);
    } else {
      // In middle: show previous, current, and next two
      pageNumbers.add(currentPage - 1);
      pageNumbers.add(currentPage);
      if (currentPage + 1 < totalPages) pageNumbers.add(currentPage + 1);
      if (currentPage + 2 < totalPages) pageNumbers.add(currentPage + 2);
    }

    const sorted = Array.from(pageNumbers)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const items = [];
    for (let i = 0; i < sorted.length; i++) {
      const page = sorted[i];
      if (i > 0) {
        const prev = sorted[i - 1];
        const gap = page - prev;
        if (gap >= 2) {
          const isLeft = page <= currentPage;
          items.push({
            type: isLeft ? "dots-left" : "dots-right",
            id: `dots-${prev}-${page}`,
            fromPage: prev,
            toPage: page,
          });
        }
      }
      items.push(page);
    }

    return items;
  };

  const isRequestMatch = (r, targetId) => {
    if (!r || targetId == null) return false;
    const clean = (val) =>
      String(val || "")
        .trim()
        .replace(/^AMB-/, "");
    const tStr = clean(targetId);
    if (!tStr) return false;
    return (
      r.id === targetId ||
      r.requestId === targetId ||
      clean(r.id) === tStr ||
      clean(r.requestId) === tStr
    );
  };

  // Sort descending: latest requests first (top of queue)
  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

  const activeRequests = sortedRequests.filter((r) => {
    const s = String(r.status || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");
    if (
      s.includes("cancel") ||
      s.includes("unavailable") ||
      s.includes("complete") ||
      s.includes("done")
    ) {
      return false;
    }
    const idx = getStatusIndex(r.status);
    return idx >= 0 && idx <= 3;
  });

  const pastRequests = sortedRequests.filter((r) => {
    const idx = getStatusIndex(r.status);
    return idx === 4 || idx === -1;
  });

  const queueRequests = activeRequests;
  const currentSelectedId =
    selectedRequestId != null
      ? selectedRequestId
      : queueRequests[0]?.id || queueRequests[0]?.requestId;
  const selectedRequest =
    queueRequests.find((r) => isRequestMatch(r, currentSelectedId)) ||
    queueRequests[0] ||
    null;

  const filteredPastRequests = (
    historyFilter === "all" ? sortedRequests : pastRequests
  ).filter((req) => {
    const isCancelled = String(req.status || "")
      .toLowerCase()
      .includes("cancel");
    if (historyFilter === "completed")
      return !isCancelled && getStatusIndex(req.status) === 4;
    if (historyFilter === "cancelled") return isCancelled;
    return true;
  });

  const totalPages =
    Math.ceil(filteredPastRequests.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (historyPage - 1) * ITEMS_PER_PAGE;
  const paginatedPastRequests = filteredPastRequests.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const [quickJumpOpen, setQuickJumpOpen] = useState(null);
  const [quickJumpValue, setQuickJumpValue] = useState("");

  useEffect(() => {
    setHistoryPage(1);
    setQuickJumpOpen(null);
  }, [requests, historyFilter]);

  useEffect(() => {
    if (!quickJumpOpen) return;
    const handleOutsideClick = (e) => {
      if (
        !e.target.closest(".ambulance-quick-jump-popover") &&
        !e.target.closest(".ambulance-quick-jump-btn")
      ) {
        setQuickJumpOpen(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setQuickJumpOpen(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [quickJumpOpen]);

  const handleQuickJumpSubmit = (targetPage) => {
    const pageNum = parseInt(targetPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setHistoryPage(pageNum);
      setQuickJumpOpen(null);
      setQuickJumpValue("");
    }
  };

  const scrollToHistory = () => {
    const el = document.getElementById("ambulance-history-section");
    if (el) {
      const navOffset = 85;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <main
      className="page animate-fade-in-up"
      style={{ padding: 0, background: "var(--bg-app)" }}
    >
      {/* ── Internal Hero ── */}
      <header style={{ padding: "16px 0 0" }}>
        <div className="container">
          <div
            className="ambulance-hero-card"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "24px",
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              color: "#fff",
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.08), transparent 45%), linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 62%, #133a41 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 20px 44px rgba(31, 79, 87, 0.28)",
            }}
          >
            <div
              className="ambulance-hero-left"
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  flexShrink: 0,
                  background: "#fff",
                  color: "var(--primary-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 12px 24px rgba(0,60,55,0.2)",
                  transform: "rotate(-6deg)",
                }}
              >
                <Ambulance size={26} />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: "800",
                    margin: "0 0 4px",
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Track Ambulance
                </h1>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  Monitor your emergency ambulance requests in real-time.
                </p>
                <div
                  className="ambulance-hero-badges"
                  style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                >
                  {[
                    { icon: Zap, label: "Fast Response", color: "#fbbf24" },
                    {
                      icon: ShieldCheck,
                      label: "Emergency Support",
                      color: "#2dd4bf",
                    },
                    {
                      icon: Clock,
                      label: "Real-time Tracking",
                      color: "#60a5fa",
                    },
                  ].map(({ icon: Icon, label, color }) => (
                    <span
                      key={label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        color: "#fff",
                        background: "rgba(18,51,58,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "11.5px",
                        fontWeight: "650",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <Icon size={13} color={color} /> {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <img
              src="/images/trackAmbulance.png"
              alt=""
              className="ambulance-hero-img"
              aria-hidden="true"
            />
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: "28px 10px 60px" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid var(--border)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Loading requests…
          </div>
        ) : requests.length === 0 ? (
          /* ── Empty State ── */
          <div
            style={{
              textAlign: "center",
              padding: "44px 32px 48px",
              maxWidth: "580px",
              margin: "10px auto 40px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "24px",
              boxShadow: "0 8px 30px rgba(5,73,78,0.06)",
            }}
          >
            <div
              style={{
                width: "108px",
                height: "108px",
                borderRadius: "50%",
                background: "var(--primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg
                width="68"
                height="56"
                viewBox="0 0 120 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* speed lines */}
                <line
                  x1="2"
                  y1="34"
                  x2="18"
                  y2="34"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                <line
                  x1="2"
                  y1="46"
                  x2="14"
                  y2="46"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                <line
                  x1="2"
                  y1="58"
                  x2="20"
                  y2="58"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                {/* ground shadow */}
                <ellipse
                  cx="64"
                  cy="88"
                  rx="46"
                  ry="6"
                  fill="var(--primary)"
                  opacity="0.12"
                />
                {/* rear box */}
                <rect
                  x="24"
                  y="26"
                  width="60"
                  height="42"
                  rx="6"
                  fill="#ffffff"
                  stroke="var(--primary)"
                  strokeWidth="3"
                />
                {/* cab */}
                <path
                  d="M84 40 H104 C107 40 109 42 110 45 L114 56 C115 58.5 113 61 110.5 61 H84 V40Z"
                  fill="var(--primary)"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {/* cab window */}
                <path d="M89 45 H101 L105 54 H89 Z" fill="#cdeae8" />
                {/* cross badge */}
                <rect
                  x="40"
                  y="36"
                  width="28"
                  height="22"
                  rx="4"
                  fill="var(--primary-light)"
                />
                <rect
                  x="51.5"
                  y="40"
                  width="5"
                  height="14"
                  rx="1.5"
                  fill="var(--accent)"
                />
                <rect
                  x="46"
                  y="45.5"
                  width="16"
                  height="5"
                  rx="1.5"
                  fill="var(--accent)"
                />
                {/* side stripe */}
                <rect
                  x="24"
                  y="60"
                  width="90.5"
                  height="5"
                  fill="var(--accent)"
                  opacity="0.85"
                />
                {/* light bar */}
                <rect
                  x="46"
                  y="19"
                  width="18"
                  height="7"
                  rx="2"
                  fill="#dc2626"
                />
                {/* wheels */}
                <circle cx="42" cy="70" r="10" fill="#1f2937" />
                <circle cx="42" cy="70" r="4" fill="#cbd5e1" />
                <circle cx="96" cy="70" r="10" fill="#1f2937" />
                <circle cx="96" cy="70" r="4" fill="#cbd5e1" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "var(--text-main)",
                marginBottom: "10px",
                letterSpacing: "-0.015em",
                fontFamily: "var(--font-display)",
              }}
            >
              No Ambulance Requests Found
            </h2>
            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-muted)",
                marginBottom: "20px",
                maxWidth: "420px",
                margin: "0 auto 20px",
                lineHeight: 1.5,
              }}
            >
              You haven't made any ambulance requests yet. In case of a medical
              emergency, click the button below to request one immediately.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 24px",
                fontSize: "14.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(220,38,38,0.3)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.filter = "brightness(1.1)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              <Ambulance size={18} /> Call Ambulance Now
            </button>
          </div>
        ) : (
          <>
            {/* ── Active Dashboard Split View (Master-Detail) ── */}
            {selectedRequest && (
              <section style={{ marginBottom: "36px" }}>
                <div
                  className="ambulance-master-detail-card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "340px 1fr",
                    background: "var(--bg-surface)",
                    borderRadius: "22px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 10px 32px rgba(5,73,78,0.07)",
                    overflow: "hidden",
                  }}
                >
                  {/* Left Column: Requests Queue */}
                  <div
                    className="ambulance-queue-sidebar"
                    style={{
                      borderRight: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      background: "#ffffff",
                      height: "100%",
                      minHeight: 0,
                    }}
                  >
                    <div
                      className="ambulance-queue-header"
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "var(--text-main)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {queueRequests.length} Active Requests
                      </span>
                    </div>

                    <div
                      className="ambulance-queue-list"
                      style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
                    >
                      {queueRequests.map((req) => {
                        const isSelected = selectedRequest
                          ? isRequestMatch(req, selectedRequest.id) ||
                          isRequestMatch(req, selectedRequest.requestId)
                          : false;
                        const sc = getStatusColor(req.status);
                        const rawStatus = req.status
                          ? String(req.status).trim()
                          : "Requested";
                        const displayStatus = rawStatus
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        const emergencyLabel =
                          getEmergencyLabel(req.emergencyType) || "Emergency";
                        const rawId = String(
                          req.id || req.requestId || "",
                        ).replace(/^AMB-/, "");
                        const displayId = rawId
                          ? rawId.startsWith("#")
                            ? rawId
                            : `#${rawId}`
                          : "#";

                        const nameParts = String(req.patientName || "Patient")
                          .trim()
                          .split(" ");
                        const shortName =
                          nameParts.length > 1
                            ? `${nameParts[0]} ${nameParts[1][0]}.`
                            : nameParts[0];

                        return (
                          <div
                            key={req.id || req.requestId}
                            onClick={() => {
                              setSelectedRequestId(req.id || req.requestId);
                              setActiveTracking(null);
                            }}
                            className="ambulance-queue-item"
                            style={{
                              padding: "14px 18px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              borderLeft: isSelected
                                ? "4px solid var(--primary)"
                                : "4px solid transparent",
                              background: isSelected
                                ? "rgba(46, 102, 110, 0.08)"
                                : "transparent",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.background = "#f8fafc";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "4px",
                              }}
                            >
                              <span
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: sc.color,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "14.5px",
                                  fontWeight: "700",
                                  color: "#0f172a",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {emergencyLabel}
                                {/* {displayId} } */}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                paddingLeft: "16px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12.5px",
                                  color: "#64748b",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {shortName} · {formatTimeShort(req.createdAt)}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  background: sc.bg,
                                  color: sc.color,
                                  border: `1px solid ${sc.border}`,
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}
                              >
                                {displayStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="ambulance-queue-footer"
                      style={{
                        padding: "12px 18px",
                        borderTop: "1px solid var(--border)",
                        background: "#ffffff",
                        marginTop: "auto",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={scrollToHistory}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "var(--primary)",
                          padding: "4px 0",
                          transition: "color 0.15s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "var(--primary-dark)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "var(--primary)")
                        }
                      >
                        <span>View all history ({sortedRequests.length})</span>
                        <span style={{ fontSize: "15px", lineHeight: 1 }}>
                          →
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Selected Request Details & Live Map */}
                  <AmbulanceErrorBoundary key={String(currentSelectedId)}>
                    <div
                      className="ambulance-detail-panel"
                      style={{
                        padding: "24px 28px",
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {(() => {
                        const sc = getStatusColor(selectedRequest.status);
                        const rawStatus = selectedRequest.status
                          ? String(selectedRequest.status).trim()
                          : "Requested";
                        const sLower = rawStatus
                          .toLowerCase()
                          .replace(/_/g, " ");
                        const isCancelled = sLower.includes("cancel");
                        const isRequested =
                          !isCancelled &&
                          (sLower === "requested" || sLower === "request");
                        const displayStatus = rawStatus
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        const emergencyLabel =
                          getEmergencyLabel(selectedRequest.emergencyType) ||
                          "Emergency";
                        const rawId = String(
                          selectedRequest.id || selectedRequest.requestId || "",
                        ).replace(/^AMB-/, "");
                        const displayId = rawId
                          ? rawId.startsWith("#")
                            ? rawId
                            : `#${rawId}`
                          : "#";
                        const driverDisplayName = isCancelled
                          ? "Request Cancelled"
                          : activeTracking?.driverName ||
                          selectedRequest.driverName ||
                          (isRequested
                            ? "Awaiting driver assignment"
                            : "Rajesh Patil");
                        const driverInitials =
                          getDriverInitials(driverDisplayName);
                        const ambulanceNo =
                          activeTracking?.ambulanceNo ||
                          selectedRequest.ambulanceId ||
                          "MH 10 AB 1234";
                        const driverPhone =
                          activeTracking?.driverPhone ||
                          selectedRequest.driverPhone;
                        const currentIdx = getStatusIndex(
                          selectedRequest.status,
                        );

                        return (
                          <>
                            {/* Header */}
                            <div
                              className="ambulance-detail-header"
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "16px",
                                flexWrap: "wrap",
                                gap: "12px",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: "800",
                                    color: "#0f172a",
                                    letterSpacing: "-0.015em",
                                  }}
                                >
                                  {/* {displayId}  */}
                                  {emergencyLabel}
                                </div>
                                <div
                                  style={{
                                    fontSize: "13.5px",
                                    color: "#64748b",
                                    marginTop: "2px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span>
                                    Patient:{" "}
                                    <span
                                      style={{
                                        fontWeight: "600",
                                        color: "#334155",
                                      }}
                                    >
                                      {selectedRequest.patientName}
                                    </span>
                                  </span>
                                  {selectedRequest.createdAt && (
                                    <>
                                      <span>·</span>
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          color: "#64748b",
                                        }}
                                      >
                                        <Clock size={13.5} color="#64748b" />
                                        <span>{formatTime(selectedRequest.createdAt)}</span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "7px",
                                  padding: "6px 14px",
                                  borderRadius: "20px",
                                  background: sc.bg,
                                  color: sc.color,
                                  border: `1px solid ${sc.border}`,
                                  fontSize: "12.5px",
                                  fontWeight: "700",
                                }}
                              >
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: sc.color,
                                  }}
                                />
                                {displayStatus}
                              </div>
                            </div>

                            {/* Stepper Card */}
                            <div
                              className="ambulance-stepper-card"
                              style={{
                                background: "#f8fafc",
                                borderRadius: "16px",
                                border: "1px solid #e2e8f0",
                                padding: "16px 20px 34px",
                                marginBottom: "18px",
                              }}
                            >
                              <div
                                className="ambulance-stepper-track"
                                style={{
                                  display: "flex",
                                  width: "100%",
                                  padding: "0 8px",
                                }}
                              >
                                {STATUS_FLOW.map((s, i) => {
                                  const isDone = i < currentIdx;
                                  const isActive = i === currentIdx;
                                  const isLast = i === STATUS_FLOW.length - 1;
                                  const isFirst = i === 0;
                                  const isDelayed = sLower.includes("delay");
                                  const stepLabel =
                                    isDelayed && i === 3 ? "Delayed" : s;
                                  const lineDone = i < currentIdx;

                                  let stepTime = null;
                                  if (i === 0)
                                    stepTime = selectedRequest.createdAt;
                                  if (i === 1 && (isDone || isActive))
                                    stepTime =
                                      selectedRequest.assignedAt ||
                                      selectedRequest.createdAt;
                                  if (i === 2 && (isDone || isActive))
                                    stepTime =
                                      selectedRequest.dispatchedAt ||
                                      selectedRequest.updatedAt;
                                  if (i === 3 && (isDone || isActive))
                                    stepTime = selectedRequest.updatedAt;
                                  if (i === 4 && isDone)
                                    stepTime = selectedRequest.completedAt;

                                  return (
                                    <div
                                      key={s}
                                      className={`ambulance-step-item ${isFirst ? "is-first" : ""} ${isLast ? "is-last" : ""}`}
                                      style={{
                                        flex: isLast ? 0 : 1,
                                        position: "relative",
                                      }}
                                    >
                                      {!isLast && (
                                        <div
                                          className="ambulance-step-line"
                                          style={{
                                            position: "absolute",
                                            top: "15px",
                                            left: "30px",
                                            right: "0",
                                            height: "3px",
                                            background: lineDone
                                              ? "var(--primary)"
                                              : "#e2e8f0",
                                            transition: "all 0.3s",
                                          }}
                                        />
                                      )}
                                      <div
                                        className="ambulance-step-circle"
                                        style={{
                                          width: "30px",
                                          height: "30px",
                                          borderRadius: "50%",
                                          background: isDone
                                            ? "var(--primary)"
                                            : isActive
                                              ? "#ffffff"
                                              : "#f1f5f9",
                                          border: isActive
                                            ? "2.5px solid var(--primary)"
                                            : isDone
                                              ? "none"
                                              : "1.5px solid #cbd5e1",
                                          color: isDone
                                            ? "#ffffff"
                                            : isActive
                                              ? "var(--primary)"
                                              : "#64748b",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "12px",
                                          fontWeight: "700",
                                          position: "relative",
                                          zIndex: 2,
                                          boxShadow: isActive
                                            ? "0 0 0 4px rgba(46,102,110,0.15)"
                                            : "none",
                                          transition: "all 0.3s",
                                        }}
                                      >
                                        {isDone ? (
                                          <CheckCircle2 size={16} />
                                        ) : isActive ? (
                                          <Truck
                                            size={15}
                                            color="var(--primary)"
                                          />
                                        ) : (
                                          i + 1
                                        )}
                                      </div>
                                      <div
                                        className={`ambulance-step-label-container ${isFirst ? "is-first" : ""} ${isLast ? "is-last" : ""}`}
                                        style={{
                                          position: "absolute",
                                          top: "36px",
                                          left: isFirst
                                            ? "0px"
                                            : isLast
                                              ? "auto"
                                              : "15px",
                                          right: isLast ? "0px" : "auto",
                                          transform:
                                            isFirst || isLast
                                              ? "none"
                                              : "translateX(-50%)",
                                          width:
                                            isFirst || isLast ? "74px" : "84px",
                                          textAlign: isFirst
                                            ? "left"
                                            : isLast
                                              ? "right"
                                              : "center",
                                          fontSize: "11px",
                                          fontWeight:
                                            isActive || isDone ? "700" : "600",
                                          color: isActive
                                            ? "#0f172a"
                                            : isDone
                                              ? "#334155"
                                              : "#94a3b8",
                                        }}
                                      >
                                        <span className="ambulance-step-label-text">
                                          {stepLabel}
                                        </span>
                                        {stepTime && (
                                          <div
                                            style={{
                                              fontSize: "10px",
                                              color: "#64748b",
                                              marginTop: "2px",
                                            }}
                                          >
                                            {formatTimeShort(stepTime)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Live Map Tracking */}
                            {selectedRequest.status !== "Completed" && (
                              <div
                                style={{
                                  height: "360px",
                                  minHeight: "300px",
                                  borderRadius: "16px",
                                  border: "1px solid var(--border)",
                                  overflow: "hidden",
                                  position: "relative",
                                }}
                              >
                                <LiveAmbulanceTracker
                                  requestId={
                                    selectedRequest.requestId ||
                                    selectedRequest.request_id ||
                                    selectedRequest.id
                                  }
                                  pickupLat={selectedRequest.pickupLat}
                                  pickupLng={selectedRequest.pickupLng}
                                  pickupAddress={selectedRequest.pickupAddress}
                                  patientName={selectedRequest.patientName}
                                  contactNumber={selectedRequest.contactNumber}
                                  status={selectedRequest.status}
                                  hideBottomBar={true}
                                  onCancelRequest={(cId, trk, reason) =>
                                    handleCancelRequest(
                                      cId,
                                      selectedRequest,
                                      reason,
                                    )
                                  }
                                  onTrackingData={(tracking) => {
                                    if (tracking) {
                                      setActiveTracking(tracking);
                                    }
                                  }}
                                />
                              </div>
                            )}

                            {/* Driver Card Bar */}
                            <div
                              style={{
                                background: "#f0fdfa",
                                border: "1px solid rgba(46, 102, 110, 0.18)",
                                borderRadius: "14px",
                                padding: "14px 18px",
                                marginTop: "16px",
                                marginBottom: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "50%",
                                    background: "#1f4f57",
                                    color: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "800",
                                    fontSize: "15px",
                                    letterSpacing: "0.02em",
                                    flexShrink: 0,
                                  }}
                                >
                                  {driverInitials}
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: "15.5px",
                                      fontWeight: "700",
                                      color: "#0f172a",
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {driverDisplayName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      color: "#64748b",
                                      marginTop: "2px",
                                    }}
                                  >
                                    Ambulance:{" "}
                                    <span
                                      style={{
                                        fontWeight: "600",
                                        color: "#334155",
                                      }}
                                    >
                                      {ambulanceNo}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {isRequested && (
                                  <button
                                    type="button"
                                    onClick={() => setCancelModalOpen(true)}
                                    style={{
                                      background: "#dc2626",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "10px",
                                      padding: "9px 18px",
                                      fontSize: "13.5px",
                                      fontWeight: "700",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      transition: "all 0.15s ease",
                                      boxShadow:
                                        "0 2px 8px rgba(220,38,38,0.22)",
                                    }}
                                    onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#b91c1c")
                                    }
                                    onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "#dc2626")
                                    }
                                  >
                                    <XCircle size={15} />
                                    <span>Cancel Request</span>
                                  </button>
                                )}

                                {!isRequested &&
                                  !isCancelled &&
                                  (driverPhone ? (
                                    <a
                                      href={`tel:${driverPhone}`}
                                      style={{
                                        background: "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "10px",
                                        padding: "9px 18px",
                                        fontSize: "13.5px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        textDecoration: "none",
                                        transition: "all 0.15s ease",
                                        boxShadow:
                                          "0 2px 8px rgba(22,163,74,0.22)",
                                      }}
                                      onMouseEnter={(e) =>
                                      (e.currentTarget.style.background =
                                        "#15803d")
                                      }
                                      onMouseLeave={(e) =>
                                      (e.currentTarget.style.background =
                                        "#16a34a")
                                      }
                                    >
                                      <Phone size={15} />
                                      <span>Call</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      style={{
                                        background: "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "10px",
                                        padding: "9px 18px",
                                        fontSize: "13.5px",
                                        fontWeight: "700",
                                        opacity: 0.85,
                                        cursor: "not-allowed",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Phone size={15} />
                                      <span>Call</span>
                                    </button>
                                  ))}

                                {isCancelled && (
                                  <span
                                    style={{
                                      fontSize: "12.5px",
                                      fontWeight: "700",
                                      color: "#dc2626",
                                      background: "#fee2e2",
                                      padding: "6px 14px",
                                      borderRadius: "10px",
                                    }}
                                  >
                                    Cancelled
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Footer Info */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                paddingTop: "4px",
                              }}
                            >
                              {selectedRequest.createdAt && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "13.5px",
                                    color: "#64748b",
                                  }}
                                >
                                  <Clock
                                    size={16}
                                    color="var(--primary)"
                                    style={{ flexShrink: 0 }}
                                  />
                                  <span>
                                    Requested Date:{" "}
                                    <strong style={{ color: "#0f172a" }}>
                                      {formatTime(selectedRequest.createdAt)}
                                    </strong>
                                  </span>
                                </div>
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  fontSize: "13.5px",
                                  color: "#64748b",
                                }}
                              >
                                <AlertTriangle
                                  size={16}
                                  color="var(--primary)"
                                  style={{ flexShrink: 0 }}
                                />
                                <span>
                                  Emergency:{" "}
                                  <strong style={{ color: "#0f172a" }}>
                                    {emergencyLabel}
                                  </strong>
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: "8px",
                                  fontSize: "13.5px",
                                  color: "#64748b",
                                }}
                              >
                                <MapPin
                                  size={16}
                                  color="#64748b"
                                  style={{ flexShrink: 0, marginTop: "2px" }}
                                />
                                <div>
                                  <span>
                                    Pickup address:{" "}
                                    <span style={{ color: "#0f172a" }}>
                                      {addressExpanded
                                        ? selectedRequest.pickupAddress ||
                                        "Not specified"
                                        : selectedRequest.pickupAddress
                                          ? selectedRequest.pickupAddress.slice(
                                            0,
                                            85,
                                          ) +
                                          (selectedRequest.pickupAddress
                                            .length > 85
                                            ? "..."
                                            : "")
                                          : "Not specified"}
                                    </span>
                                  </span>
                                  {selectedRequest.pickupAddress &&
                                    selectedRequest.pickupAddress.length >
                                    85 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAddressExpanded(!addressExpanded)
                                        }
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "var(--primary)",
                                          cursor: "pointer",
                                          fontSize: "12.5px",
                                          fontWeight: "600",
                                          marginLeft: "6px",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        (
                                        {addressExpanded
                                          ? "Show less"
                                          : "Tap to expand"}
                                        )
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </AmbulanceErrorBoundary>
                </div>
              </section>
            )}

            {/* ── Past Requests / Request History ── */}
            {sortedRequests.length > 0 && (
              <section
                id="ambulance-history-section"
                style={{ margin: "44px 0 24px", scrollMarginTop: "90px" }}
              >
                <div
                  className="ambulance-history-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "20px",
                        fontWeight: "800",
                        color: "var(--text-main)",
                        margin: "0 0 4px",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      Request History
                    </h2>
                    <p
                      style={{
                        fontSize: "13.5px",
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      Your previous emergency requests and dispatched patient
                      telemetry.
                    </p>
                  </div>
                  <div
                    className="ambulance-history-filter-tabs"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      { id: "all", label: "All" },
                      { id: "completed", label: "Completed" },
                      { id: "cancelled", label: "Cancelled" },
                    ].map((tab) => {
                      const active = historyFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setHistoryFilter(tab.id)}
                          style={{
                            padding: "7px 18px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: active ? "700" : "600",
                            border: "none",
                            background: active ? "#245d65" : "#e6f0f2",
                            color: active ? "#ffffff" : "#334155",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="ambulance-history-card"
                  style={{
                    background: "var(--bg-surface)",
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 6px 24px rgba(5,73,78,0.06)",
                    overflow: "hidden",
                  }}
                >
                  {filteredPastRequests.length === 0 ? (
                    <div
                      style={{
                        padding: "36px 20px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "14px",
                      }}
                    >
                      No {historyFilter === "all" ? "" : historyFilter} requests
                      found.
                    </div>
                  ) : (
                    paginatedPastRequests.map((req, idx) => {
                      const rawStatus = req.status
                        ? String(req.status).trim()
                        : "Completed";
                      const sLower = rawStatus.toLowerCase().replace(/_/g, " ");
                      const isCancelled = sLower.includes("cancel");
                      const isNegative =
                        isCancelled ||
                        sLower.includes("unavailable") ||
                        sLower.includes("fail") ||
                        sLower.includes("reject");
                      const isWarning = sLower.includes("delay");
                      const statusColor = getStatusColor(rawStatus);
                      const displayStatus = rawStatus
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                      const emergencyLabel =
                        getEmergencyLabel(req.emergencyType) || "Emergency";
                      const rawId = String(
                        req.id || req.requestId || "",
                      ).replace(/^AMB-/, "");
                      const displayId = rawId
                        ? rawId.startsWith("#")
                          ? rawId
                          : `#${rawId}`
                        : "#";

                      const canViewMap =
                        !isCancelled &&
                        !sLower.includes("unavailable") &&
                        !sLower.includes("assign") &&
                        !sLower.includes("complete") &&
                        !sLower.includes("done") &&
                        !sLower.includes("fail") &&
                        !sLower.includes("reject") &&
                        !sLower.includes("request");

                      return (
                        <div
                          key={req.id || req.requestId || idx}
                          className="ambulance-history-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px 22px",
                            borderBottom:
                              idx === paginatedPastRequests.length - 1
                                ? "none"
                                : "1px solid var(--border)",
                            gap: "16px",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Left icon + details */}
                          <div
                            className="ambulance-history-main"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "12px",
                                background: statusColor.bg,
                                border: `1px solid ${statusColor.border || "transparent"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {getEmergencyIcon(
                                req.emergencyType,
                                statusColor.color,
                                20,
                              )}
                            </div>

                            <div
                              className="ambulance-history-text-col"
                              style={{ minWidth: 0, flex: 1 }}
                            >
                              <div
                                className="ambulance-history-title"
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "700",
                                  color: "var(--text-main)",
                                  letterSpacing: "-0.01em",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  lineHeight: 1.3,
                                }}
                              >
                                {/* {displayId}  */}
                                
                                {emergencyLabel}
                              </div>
                              <div
                                className="ambulance-history-subtitle"
                                style={{
                                  fontSize: "13px",
                                  color: "var(--text-muted)",
                                  marginTop: "2px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {req.patientName} · {formatTime(req.createdAt)}
                              </div>
                              {req.pickupAddress && (
                                <div
                                  className="ambulance-history-address"
                                  style={{
                                    fontSize: "13px",
                                    color: "var(--text-muted)",
                                    marginTop: "2px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={req.pickupAddress}
                                >
                                  {req.pickupAddress}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Status Pill + View Map Button */}
                          <div
                            className="ambulance-history-actions"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                background: statusColor.bg,
                                color: statusColor.color,
                                border: `1px solid ${statusColor.border || "transparent"}`,
                                padding: "6px 14px",
                                borderRadius: "16px",
                                fontSize: "12.5px",
                                fontWeight: "700",
                                letterSpacing: "0.01em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {displayStatus}
                            </span>

                            {canViewMap && (
                              <button
                                type="button"
                                onClick={() => setViewMapRequest(req)}
                                className="ambulance-history-map-btn"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "7px 16px",
                                  borderRadius: "10px",
                                  background: "#eaf2f3",
                                  color: "#2e666e",
                                  border: "none",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#dfebed";
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#eaf2f3";
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                }}
                              >
                                <Map size={14} color="#2e666e" />
                                <span>View Map</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div
                      className="ambulance-history-pagination"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 22px",
                        borderTop: "1px solid var(--border)",
                        background: "var(--bg-surface)",
                        flexWrap: "wrap",
                        gap: "10px",
                        position: "relative",
                      }}
                    >
                      <button
                        type="button"
                        className="ambulance-pagination-nav-btn"
                        disabled={historyPage === 1}
                        onClick={() => {
                          setHistoryPage((p) => Math.max(p - 1, 1));
                          setQuickJumpOpen(null);
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "600",
                          border: "none",
                          background:
                            historyPage === 1 ? "#f1f5f9" : "#e6f0f2",
                          color:
                            historyPage === 1 ? "#94a3b8" : "#2e666e",
                          cursor:
                            historyPage === 1 ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                        title="Previous page"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                        <span className="ambulance-nav-text">Previous</span>
                      </button>

                      <div
                        className="ambulance-pagination-pages"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          position: "relative",
                        }}
                      >
                        {getPaginationItems(historyPage, totalPages).map(
                          (item) => {
                            if (typeof item === "number") {
                              const isActive = item === historyPage;
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  className="ambulance-page-num-btn"
                                  onClick={() => {
                                    setHistoryPage(item);
                                    setQuickJumpOpen(null);
                                  }}
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    minWidth: "32px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontWeight: isActive ? "700" : "600",
                                    border: "none",
                                    background: isActive
                                      ? "var(--primary, #2e666e)"
                                      : "#e6f0f2",
                                    color: isActive ? "#ffffff" : "#334155",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    padding: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {item}
                                </button>
                              );
                            }

                            // Ellipsis Quick Jumper Button
                            const isOpen = quickJumpOpen === item.id;
                            const isLeft = item.type === "dots-left";
                            return (
                              <div
                                key={item.id}
                                style={{
                                  position: "relative",
                                  display: "inline-block",
                                }}
                              >
                                <button
                                  type="button"
                                  className="ambulance-quick-jump-btn"
                                  onClick={() => {
                                    setQuickJumpOpen(isOpen ? null : item.id);
                                    setQuickJumpValue("");
                                  }}
                                  title="Quick Jumper: Click to jump to page"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    minWidth: "32px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontWeight: "800",
                                    border: isOpen
                                      ? "1.5px solid var(--primary, #2e666e)"
                                      : "none",
                                    background: isOpen ? "#dfebed" : "#e6f0f2",
                                    color: "#2e666e",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    letterSpacing: "1px",
                                    transition: "all 0.15s ease",
                                    padding: 0,
                                  }}
                                >
                                  •••
                                </button>

                                {isOpen && (
                                  <div
                                    className="ambulance-quick-jump-popover"
                                    style={{
                                      position: "absolute",
                                      bottom: "calc(100% + 8px)",
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                      background: "#ffffff",
                                      border: "1px solid var(--border)",
                                      borderRadius: "14px",
                                      boxShadow:
                                        "0 12px 30px rgba(5,73,78,0.22)",
                                      padding: "12px 14px",
                                      zIndex: 100,
                                      minWidth: "175px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "8px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "8px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "11.5px",
                                          fontWeight: "750",
                                          color: "#334155",
                                        }}
                                      >
                                        Jump to page
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setQuickJumpOpen(null)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          fontSize: "14px",
                                          color: "#94a3b8",
                                          cursor: "pointer",
                                          padding: "0 2px",
                                          lineHeight: 1,
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>

                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        handleQuickJumpSubmit(quickJumpValue);
                                      }}
                                      style={{ display: "flex", gap: "6px" }}
                                    >
                                      <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={quickJumpValue}
                                        onChange={(e) =>
                                          setQuickJumpValue(e.target.value)
                                        }
                                        placeholder={`1-${totalPages}`}
                                        autoFocus
                                        style={{
                                          width: "68px",
                                          padding: "5px 6px",
                                          borderRadius: "6px",
                                          border: "1px solid #cbd5e1",
                                          fontSize: "12px",
                                          outline: "none",
                                          textAlign: "center",
                                        }}
                                      />
                                      <button
                                        type="submit"
                                        style={{
                                          padding: "5px 12px",
                                          borderRadius: "6px",
                                          background:
                                            "var(--primary, #2e666e)",
                                          color: "#fff",
                                          border: "none",
                                          fontSize: "12px",
                                          fontWeight: "700",
                                          cursor: "pointer",
                                        }}
                                      >
                                        Go
                                      </button>
                                    </form>

                                    <div style={{ display: "flex", gap: "4px" }}>
                                      {isLeft ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setHistoryPage(
                                              Math.max(1, historyPage - 3),
                                            );
                                            setQuickJumpOpen(null);
                                          }}
                                          style={{
                                            flex: 1,
                                            padding: "4px 6px",
                                            borderRadius: "6px",
                                            background: "#f1f5f9",
                                            border: "1px solid #e2e8f0",
                                            color: "#2e666e",
                                            fontSize: "10.5px",
                                            fontWeight: "650",
                                            cursor: "pointer",
                                          }}
                                        >
                                          « -3 Pages
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setHistoryPage(
                                              Math.min(
                                                totalPages,
                                                historyPage + 3,
                                              ),
                                            );
                                            setQuickJumpOpen(null);
                                          }}
                                          style={{
                                            flex: 1,
                                            padding: "4px 6px",
                                            borderRadius: "6px",
                                            background: "#f1f5f9",
                                            border: "1px solid #e2e8f0",
                                            color: "#2e666e",
                                            fontSize: "10.5px",
                                            fontWeight: "650",
                                            cursor: "pointer",
                                          }}
                                        >
                                          +3 Pages »
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      <button
                        type="button"
                        className="ambulance-pagination-nav-btn"
                        disabled={historyPage === totalPages}
                        onClick={() => {
                          setHistoryPage((p) => Math.min(p + 1, totalPages));
                          setQuickJumpOpen(null);
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "600",
                          border: "none",
                          background:
                            historyPage === totalPages
                              ? "#f1f5f9"
                              : "#e6f0f2",
                          color:
                            historyPage === totalPages
                              ? "#94a3b8"
                              : "#2e666e",
                          cursor:
                            historyPage === totalPages
                              ? "not-allowed"
                              : "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                        title="Next page"
                        aria-label="Next page"
                      >
                        <span className="ambulance-nav-text">Next</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Responsive styles for Ambulance page */}
            <style>{`
              .ambulance-master-detail-card {
                display: grid;
                grid-template-columns: 340px 1fr;
              }
              .ambulance-queue-list::-webkit-scrollbar {
                width: 5px;
              }
              .ambulance-queue-list::-webkit-scrollbar-track {
                background: transparent;
              }
              .ambulance-queue-list::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .ambulance-active-card {
                padding: 24px;
              }
              .ambulance-stepper-track {
                display: flex;
                width: 100%;
                padding: 0 8px 30px 8px;
                margin-bottom: 18px;
              }
              .ambulance-step-item {
                flex: 1;
                position: relative;
              }
              .ambulance-step-item.is-last {
                flex: 0;
              }
              .ambulance-step-line {
                position: absolute;
                top: 15px;
                left: 30px;
                right: 0;
                height: 3px;
                transition: all 0.3s;
              }
              .ambulance-step-circle {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justifyContent: center;
                transition: all 0.3s;
                font-size: 13px;
                font-weight: 700;
                position: relative;
                z-index: 1;
              }
              .ambulance-step-label-container {
                position: absolute;
                top: 36px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.03em;
              }

              /* Tablet / Smaller screen layout adjustments (<= 992px) */
              @media (max-width: 992px) {
                .ambulance-master-detail-card {
                  display: flex !important;
                  flex-direction: column !important;
                  gap: 20px !important;
                  background: transparent !important;
                  border: none !important;
                  box-shadow: none !important;
                  overflow: visible !important;
                }
                .ambulance-queue-sidebar {
                  border: 1px solid var(--border) !important;
                  border-radius: 20px !important;
                  box-shadow: 0 6px 20px rgba(5,73,78,0.06) !important;
                  background: #ffffff !important;
                  overflow: hidden !important;
                  width: 100% !important;
                  height: auto !important;
                }
                .ambulance-queue-list {
                  max-height: 280px !important;
                }
                .ambulance-detail-panel {
                  border: 1px solid var(--border) !important;
                  border-radius: 20px !important;
                  box-shadow: 0 6px 20px rgba(5,73,78,0.06) !important;
                  background: var(--bg-surface) !important;
                  overflow: hidden !important;
                  width: 100% !important;
                  padding: 22px 18px !important;
                }
              }

              /* Mobile & Small screens (<= 768px) */
              @media (max-width: 768px) {
                /* Centering Hero Section */
                .ambulance-hero-card {
                  padding: 20px 16px !important;
                  justify-content: center !important;
                  text-align: center !important;
                }
                .ambulance-hero-card h1 {
                  font-size: 20px !important;
                }
                .ambulance-hero-card p {
                  font-size: 12px !important;
                }
                .ambulance-hero-left {
                  flex-direction: column !important;
                  align-items: center !important;
                  text-align: center !important;
                  width: 100% !important;
                }
                .ambulance-hero-badges {
                  justify-content: center !important;
                }
                .ambulance-hero-badges span {
                  font-size: 11px !important;
                  padding: 5px 8px !important;
                }

                /* Centering Queue Sidebar */
                .ambulance-queue-header {
                  justify-content: center !important;
                  text-align: center !important;
                }
                .ambulance-queue-header span {
                  font-size: 13px !important;
                }
                .ambulance-queue-footer button {
                  justify-content: center !important;
                  text-align: center !important;
                  font-size: 12.5px !important;
                  gap: 8px !important;
                }

                /* Centering Detail Header */
                .ambulance-detail-header {
                  flex-direction: column !important;
                  align-items: center !important;
                  text-align: center !important;
                  justify-content: center !important;
                  gap: 10px !important;
                }
                .ambulance-detail-header > div:first-child {
                  text-align: center !important;
                  width: 100% !important;
                }
                .ambulance-detail-header > div:first-child > div:first-child {
                  font-size: 17px !important;
                }
                .ambulance-detail-header > div:first-child > div:last-child {
                  justify-content: center !important;
                  font-size: 12px !important;
                }

                /* Prominent Stepper on Mobile (Kept Generous, Not Shrunk) */
                .ambulance-stepper-card {
                  padding: 14px 10px 42px !important;
                  margin-bottom: 16px !important;
                }
                .ambulance-stepper-track {
                  padding: 0 4px 38px 4px !important;
                  margin-bottom: 6px !important;
                }
                .ambulance-step-circle {
                  width: 32px !important;
                  height: 32px !important;
                  font-size: 13px !important;
                }
                .ambulance-step-circle svg {
                  width: 16px !important;
                  height: 16px !important;
                }
                .ambulance-step-line {
                  top: 15px !important;
                  left: 32px !important;
                  height: 3px !important;
                }
                .ambulance-step-label-container {
                  top: 36px !important;
                  font-size: 9.5px !important;
                  letter-spacing: -0.01em !important;
                  line-height: 1.15 !important;
                }
                .ambulance-step-label-container:not(.is-first):not(.is-last) {
                  left: 16px !important;
                  width: 60px !important;
                  transform: translateX(-50%) !important;
                  text-align: center !important;
                }
                .ambulance-step-label-container.is-first {
                  left: 0 !important;
                  right: auto !important;
                  transform: none !important;
                  text-align: left !important;
                  width: 58px !important;
                }
                .ambulance-step-label-container.is-last {
                  left: auto !important;
                  right: 0 !important;
                  transform: none !important;
                  text-align: right !important;
                  width: 58px !important;
                }
                .ambulance-step-time-text,
                .ambulance-step-label-container > div {
                  font-size: 8.5px !important;
                  margin-top: 1px !important;
                }

                /* Centering History Header & Filter Tabs */
                .ambulance-history-header {
                  flex-direction: column !important;
                  align-items: center !important;
                  text-align: center !important;
                  justify-content: center !important;
                  gap: 12px !important;
                }
                .ambulance-history-header > div:first-child {
                  text-align: center !important;
                  width: 100% !important;
                }
                .ambulance-history-header h2 {
                  font-size: 18px !important;
                }
                .ambulance-history-header p {
                  font-size: 12.5px !important;
                }
                .ambulance-history-filter-tabs {
                  justify-content: center !important;
                  width: 100% !important;
                }
                .ambulance-history-filter-tabs button {
                  font-size: 12px !important;
                  padding: 6px 14px !important;
                }

                /* Request History Data Full Visibility (No Cropping or Ellipsis) */
                .ambulance-history-row {
                  flex-direction: column !important;
                  align-items: stretch !important;
                  gap: 12px !important;
                  padding: 14px 14px !important;
                }
                .ambulance-history-main {
                  width: 100% !important;
                  align-items: flex-start !important;
                  gap: 12px !important;
                }
                .ambulance-history-text-col {
                  width: 100% !important;
                  min-width: 0 !important;
                }
                .ambulance-history-title {
                  white-space: normal !important;
                  word-break: break-word !important;
                  overflow: visible !important;
                  text-overflow: clip !important;
                  font-size: 14px !important;
                  line-height: 1.35 !important;
                }
                .ambulance-history-subtitle {
                  white-space: normal !important;
                  word-break: break-word !important;
                  overflow: visible !important;
                  text-overflow: clip !important;
                  font-size: 12px !important;
                  line-height: 1.35 !important;
                  margin-top: 3px !important;
                }
                .ambulance-history-address {
                  white-space: normal !important;
                  word-break: break-word !important;
                  overflow: visible !important;
                  text-overflow: clip !important;
                  font-size: 12px !important;
                  line-height: 1.4 !important;
                  color: #64748b !important;
                  margin-top: 4px !important;
                }
                .ambulance-history-actions {
                  width: 100% !important;
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  padding-top: 10px !important;
                  border-top: 1px dashed var(--border) !important;
                  flex-wrap: wrap !important;
                  gap: 8px !important;
                }
                .ambulance-history-actions button {
                  flex: 1 !important;
                  justify-content: center !important;
                  font-size: 12px !important;
                  padding: 7px 12px !important;
                }
                .ambulance-history-actions span {
                  font-size: 11.5px !important;
                  padding: 5px 10px !important;
                }

                /* History Pagination Centered */
                .ambulance-history-pagination {
                  justify-content: center !important;
                  gap: 8px !important;
                  text-align: center !important;
                  padding: 12px 14px !important;
                }
                .ambulance-nav-text {
                  display: none !important;
                }
                .ambulance-pagination-nav-btn {
                  width: 32px !important;
                  height: 32px !important;
                  min-width: 32px !important;
                  padding: 0 !important;
                  border-radius: 8px !important;
                  display: inline-flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                }
                .ambulance-page-num-btn,
                .ambulance-quick-jump-btn {
                  width: 32px !important;
                  height: 32px !important;
                  min-width: 32px !important;
                  padding: 0 !important;
                  font-size: 12.5px !important;
                }
                .ambulance-quick-jump-popover::after {
                  content: "";
                  position: absolute;
                  top: 100%;
                  left: 50%;
                  transform: translateX(-50%);
                  border-width: 6px;
                  border-style: solid;
                  border-color: #ffffff transparent transparent transparent;
                }

                /* View Map Modal Responsive */
                .ambulance-map-modal-content {
                  max-height: 95vh !important;
                  border-radius: 14px !important;
                }
                .ambulance-map-modal-map {
                  height: 300px !important;
                }
                .ambulance-map-modal-header {
                  padding: 12px 16px !important;
                }
                .ambulance-map-modal-header h3 {
                  font-size: 14px !important;
                }
                .ambulance-map-modal-header p {
                  font-size: 11px !important;
                }
                .ambulance-map-modal-footer {
                  padding: 10px 16px !important;
                  gap: 6px !important;
                }
                .ambulance-map-modal-footer div {
                  font-size: 12px !important;
                }
              }

              /* Extra Small Screens (<= 480px) */
              @media (max-width: 480px) {
                .ambulance-hero-card h1 {
                  font-size: 18px !important;
                }
                .ambulance-hero-card p {
                  font-size: 11.5px !important;
                }
                .ambulance-hero-badges span {
                  font-size: 10px !important;
                  padding: 4px 7px !important;
                }
                .ambulance-stepper-card {
                  padding: 12px 8px 38px !important;
                }
                .ambulance-stepper-track {
                  padding: 0 2px 34px 2px !important;
                }
                .ambulance-step-circle {
                  width: 29px !important;
                  height: 29px !important;
                  font-size: 12px !important;
                }
                .ambulance-step-circle svg {
                  width: 15px !important;
                  height: 15px !important;
                }
                .ambulance-step-line {
                  top: 14px !important;
                  left: 29px !important;
                }
                .ambulance-step-label-container {
                  top: 34px !important;
                  font-size: 8.5px !important;
                }
                .ambulance-step-label-container:not(.is-first):not(.is-last) {
                  width: 52px !important;
                }
                .ambulance-step-label-container.is-first {
                  width: 50px !important;
                }
                .ambulance-step-label-container.is-last {
                  width: 50px !important;
                }
                .ambulance-step-time-text,
                .ambulance-step-label-container > div {
                  font-size: 7.5px !important;
                }
                .ambulance-history-header h2 {
                  font-size: 16px !important;
                }
                .ambulance-history-header p {
                  font-size: 11.5px !important;
                }
                .ambulance-history-title {
                  font-size: 13px !important;
                }
                .ambulance-history-subtitle,
                .ambulance-history-address {
                  font-size: 11.5px !important;
                }
                .ambulance-map-modal-map {
                  height: 250px !important;
                }
                .ambulance-map-modal-header h3 {
                  font-size: 13px !important;
                }
                .ambulance-map-modal-header p {
                  font-size: 10px !important;
                }
              }

              .ambulance-history-row:hover {
                background: rgba(0, 0, 0, 0.015);
              }
              @media (max-width: 640px) {
                .ambulance-history-row {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 12px !important;
                  padding: 14px 16px !important;
                }
                .ambulance-history-actions {
                  width: 100% !important;
                  justify-content: space-between !important;
                }
                .ambulance-fab-sos {
                  bottom: 20px !important;
                  right: 20px !important;
                }
              }

              @media (max-width: 360px) {
                .ambulance-map-modal-map {
                  height: 220px !important;
                }
              }
            `}</style>
          </>
        )}
      </div>

      {/* ── FAB SOS ── */}
      {!showModal && (
        <button
          onClick={() => setShowModal(true)}
          className="ambulance-fab-sos"
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            boxShadow: "0 8px 24px rgba(220,38,38,0.4)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 990,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Emergency SOS"
        >
          <AlertTriangle size={20} />
          <span
            style={{ fontSize: "9px", fontWeight: "800", marginTop: "1px" }}
          >
            SOS
          </span>
        </button>
      )}

      {/* ── Modal (Used in React) ── */}
      {showModal && (
        <AmbulanceRequestModal
          onClose={() => {
            setShowModal(false);
            load();
          }}
          onSuccess={() => { }}
        />
      )}

      {/* ── Cancel Ambulance Modal ── */}
      <CancelAmbulanceModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        requestId={selectedRequest?.id || selectedRequest?.requestId}
        onCancelled={(reason) => {
          handleCancelRequest(
            selectedRequest?.id || selectedRequest?.requestId,
            selectedRequest,
            reason,
          );
          setCancelModalOpen(false);
        }}
      />

      {/* ── Request Map View Modal ── */}
      {viewMapRequest &&
        !String(viewMapRequest.status || "").toLowerCase().includes("complete") &&
        !String(viewMapRequest.status || "").toLowerCase().includes("assign") &&
        !String(viewMapRequest.status || "").toLowerCase().includes("unavailable") &&
        !String(viewMapRequest.status || "").toLowerCase().includes("cancel") &&
        (() => {
          const content = (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1050,
                padding: "16px",
              }}
              onClick={() => setViewMapRequest(null)}
            >
              <div
                className="ambulance-map-modal-content"
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="ambulance-map-modal-header"
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "var(--text-main)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Request Map — {viewMapRequest.id}
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {viewMapRequest.patientName} ·{" "}
                      {getEmergencyLabel(viewMapRequest.emergencyType)}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewMapRequest(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "22px",
                      lineHeight: 1,
                      padding: "4px 8px",
                      flexShrink: 0,
                    }}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  <div
                    className="ambulance-map-modal-map"
                    style={{
                      height: "360px",
                      overflow: "hidden",
                      width: "100%",
                    }}
                  >
                    <LiveAmbulanceTracker
                      requestId={
                        viewMapRequest.requestId || viewMapRequest.request_id
                      }
                      pickupLat={viewMapRequest.pickupLat}
                      pickupLng={viewMapRequest.pickupLng}
                      pickupAddress={viewMapRequest.pickupAddress}
                      patientName={viewMapRequest.patientName}
                      contactNumber={viewMapRequest.contactNumber}
                      status={viewMapRequest.status}
                      live={false}
                    />
                  </div>
                  <div
                    className="ambulance-map-modal-footer"
                    style={{
                      padding: "12px 20px",
                      background: "var(--bg-app)",
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        flexWrap: "wrap",
                      }}
                    >
                      <MapPin size={14} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "calc(100% - 30px)",
                        }}
                      >
                        {viewMapRequest.pickupAddress || "Pickup location"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Clock size={14} />
                      <span>{formatTime(viewMapRequest.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
          if (typeof window === "undefined") return content;
          return ReactDOM.createPortal(content, document.body);
        })()}
    </main>
  );
}
