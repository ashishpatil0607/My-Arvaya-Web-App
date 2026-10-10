import { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  ArrowRight, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Check, 
  Search, 
  X,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  CalendarCheck,
  User,
  ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getHospitalsForLocation } from "../../services/dataService";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../context/AuthContext";
import BookingLayout from "../../components/layout/BookingLayout";
import Toast from "../../components/common/Toast";

/**
 * Sanitizes search input to prevent SQL Injection attempts and malicious payload evaluation.
 * Strips SQL meta-characters, SQL command keywords, and boolean injection tautologies.
 */
export function sanitizeSearchQuery(input = "") {
  if (typeof input !== "string") return "";
  let clean = input.slice(0, 60);
  // Strip dangerous SQL syntax characters: quotes, backticks, semicolons, comments, backslashes, HTML/script tags
  clean = clean.replace(/['"`\\;#<>{}]/g, "");
  clean = clean.replace(/--+/g, "");
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, "");
  // Strip dangerous SQL command keywords (case-insensitive)
  const sqlKeywords =
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|TRUNCATE|DECLARE|CAST|CONVERT|WHERE|FROM|XP_)\b/gi;
  clean = clean.replace(sqlKeywords, "");
  // Strip SQL boolean bypass tautologies (e.g. OR 1=1, AND '1'='1')
  clean = clean.replace(/\b(OR|AND)\s+['"\w\d]+\s*=\s*['"\w\d]+/gi, "");
  // Only allow valid search characters: alphanumeric, spaces, hyphens, commas, ampersands, slashes, periods
  clean = clean.replace(/[^a-zA-Z0-9\s,\-&/.]/g, "");
  return clean;
}

export default function HospitalSelection() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "error" });
  const navigate = useNavigate();
  const { globalLocation, bookingHospital, setBookingHospital } = useBooking();
  const { user, openLoginModal } = useAuth();
  const ITEMS_PER_PAGE = 5;

  // Load hospitals for active location using original API implementation
  useEffect(() => {
    async function loadHospitals() {
      let locationKey = globalLocation?.entitylocation;
      if (!locationKey) {
        try {
          const savedLoc = localStorage.getItem("arvaya_location");
          if (savedLoc) {
            const parsed = JSON.parse(savedLoc);
            locationKey = parsed?.entitylocation;
          }
        } catch (e) {
          console.error("Error reading saved location", e);
        }
      }

      if (!locationKey) {
        setHospitals([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const fetchedHospitals = await getHospitalsForLocation(locationKey);
        const hospitalList = fetchedHospitals || [];
        setHospitals(hospitalList);

        // Auto-select if only 1 facility returned from API and none is selected
        if (hospitalList.length === 1 && !bookingHospital) {
          setBookingHospital(hospitalList[0]);
        }
      } catch (err) {
        console.error("Error loading hospitals", err);
      } finally {
        setLoading(false);
      }
    }

    loadHospitals();
  }, [globalLocation]);

  const filteredHospitals = useMemo(() => {
    const q = sanitizeSearchQuery(searchQ).trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter((h) => {
      const name = (h.name || "").toLowerCase();
      const addr = (h.address || h.address_line_1 || h.address1 || "").toLowerCase();
      const city = (h.city || "").toLowerCase();
      return name.includes(q) || addr.includes(q) || city.includes(q);
    });
  }, [hospitals, searchQ]);

  // Frontend Pagination - Only 5 medical centers per page
  const totalPages = Math.ceil(filteredHospitals.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedHospitals = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHospitals.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHospitals, currentPage, ITEMS_PER_PAGE]);

  const handleSearchChange = (e) => {
    const sanitized = sanitizeSearchQuery(e.target.value);
    setSearchQ(sanitized);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQ("");
    setCurrentPage(1);
  };

  const handleSelect = (hospital) => {
    setBookingHospital(hospital);
  };

  const handleProceed = () => {
    if (!bookingHospital) {
      setToast({
        isOpen: true,
        message: "Please select a hospital or clinic location to proceed.",
        type: "error"
      });
      return;
    }
    if (!user) {
      setToast({
        isOpen: true,
        message: "Please log in to book a doctor appointment.",
        type: "error"
      });
      openLoginModal("/doctors/specialty");
      return;
    }
    navigate("/doctors/specialty");
  };

  const activeCity = hospitals[0]?.city || globalLocation?.city || globalLocation?.entitylocation || "";

  return (
    <>
    <BookingLayout 
      currentStep={0} 
      title="Select Hospital & Clinic Location" 
      subtitle={`Choose your preferred medical center${activeCity ? ` in ${activeCity}` : ''} to view available specialists and book an appointment.`}
    >
      <div className="hospital-selection-container">

        {!user ? (
          <div className="hs-guest">
            <style>{`
              .hs-guest {
                max-width: 520px;
                margin: 28px auto 12px;
                padding: 30px 28px 26px;
                text-align: center;
                background: radial-gradient(circle at 50% 0%, rgba(46, 102, 110, 0.10), transparent 60%), var(--bg-surface, #fff);
                border: 1px solid var(--border);
                border-radius: 22px;
                box-shadow: 0 10px 30px -16px rgba(5, 73, 78, 0.25);
              }
              .hs-guest-art {
                position: relative;
                width: 76px;
                height: 76px;
                margin: 0 auto 14px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--primary);
                background: var(--primary-light);
              }
              .hs-guest-art::after {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 2px solid rgba(46, 102, 110, 0.3);
                animation: hsGuestPulse 2.4s ease-out infinite;
              }
              .hs-guest-title {
                margin: 0 0 6px;
                font-family: var(--font-display);
                font-size: 19px;
                font-weight: 800;
                letter-spacing: -0.015em;
                color: var(--text-main);
              }
              .hs-guest-text {
                margin: 0 auto 18px;
                max-width: 400px;
                font-size: 13.5px;
                line-height: 1.55;
                color: var(--text-muted);
              }
              .hs-guest-steps {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 8px;
                margin: 0 auto 20px;
              }
              .hs-guest-step {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 11px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 650;
                color: var(--text-main);
                background: var(--bg-app, #f7fbfa);
                border: 1px solid var(--border);
              }
              .hs-guest-step svg { color: var(--primary); }
              .hs-guest-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 11px 24px;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 700;
                color: #fff;
                cursor: pointer;
                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                box-shadow: 0 6px 16px -6px rgba(46, 102, 110, 0.6);
                transition: transform 0.2s ease, filter 0.2s ease;
              }
              .hs-guest-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
              .hs-guest-btn svg:last-child { transition: transform 0.2s ease; }
              .hs-guest-btn:hover svg:last-child { transform: translateX(3px); }
              .hs-guest-foot {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-top: 12px;
                font-size: 12px;
                color: var(--text-muted);
              }
              @keyframes hsGuestPulse {
                0% { transform: scale(1); opacity: 0.9; }
                100% { transform: scale(1.35); opacity: 0; }
              }
              @media (max-width: 560px) {
                .hs-guest { margin: 16px auto 8px; padding: 24px 16px 22px; }
                .hs-guest-btn { width: 100%; }
              }
              @media (prefers-reduced-motion: reduce) {
                .hs-guest-art::after { animation: none; }
              }
            `}</style>

            <div className="hs-guest-art" aria-hidden="true">
              <Stethoscope size={32} />
            </div>
            <h2 className="hs-guest-title">Your doctor is just a few steps away</h2>
            <p className="hs-guest-text">
              Sign in to choose a hospital, find the right specialist and book a time that works for you.
            </p>

            <div className="hs-guest-steps">
              <span className="hs-guest-step"><Building2 size={13} /> Pick a hospital</span>
              <span className="hs-guest-step"><Stethoscope size={13} /> Choose a doctor</span>
              <span className="hs-guest-step"><CalendarCheck size={13} /> Book a slot</span>
            </div>

            <button type="button" className="hs-guest-btn" onClick={() => openLoginModal("/doctors")}>
              <User size={16} /> Sign in to Continue <ArrowRight size={16} />
            </button>

            <div className="hs-guest-foot">
              <ShieldCheck size={14} color="var(--primary)" /> Takes less than a minute. Your details stay private.
            </div>
          </div>
        ) : (
        <>
        {/* Controls: Search Bar & Count */}
        <div className="hospital-controls-bar">
          <div className="hospital-search-box">
            <Search size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
            <input 
              type="text"
              className="hospital-search-input"
              placeholder={activeCity ? `Search ${hospitals.length > 0 ? hospitals.length : ''} facilities in ${activeCity}...` : "Search hospital by name, area, or address..."}
              value={searchQ}
              onChange={handleSearchChange}
              maxLength={60}
              autoComplete="off"
              aria-label="Search hospitals"
            />
            {searchQ && (
              <button 
                type="button" 
                className="hospital-search-clear" 
                onClick={handleClearSearch}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="hospital-meta-indicators">
            <span className="hospital-count-badge">
              {filteredHospitals.length} {filteredHospitals.length === 1 ? "facility" : "facilities"} found
            </span>
            {activeCity && (
              <span className="hospital-location-tag">
                <MapPin size={11} /> {activeCity}
              </span>
            )}
          </div>
        </div>

        {/* Hospital Cards Content Area */}
        <div className="styled-scrollbar" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '2px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', gap: '14px' }}>
              <div className="spinner" style={{ borderTopColor: 'var(--primary)', width: '36px', height: '36px', border: '3px solid rgba(46, 102, 110, 0.15)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }}></div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                Loading medical centers{activeCity ? ` in ${activeCity}` : ''}...
              </span>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="hospital-empty-state">
              <div className="hospital-empty-icon-wrap">
                <Building2 size={30} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: '4px 0 2px' }}>
                No Medical Centers Found
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.45 }}>
                We couldn't find any medical facilities registered{activeCity ? ` under ${activeCity}` : ''}.
              </p>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="hospital-empty-state">
              <div className="hospital-empty-icon-wrap">
                <Search size={28} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: '4px 0 2px' }}>
                No Results for "{searchQ}"
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', maxWidth: '340px', margin: '0 auto' }}>
                Try checking for typos or searching by another keyword.
              </p>
              <button 
                type="button" 
                className="hospital-filter-pill active" 
                onClick={handleClearSearch}
                style={{ marginTop: '8px' }}
              >
                Reset Search
              </button>
            </div>
          ) : (
            <>
              <div className="hospital-cards-grid">
                {paginatedHospitals.map((hospital) => {
                  const isSelected = bookingHospital?.name === hospital.name;
                  const addressText = hospital.address || hospital.address_line_1 || hospital.address1 || hospital.city || "";
                  const phoneText = hospital.mobile || hospital.phone || hospital.contact_number || hospital.contact_no || hospital.phone_number || "";

                  return (
                    <article 
                      key={hospital.id || hospital.name}
                      role="button"
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => handleSelect(hospital)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelect(hospital);
                        }
                      }}
                      className={`hospital-card ${isSelected ? "is-selected" : ""}`}
                    >
                      {/* Top Row: Icon + Title & Tags + Radio Check Indicator */}
                      <div className="hospital-card-top">
                        <div className="hospital-card-avatar" aria-hidden="true">
                          <Building2 size={19} />
                        </div>
                        
                        <div className="hospital-card-info">
                          <h3 className="hospital-card-name" title={hospital.name}>
                            {hospital.name}
                          </h3>

                          <div className="hospital-card-subrow">
                            {/* {hospital.city && (
                              <span className="hospital-city-badge">
                                <MapPin size={11} /> {hospital.city}
                              </span>
                            )} */}
                            <span className="hospital-status-pill">
                              <span className="hospital-pulse-dot" /> Verified Center
                            </span>
                          </div>
                        </div>

                        {/* Top-Right Sleek Radio Selection Indicator */}
                        <div className="hospital-card-select-btn" aria-hidden="true">
                          <div className={`hospital-radio-circle ${isSelected ? "is-selected" : ""}`}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      {/* Meta Row: Address & Phone (Real API data only) */}
                      {(addressText || phoneText) && (
                        <div className="hospital-card-meta">
                          {addressText && (
                            <div className="hospital-meta-item hospital-meta-address" title={addressText}>
                              <MapPin size={12} className="meta-icon" />
                              <span className="meta-text">{addressText}</span>
                            </div>
                          )}

                          {phoneText && (
                            <div className="hospital-meta-item hospital-meta-phone">
                              <Phone size={12} className="meta-icon" />
                              <a 
                                href={`tel:${phoneText.replace(/[^0-9+]/g, '')}`} 
                                className="hospital-phone-anchor"
                                onClick={(e) => e.stopPropagation()}
                                title="Call facility"
                              >
                                {phoneText}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Frontend Pagination Controls for 5 cards per page */}
              {filteredHospitals.length > 0 && (
                <div className="hospital-pagination-bar specialty-pagination-bar" style={{ marginTop: '10px' }}>
                  <span className="pagination-info-text">
                    Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong>–<strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredHospitals.length)}</strong> of <strong>{filteredHospitals.length}</strong> {filteredHospitals.length === 1 ? "medical center" : "medical centers"}
                  </span>

                  {totalPages > 1 && (
                    <div className="pagination-controls">
                      <button 
                        type="button" 
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>

                      <div className="pagination-pages-list">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            className={`pagination-num-btn ${currentPage === pageNum ? "active" : ""}`}
                            onClick={() => setCurrentPage(pageNum)}
                            aria-label={`Page ${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <button 
                        type="button" 
                        className="pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        aria-label="Next page"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned Responsive Action Bar */}
        <div className="booking-action-bar">
          <div>
            {bookingHospital ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                <CheckCircle2 size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span>
                  Selected: <strong style={{ color: 'var(--primary-dark)', fontWeight: '750' }}>{bookingHospital.name}</strong>
                  {bookingHospital.city && (
                    <span style={{ marginLeft: '6px', color: 'var(--text-muted)', fontSize: '11.5px', background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '6px' }}>
                      {bookingHospital.city}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Please select a medical center above to proceed
              </span>
            )}
          </div>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleProceed}
            style={{ 
              padding: '11px 26px', 
              fontSize: '14.5px', 
              fontWeight: '650',
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              opacity: bookingHospital ? 1 : 0.65,
              cursor: 'pointer',
              boxShadow: bookingHospital ? '0 4px 14px rgba(46, 102, 110, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Next Step <ArrowRight size={17} />
          </button>
        </div>
        </>
        )}

      </div>
    </BookingLayout>
    <Toast 
      isOpen={toast.isOpen} 
      message={toast.message} 
      type={toast.type} 
      onClose={() => setToast({ ...toast, isOpen: false })} 
    />
    </>
  );
}
