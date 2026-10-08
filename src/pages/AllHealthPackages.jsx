import { 
  Search, ChevronRight, ArrowLeft, FlaskConical, Clock, Heart, ShieldCheck, 
  Droplets, Beaker, Stethoscope, TestTube, MapPin, ArrowRight, X, Sparkles 
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getDiagnosticPackages } from "../services/dataService";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import SelectSlotUI from "../components/doctors/SelectSlotUI";
import Modal from "../components/common/Modal";

export default function AllHealthPackages() {
  const go = useNavigate();
  const { setBookingType, setLabPackage, setLabVisitType, setDate, setSlot, setBookingId } = useBooking();
  const { user, openLoginModal } = useAuth();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [visitType, setVisitType] = useState("home");
  const isInitialMount = useRef(true);

  // Fetch health packages from API and apply filter upon response
  const fetchPackagesFromApi = (searchKeyword = "") => {
    setLoading(true);
    setAppliedQuery(searchKeyword);

    const payload = {
      pageSize: 200,
      search: searchKeyword,
      q: searchKeyword,
      filter: searchKeyword ? ` AND (package_name LIKE '%${searchKeyword}%' OR name LIKE '%${searchKeyword}%')` : ""
    };

    getDiagnosticPackages(payload)
      .then((apiPkgs) => {
        if (Array.isArray(apiPkgs)) {
          const normalized = apiPkgs.map((p, idx) => {
            let rawTitle = p.package_name || p.name || p.title || `Health Package ${idx + 1}`;
            if (rawTitle.includes('-')) rawTitle = rawTitle.split('-')[0].trim();
            const priceVal = parseFloat(p.package_price || p.price || p.cost || p.amount || 999);
            const subitems = Array.isArray(p.subitems) ? p.subitems : [];
            const itemCount = subitems.length > 0 
              ? `${subitems.length} Included Tests & Consultations` 
              : "Comprehensive Package";

            return {
              id: p.rateplan_package_id || p.id || p.package_key || `api-pkg-${idx}`,
              title: String(rawTitle),
              category: p.category || p.package_category || "Full Body & Preventive Care",
              tests: itemCount,
              subitems,
              price: priceVal,
              fasting: p.fasting || (p.fasting_required ? "Fasting Required" : "10-12 Hrs Fasting"),
              reportTime: p.reportTime || p.report_time || "24 Hours",
              img: p.img || p.image || (rawTitle.toLowerCase().includes("diabet") ? "/images/diabetes.png" : rawTitle.toLowerCase().includes("heart") ? "/images/heart-health.png" : rawTitle.toLowerCase().includes("thyroid") ? "/images/thyroid-profile.png" : "/images/full-body-checkup.png"),
              badge: p.badge || (idx === 0 ? "Most Booked" : idx === 1 ? "Popular" : "Doctor Verified")
            };
          });
          setPackages(normalized);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("AllHealthPackages fetch error:", err);
        setLoading(false);
      });
  };

  // Initial fetch on page load
  useEffect(() => {
    fetchPackagesFromApi("");
  }, []);

  // Trigger API and clear filter in UI when search bar input length becomes 0 (after backspace / clearing)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (q.trim().length === 0 && appliedQuery !== "") {
      fetchPackagesFromApi("");
    }
  }, [q, appliedQuery]);

  // Filtered list applied in UI ONLY after API triggers
  const filteredPackages = useMemo(() => {
    return packages.filter(item => {
      if (appliedQuery) {
        const queryLower = appliedQuery.toLowerCase();
        const matchQ = (item.title || "").toLowerCase().includes(queryLower) || 
                       (item.category || "").toLowerCase().includes(queryLower);
        if (!matchQ) return false;
      }
      if (selectedFilter !== "All") {
        return (item.title || "").toLowerCase().includes(selectedFilter.toLowerCase()) ||
               (item.category || "").toLowerCase().includes(selectedFilter.toLowerCase());
      }
      return true;
    });
  }, [packages, appliedQuery, selectedFilter]);

  const confirmBooking = (slotData) => {
    setBookingType("lab");
    setLabPackage(selectedItem);
    setLabVisitType(visitType);
    setDate(new Date(slotData.date));
    setSlot(slotData.time);
    if (!user) return openLoginModal("/confirmed");
    setBookingId("LAB" + Math.floor(Math.random() * 100000000));
    go("/confirmed");
  };

  return (
    <main className="page page-enter" style={{ padding: 0, background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '100vh' }}>
      
      {/* Styles */}
      <style>{`
        .pkg-hero-banner {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #effaf7 0%, #e3f7f2 50%, #ccf4eb 100%);
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
          padding: 16px 0;
        }
        .pkg-hero-wave {
          position: absolute;
          right: 0;
          top: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }
        .pkg-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
        }
        .pkg-hero-content {
          max-width: 760px;
        }
        .pkg-hero-breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 4px;
        }
        .pkg-breadcrumb-link {
          color: #55738d;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .pkg-breadcrumb-link:hover {
          color: #0b2545;
        }
        .pkg-breadcrumb-sep {
          color: #7a94a9;
          flex-shrink: 0;
        }
        .pkg-hero-title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pkg-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .pkg-hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(13, 148, 136, 0.2);
          color: #0d9488;
          font-size: 12.5px;
          font-weight: 700;
        }
        .pkg-hero-desc {
          font-size: 13.5px;
          color: #55738d;
          margin: 2px 0 0 0;
          line-height: 1.5;
        }
        .pkg-hero-side {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .pkg-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(13, 148, 136, 0.25);
          color: #0d9488;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .pkg-back-btn:hover {
          background: #ffffff;
          border-color: rgba(13, 148, 136, 0.45);
        }
        .pkg-hero-graphic {
          display: flex;
        }
        .pkg-hero-svg {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }
        @media (max-width: 768px) {
          .pkg-hero-banner { padding: 12px 0 14px 0; }
        }
        @media (max-width: 640px) {
          .pkg-hero-title { font-size: 19px; }
          .pkg-hero-desc { font-size: 12.5px; }
          .pkg-hero-svg { width: 52px; height: 52px; }
          .pkg-hero-graphic { display: none; }
        }
        @media (max-width: 520px) {
          .pkg-hero-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }

        .all-pkg-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        @media (max-width: 1200px) {
          .all-pkg-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 840px) {
          .all-pkg-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 540px) {
          .all-pkg-grid {
            grid-template-columns: 1fr;
          }
        }

        .all-pkg-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(18, 51, 58, 0.05);
          position: relative;
          width: 100%;
        }

        .all-pkg-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 32px rgba(18, 51, 58, 0.12);
          border-color: var(--primary-soft);
        }

        .all-pkg-card-img-container {
          height: 135px;
          width: 100%;
          background: #f0f7f7;
          overflow: hidden;
          position: relative;
        }

        .all-pkg-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s;
        }

        .all-pkg-card:hover .all-pkg-card-img {
          transform: scale(1.06);
        }

        .all-pkg-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: var(--primary);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .all-pkg-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .all-pkg-card-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-weight: 800;
          font-size: 14.5px;
          line-height: 1.35;
          color: #12333A;
          margin-bottom: 6px;
          min-height: 40px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .all-pkg-card-tests-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #16a34a;
          background: #dcfce7;
          padding: 3px 8px;
          border-radius: 8px;
          width: fit-content;
          margin-bottom: 14px;
        }

        .all-pkg-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px dashed var(--border);
        }

        .all-pkg-card-price-col {
          display: flex;
          flex-direction: column;
        }

        .all-pkg-card-price-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .all-pkg-card-price {
          font-weight: 800;
          font-size: 18px;
          color: #12333A;
          line-height: 1.1;
        }

        .all-pkg-card-btn {
          background: #1b4d54;
          color: #ffffff;
          border: none;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 6px rgba(27, 77, 84, 0.2);
          white-space: nowrap;
        }

        .all-pkg-card-btn:hover {
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(46, 102, 110, 0.35);
          transform: translateY(-1px);
        }

        /* ── Match Labs page "View Details" button ── */
        .all-pkg-card-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 35px;
          padding: 10px 14px;
          justify-content: center;
          gap: 6px;
          font-size: 12.5px;
          box-shadow: 0 8px 18px rgba(8, 123, 115, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .all-pkg-card-btn::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -60%;
          width: 40%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.28), transparent);
          transform: skewX(-20deg);
          transition: left 0.6s ease;
          pointer-events: none;
        }

        .all-pkg-card-btn svg {
          transition: transform 0.2s ease;
        }

        .all-pkg-card-btn:hover {
          box-shadow: 0 12px 22px rgba(8, 123, 115, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .all-pkg-card-btn:hover::after {
          left: 130%;
        }

        .all-pkg-card-btn:hover svg {
          transform: translateX(3px);
        }

        /* No price shown — "View Details" spans the full card width */
        .all-pkg-card-footer .all-pkg-card-btn {
          width: 100%;
          padding: 11px 14px;
          font-size: 13px;
        }

        @media (prefers-reduced-motion: reduce) {
          .all-pkg-card-btn::after {
            transition: none;
          }
        }

        .all-pkg-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid var(--border);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .all-pkg-chip:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .all-pkg-chip.active {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(46, 102, 110, 0.25);
        }
      `}</style>

      {/* ── Internal Hero Banner ── */}
      <div className="pkg-hero-banner">
        <svg className="pkg-hero-wave" viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C150,90 320,10 500,45 L500,0 L0,0 Z" fill="rgba(255, 255, 255, 0.42)" />
        </svg>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="pkg-hero-inner">
            <div className="pkg-hero-content">
              <nav aria-label="Breadcrumb" className="pkg-hero-breadcrumb">
                <Link to="/" className="pkg-breadcrumb-link">Home</Link>
                <ChevronRight size={13} className="pkg-breadcrumb-sep" />
                <Link to="/labs" className="pkg-breadcrumb-link">Lab Tests</Link>
                <ChevronRight size={13} className="pkg-breadcrumb-sep" />
                <span>All Health Packages</span>
              </nav>

              <div className="pkg-hero-title-row">
                <h1 className="pkg-hero-title">All Health Checkup Packages</h1>
                {!loading && packages.length > 0 && (
                  <span className="pkg-hero-chip">
                    <FlaskConical size={13} /> {packages.length} {packages.length === 1 ? "package" : "packages"}
                  </span>
                )}
              </div>
              <p className="pkg-hero-desc">Book full body health screening & specialized diagnostic checkups with doctor consultation.</p>
            </div>

            <div className="pkg-hero-side">
              <button
                onClick={() => go('/labs')}
                className="pkg-back-btn"
              >
                <ArrowLeft size={14} /> Back to Lab Tests
              </button>
              <div className="pkg-hero-graphic" aria-hidden="true">
                <svg className="pkg-hero-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Sparkles */}
                  <path d="M107 19C107 23.2 109.8 26 114 26C109.8 26 107 28.8 107 33C107 28.8 104.2 26 100 26C104.2 26 107 23.2 107 19Z" fill="#14b8a6" />
                  <path d="M13 46C13 49.5 15.5 52 19 52C15.5 52 13 54.5 13 58C13 54.5 10.5 52 7 52C10.5 52 13 49.5 13 46Z" fill="#14b8a6" />
                  <circle cx="16" cy="74" r="2" fill="#2dd4bf" />
                  <circle cx="112" cy="45" r="1.5" fill="#2dd4bf" />

                  {/* Shield with medical cross */}
                  <path d="M60 16L92 28V56C92 77 78 94 60 102C42 94 28 77 28 56V28L60 16Z" fill="#ffffff" stroke="#0d9488" strokeWidth="3.2" strokeLinejoin="round" />
                  <path d="M60 26L84 35V56C84 72 74 85 60 92" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
                  <rect x="54" y="42" width="12" height="32" rx="3" fill="#2dd4bf" />
                  <rect x="44" y="52" width="32" height="12" rx="3" fill="#2dd4bf" />

                  {/* Pulse line */}
                  <path d="M8 96H34L40 86L48 104L54 96H66" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid var(--border)',
            borderRadius: '16px',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            marginTop: '14px'
          }}>
            <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px', flexShrink: 0 }} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPackagesFromApi(q.trim());
              }}
              style={{ flex: 1, display: 'flex', alignItems: 'center' }}
            >
              <input
                placeholder="Search health packages (e.g. Ortho, Diabetes, Cardiac, Senior)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchPackagesFromApi(q.trim());
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14.5px',
                  color: 'var(--text-main)',
                  padding: '10px 0',
                  fontWeight: '500'
                }}
              />
            </form>
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  fetchPackagesFromApi("");
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="container" style={{ padding: '24px 16px 64px 16px' }}>

        {/* Results Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>
            Showing {filteredPackages.length} {filteredPackages.length === 1 ? 'Health Package' : 'Health Packages'}
          </span>
        </div>

        {loading ? (
          <div className="all-pkg-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="all-pkg-card" style={{ height: '310px' }}>
                <div className="skeleton" style={{ height: '135px' }} />
                <div style={{ padding: '16px' }}>
                  <div className="skeleton skeleton-title" style={{ width: '80%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: '10px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPackages.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Stethoscope size={48} style={{ opacity: 0.25, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>No health packages found</h3>
            <p>Try searching for a different package keyword or clearing filters.</p>
          </div>
        ) : (
          <div className="all-pkg-grid">
            {filteredPackages.map((pkg) => (
              <div className="all-pkg-card" key={pkg.id}>
                <div className="all-pkg-card-img-container">
                  <img src={pkg.img} alt={pkg.title} className="all-pkg-card-img" />
                  {pkg.badge && <div className="all-pkg-card-badge">{pkg.badge}</div>}
                </div>
                <div className="all-pkg-card-body">
                  <div className="all-pkg-card-title">{pkg.title}</div>
                  <div className="all-pkg-card-tests-badge">
                    <ShieldCheck size={12} /> {pkg.tests}
                  </div>
                  <div className="all-pkg-card-footer">
                    <button className="all-pkg-card-btn" onClick={() => go(`/labs/package-details/${encodeURIComponent(pkg.id)}`, { state: { package: pkg } })}>
                      View Details <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Package Booking & Details Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Schedule Health Package"
        maxWidth="700px"
      >
        {selectedItem && (
          <div style={{ marginBottom: "24px", padding: '20px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>{selectedItem.title}</h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{selectedItem.category}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>₹{selectedItem.price.toLocaleString()}</div>
              </div>
            </div>

            {/* Subitems Breakdown if available */}
            {selectedItem.subitems && selectedItem.subitems.length > 0 ? (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Package Inclusion Breakdown ({selectedItem.subitems.length} Items):
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedItem.subitems.map((sub, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-main)', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <ShieldCheck size={13} color="#16a34a" /> {sub.item_name || sub.name || "Lab Item"}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                  <Clock size={14} color="var(--primary)" /> <b>Report Delivery:</b> {selectedItem.reportTime || "24 Hours"}
                </div>
                <div style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                  <ShieldCheck size={14} color="#16a34a" /> <b>Fasting:</b> {selectedItem.fasting || "10-12 Hours Fasting Required"}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "12px" }}>
            Select Sample Collection Preference
          </label>
          <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
            <label style={{ 
              background: visitType === 'home' ? 'var(--primary-light)' : '#ffffff', 
              padding: '16px', 
              borderRadius: '16px', 
              border: visitType === 'home' ? '2px solid var(--primary)' : '1px solid var(--border)', 
              flex: 1, 
              minWidth: '200px', 
              cursor: 'pointer', 
              transition: 'all 0.2s' 
            }}>
              <input type="radio" name="labVisitTypePkg" value="home" checked={visitType === 'home'} onChange={() => setVisitType('home')} style={{ display: 'none' }} />
              <div>
                <b style={{ display: 'block', color: visitType === 'home' ? 'var(--primary-dark)' : 'var(--text-main)', marginBottom: '4px', fontSize: '14px' }}>
                  🏡 Home Sample Collection
                </b>
                <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, display: 'block' }}>A phlebotomist will visit your home address.</small>
              </div>
            </label>
            <label style={{ 
              background: visitType === 'lab' ? 'var(--primary-light)' : '#ffffff', 
              padding: '16px', 
              borderRadius: '16px', 
              border: visitType === 'lab' ? '2px solid var(--primary)' : '1px solid var(--border)', 
              flex: 1, 
              minWidth: '200px', 
              cursor: 'pointer', 
              transition: 'all 0.2s' 
            }}>
              <input type="radio" name="labVisitTypePkg" value="lab" checked={visitType === 'lab'} onChange={() => setVisitType('lab')} style={{ display: 'none' }} />
              <div>
                <b style={{ display: 'block', color: visitType === 'lab' ? 'var(--primary-dark)' : 'var(--text-main)', marginBottom: '4px', fontSize: '14px' }}>
                  🏥 Diagnostic Center Visit
                </b>
                <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, display: 'block' }}>Walk-in to the nearest partner diagnostic center.</small>
              </div>
            </label>
          </div>
        </div>

        <SelectSlotUI onConfirm={confirmBooking} type="lab" />
      </Modal>

    </main>
  );
}
