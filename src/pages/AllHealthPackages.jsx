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
  const { setBookingType, setLabPackage, setDate, setSlot, setBookingId } = useBooking();
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
        .all-pkg-hero {
          background: #ffffff;
          border-bottom: 1px solid var(--border);
          padding: 24px 0 28px 0;
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

        /* Price beside "View Details" (same as Home / Labs) */
        .all-pkg-card-footer {
          gap: 10px;
        }

        .all-pkg-card-starting {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 2px;
          margin-right: auto;
          min-width: 0;
          line-height: 1.1;
          text-align: left;
        }

        .all-pkg-card-starting small {
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .all-pkg-card-starting strong {
          color: #12333a;
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .all-pkg-card-footer .all-pkg-card-btn {
          width: auto;
          flex-shrink: 0;
          padding: 9px 14px;
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

      {/* Hero Header */}
      <div className="all-pkg-hero">
        <div className="container">
          
          {/* Top Breadcrumb & Back */}
          <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="app-breadcrumbs">
              <Link to="/">Home</Link> 
              <ChevronRight size={12} /> 
              <Link to="/labs">Lab Tests</Link> 
              <ChevronRight size={12} /> 
              <span>All Health Packages</span>
            </div>

            <button 
              onClick={() => go('/labs')}
              className="btn btn-secondary flex items-center gap-2"
              style={{ fontSize: '13px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px' }}
            >
              <ArrowLeft size={15} /> Back to Lab Tests
            </button>
          </div>

          <h1 style={{ 
            fontFamily: "'Plus Jakarta Sans', var(--font-sans)", 
            fontWeight: 800, 
            fontSize: '24px', 
            color: '#12333A', 
            margin: '0 0 6px 0' 
          }}>
            All Health Checkup Packages
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
            Book full body health screening & specialized diagnostic checkups with doctor consultation.
          </p>

          {/* Search Bar & Category Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ 
              background: '#ffffff', 
              border: '1.5px solid var(--border)', 
              borderRadius: '16px', 
              padding: '6px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
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
      </div>

      {/* Main Grid Content */}
      <div className="container" style={{ padding: '32px 16px 64px 16px' }}>

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
                    <div className="all-pkg-card-starting">
                      <small>Starting at</small>
                      <strong>₹{Number(pkg.price).toLocaleString('en-IN')}</strong>
                    </div>
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
