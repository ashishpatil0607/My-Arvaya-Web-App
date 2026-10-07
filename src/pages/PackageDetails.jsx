import { 
  ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Globe, Droplet, Activity, 
  FileText, ShieldCheck, Clock, ArrowRight, Sparkles, CheckCircle2, Stethoscope, 
  TestTube, Calendar, MapPin, PhoneCall, HelpCircle, AlertCircle, Info, Award, UserCheck
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { getDiagnosticPackages } from "../services/dataService";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import SelectSlotUI from "../components/doctors/SelectSlotUI";
import Modal from "../components/common/Modal";

// Rich fallback items for demonstration if API subitems are missing
const defaultOrthoSubitems = [
  // Tests (12)
  { item_key: "t1", item_name: "SERUM ELECTROLYTES", item_type: "test" },
  { item_key: "t2", item_name: "3D CT SCAN KNEE JOINT", item_type: "test" },
  { item_key: "t3", item_name: "ECHOCARDIOGRAM - ECHO", item_type: "test" },
  { item_key: "t4", item_name: "X-RAY - CHEST PA VIEW", item_type: "test" },
  { item_key: "t5", item_name: "X-RAY - BOTH KNEE AP/LAT", item_type: "test" },
  { item_key: "t6", item_name: "COMPLETE BLOOD COUNT (CBC)", item_type: "test" },
  { item_key: "t7", item_name: "FASTING BLOOD SUGAR (FBS)", item_type: "test" },
  { item_key: "t8", item_name: "LIPID PROFILE COMPLETE", item_type: "test" },
  { item_key: "t9", item_name: "LIVER FUNCTION TEST (LFT)", item_type: "test" },
  { item_key: "t10", item_name: "RENAL FUNCTION TEST (RFT)", item_type: "test" },
  { item_key: "t11", item_name: "URINE ROUTINE & MICROSCOPY", item_type: "test" },
  { item_key: "t12", item_name: "THYROID STIMULATING HORMONE (TSH)", item_type: "test" },

  // Treatments & Consultations (23)
  { item_key: "tr1", item_name: "Consultation - Cardiologist", item_type: "treatment" },
  { item_key: "tr2", item_name: "Physician Fitness- In house Physician", item_type: "treatment" },
  { item_key: "tr3", item_name: "Physiotherapy - Strengthening", item_type: "treatment" },
  { item_key: "tr4", item_name: "Anesthesia Charges", item_type: "treatment" },
  { item_key: "tr5", item_name: "Orthopedic Specialist Consultation", item_type: "treatment" },
  { item_key: "tr6", item_name: "Pre-Operative Cardiac Clearance", item_type: "treatment" },
  { item_key: "tr7", item_name: "Post-Operative Rehabilitation Plan", item_type: "treatment" },
  { item_key: "tr8", item_name: "Nursing & Bed Side Care Session", item_type: "treatment" },
  { item_key: "tr9", item_name: "Pain Management Protocol Evaluation", item_type: "treatment" },
  { item_key: "tr10", item_name: "Clinical Nutrition & Dietetics Consultation", item_type: "treatment" },

  // Profiles (2)
  { item_key: "p1", item_name: "Ortho Robotics Screening Profile", item_type: "profile" },
  { item_key: "p2", item_name: "Cardiac Risk Assessment Profile", item_type: "profile" }
];

export default function PackageDetails() {
  const go = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const { setBookingType, setLabPackage, setLabVisitType, setDate, setSlot, setBookingId } = useBooking();
  const { user, openLoginModal } = useAuth();

  const [packageData, setPackageData] = useState(location.state?.package || null);
  const [loading, setLoading] = useState(!location.state?.package);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [visitType, setVisitType] = useState("lab");
  const [activeTab, setActiveTab] = useState("all");
  useEffect(() => {
    if (user) {
      const shouldOpen = sessionStorage.getItem("autoOpenBooking");
      if (shouldOpen === "true") {
        setShowBookingModal(true);
        sessionStorage.removeItem("autoOpenBooking");
      }
    }
  }, [user]);

  const handleBookClick = () => {
    if (!user) {
      sessionStorage.setItem("autoOpenBooking", "true");
      openLoginModal(location.pathname);
    } else {
      setShowBookingModal(true);
    }
  };

  // Fetch package details if loaded via direct URL or refresh
  useEffect(() => {
    if (packageData && Array.isArray(packageData.subitems) && packageData.subitems.length > 0) return;
    let isMounted = true;
    setLoading(true);

    getDiagnosticPackages({ pageSize: 200 })
      .then((apiPkgs) => {
        if (!isMounted) return;
        if (Array.isArray(apiPkgs) && apiPkgs.length > 0) {
          const found = apiPkgs.find(p => 
            String(p.rateplan_package_id) === String(id) ||
            String(p.package_key) === String(id) ||
            String(p.id) === String(id) ||
            (p.package_name && p.package_name.toLowerCase().includes(String(id).toLowerCase()))
          ) || apiPkgs[0];

          if (found) {
            const rawTitle = found.package_name || found.name || found.title || "Health Package";
            const priceVal = parseFloat(found.package_price || found.price || 197380);
            const subitems = Array.isArray(found.subitems) && found.subitems.length > 0
              ? found.subitems
              : defaultOrthoSubitems;

            setPackageData({
              id: found.rateplan_package_id || found.package_key || found.id || id || "1",
              title: String(rawTitle),
              category: found.category || found.package_category || "Full Body & Preventive Care",
              subitems,
              price: priceVal,
              oldPrice: Math.round(priceVal * 1.25),
              fasting: found.fasting || (found.fasting_required ? "10-12 Hours Fasting Required" : "10-12 Hours Fasting Required"),
              reportTime: found.reportTime || found.report_time || "24 Hours Report Delivery",
              img: found.img || found.image || (rawTitle.toLowerCase().includes("diabet") ? "/images/diabetes.png" : rawTitle.toLowerCase().includes("heart") ? "/images/heart-health.png" : rawTitle.toLowerCase().includes("thyroid") ? "/images/thyroid-profile.png" : "/images/full-body-checkup.png"),
              badge: found.badge || "Doctor Verified"
            });
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching package details:", err);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id, packageData]);

  // Organize subitems dynamically into categories
  const groupedSubitems = useMemo(() => {
    const rawSubitems = packageData?.subitems || defaultOrthoSubitems;
    
    const groupsMap = {
      Tests: { title: "Tests", iconType: "test", color: "#0d5c63", bg: "#e6f4f2", items: [] },
      Treatments: { title: "Treatments", iconType: "treatment", color: "#16a34a", bg: "#f0fdf4", items: [] },
      Profiles: { title: "Profiles", iconType: "profile", color: "#0284c7", bg: "#f0f9ff", items: [] }
    };

    rawSubitems.forEach(item => {
      const typeStr = String(item.item_type || item.type || "test").toLowerCase().trim();
      const itemName = item.item_name || item.name || item.title || "Health Item";
      
      let category = "Tests";
      if (typeStr.includes("treatment") || typeStr.includes("consultation")) {
        category = "Treatments";
      } else if (typeStr.includes("profile")) {
        category = "Profiles";
      } else if (typeStr.includes("test") || typeStr.includes("lab")) {
        category = "Tests";
      } else {
        category = typeStr.charAt(0).toUpperCase() + typeStr.slice(1) + "s";
        if (!groupsMap[category]) {
          groupsMap[category] = { title: category, iconType: "other", color: "#6b7280", bg: "#f3f4f6", items: [] };
        }
      }

      groupsMap[category].items.push({
        id: item.item_key || item.id || Math.random(),
        name: itemName,
        type: typeStr,
        price: item.item_price
      });
    });

    return Object.values(groupsMap).filter(g => g.items.length > 0);
  }, [packageData]);

  const totalItemsCount = useMemo(() => {
    return groupedSubitems.reduce((sum, g) => sum + g.items.length, 0);
  }, [groupedSubitems]);

  const toggleCategoryExpand = (catTitle) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catTitle]: !prev[catTitle]
    }));
  };

  const confirmBooking = (slotData) => {
    setBookingType("lab");
    setLabPackage(packageData);
    setLabVisitType(visitType);
    setDate(new Date(slotData.date));
    setSlot(slotData.time);
    setShowBookingModal(false);
    if (!user) return openLoginModal("/confirmed");
    setBookingId("LAB" + Math.floor(Math.random() * 100000000));
    go("/confirmed");
  };

  if (loading) {
    return (
      <main style={{ padding: "48px 0", background: "var(--bg-app)", minHeight: "100vh" }}>
        <div className="container">
          <div className="skeleton" style={{ height: "40px", width: "300px", borderRadius: "12px", marginBottom: "24px" }} />
          <div className="skeleton" style={{ height: "260px", borderRadius: "24px", marginBottom: "32px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px" }}>
            <div className="skeleton" style={{ height: "500px", borderRadius: "24px" }} />
            <div className="skeleton" style={{ height: "400px", borderRadius: "24px" }} />
          </div>
        </div>
      </main>
    );
  }

  if (!packageData) {
    return (
      <main style={{ padding: "80px 0", textAlign: "center", background: "var(--bg-app)", minHeight: "100vh" }}>
        <div className="container">
          <Stethoscope size={54} style={{ opacity: 0.3, marginBottom: "16px", color: "var(--primary)" }} />
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px" }}>Health Package Not Found</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>The package you are looking for might have been moved or removed.</p>
          <button onClick={() => go("/labs/all-packages")} className="btn btn-primary">
            Explore All Health Packages
          </button>
        </div>
      </main>
    );
  }

  const title = packageData.title || packageData.package_name || "Health Package";
  const price = typeof packageData.price === 'number' ? packageData.price : parseFloat(packageData.price || 197380);
  const oldPrice = packageData.oldPrice || Math.round(price * 1.25);
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);

  return (
    <main className="page page-enter" style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", color: "#1e293b" }}>
      
      {/* ── STYLES ── */}
      <style>{`
        .web-pkg-hero {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: #ffffff;
          padding: 36px 0 44px 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(18, 51, 58, 0.12);
        }

        /* Responsive Breadcrumbs */
        .pkg-breadcrumbs {
          margin-bottom: 16px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.6;
        }

        .pkg-breadcrumb-item {
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          display: inline;
          transition: color 0.2s;
        }

        .pkg-breadcrumb-item:hover {
          color: #ffffff;
        }

        .pkg-breadcrumb-arrow {
          display: inline-block;
          vertical-align: -1px;
          margin: 0 4px;
          color: rgba(255, 255, 255, 0.5);
        }

        .pkg-breadcrumb-current {
          color: #ffffff;
          font-weight: 700;
          display: inline;
          word-break: break-word;
        }

        @media (max-width: 426px) {
          .pkg-breadcrumbs {
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 12px;
          }
          .pkg-breadcrumb-arrow {
            margin: 0 3px;
          }
        }

        .web-pkg-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
        }

        .web-pkg-hero-inner {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 36px;
          align-items: center;
        }

        @media (max-width: 992px) {
          .web-pkg-hero-inner {
            grid-template-columns: 1fr;
          }
        }

        .web-pkg-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans, sans-serif);
          font-size: 32px;
          font-weight: 800;
          line-height: 1.25;
          color: #ffffff;
          margin: 12px 0 16px 0;
          letter-spacing: -0.4px;
        }

        @media (max-width: 640px) {
          .web-pkg-title {
            font-size: 24px;
          }
        }

        .web-pkg-hero-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .web-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .web-hero-badge.tag {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .web-hero-badge.green {
          background: rgba(22, 163, 74, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #86efac;
        }

        .web-pkg-stat-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 24px;
        }

        @media (max-width: 640px) {
          .web-pkg-stat-cards {
            grid-template-columns: 1fr;
          }
        }

        .web-stat-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .web-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        /* Layout Grid */
        .web-pkg-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 32px;
          margin-top: 36px;
        }

        @media (max-width: 992px) {
          .web-pkg-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Included Category Card */
        .web-cat-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(18, 51, 58, 0.04);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .web-cat-card-header {
          padding: 20px 24px;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .web-cat-card-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .web-cat-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .web-cat-name {
          font-family: 'Plus Jakarta Sans', var(--font-sans, sans-serif);
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
        }

        .web-cat-count-pill {
          background: #f1f5f9;
          color: #475569;
          font-size: 13.5px;
          font-weight: 700;
          padding: 5px 14px;
          border-radius: 20px;
        }

        .web-cat-items-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 20px 24px;
        }

        @media (max-width: 640px) {
          .web-cat-items-grid {
            grid-template-columns: 1fr;
          }
        }

        .web-item-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
          transition: all 0.2s;
        }

        .web-item-pill:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }

        .web-expand-bar {
          padding: 12px 24px 20px 24px;
          text-align: center;
        }

        .web-expand-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #1b4d54;
          font-size: 13.5px;
          font-weight: 700;
          padding: 8px 20px;
          border-radius: 20px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .web-expand-btn:hover {
          background: #1b4d54;
          color: #ffffff;
          border-color: #1b4d54;
        }

        /* Right Sticky Card */
        .web-sticky-card {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px rgba(18, 51, 58, 0.08);
          padding: 28px;
          position: sticky;
          top: 140px;
        }

        .web-book-btn {
          width: 100%;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #ffffff;
          border: none;
          padding: 16px 24px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.35);
          transition: all 0.25s;
          margin-bottom: 20px;
        }

        .web-book-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(249, 115, 22, 0.45);
        }

        /* How it works steps */
        .web-steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 16px;
        }

        @media (max-width: 768px) {
          .web-steps-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .web-step-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          text-align: center;
        }

        .web-step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1b4d54;
          color: #ffffff;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px auto;
        }
      `}</style>

      {/* ── TOP HERO HEADER BANNER ── */}
      <section className="web-pkg-hero">
        <div className="container">
          
          {/* Breadcrumbs Removed */}
          <div className="web-pkg-hero-inner">
            <div>
              {/* Badges Row */}
              <div className="web-pkg-hero-badges">
                <span className="web-hero-badge tag">
                  <Globe size={14} /> {packageData.category || "Full Body Checkup"}
                </span>
                <span className="web-hero-badge green">
                  <ShieldCheck size={14} /> NABL Accredited Lab
                </span>
                <span className="web-hero-badge tag">
                  <Award size={14} /> {packageData.badge || "Doctor Verified"}
                </span>
              </div>

              {/* Package Title */}
              <h1 className="web-pkg-title">{title}</h1>

              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.85)", margin: "0 0 24px 0", maxWidth: "680px", lineHeight: 1.5 }}>
                Comprehensive health screening & diagnostic checkup package designed by specialist doctors with certified home sample collection.
              </p>

              {/* Stats Summary Bar */}
              <div className="web-pkg-stat-cards">
                <div className="web-stat-card">
                  <div className="web-stat-icon"><Droplet size={18} /></div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800" }}>{totalItemsCount} Total Items</div>
                    <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)" }}>Tests & Consultations</div>
                  </div>
                </div>

                <div className="web-stat-card">
                  <div className="web-stat-icon"><Clock size={18} /></div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800" }}>24 Hours</div>
                    <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)" }}>Smart Digital Report</div>
                  </div>
                </div>

                <div className="web-stat-card">
                  <div className="web-stat-icon"><UserCheck size={18} /></div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800" }}>Free Doctor</div>
                    <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)" }}>Report Consultation</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Top Quick Price Card for Large Screens */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255, 255, 255, 0.08)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.18)", borderRadius: "24px", padding: "24px" }}>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>Package Special Offer</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  ₹{price.toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.8)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={14} color="#86efac" /> Includes Home Sample Collection & Tax
              </p>
              <button onClick={handleBookClick} className="web-book-btn" style={{ marginTop: "10px" }}>
                Book Package Now <ArrowRight size={18} />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER (Two Column Layout) ── */}
      <div className="container">
        
        {/* Back Button */}
        <div style={{ marginTop: "24px", marginBottom: "8px" }}>
          <button 
            onClick={() => go(-1)} 
            className="btn btn-secondary flex items-center gap-2"
            style={{ fontSize: "13px", fontWeight: "700", padding: "8px 18px", borderRadius: "20px" }}
          >
            <ArrowLeft size={16} /> Back to Packages
          </button>
        </div>

        <div className="web-pkg-layout">
          
          {/* ── LEFT COLUMN (Included Details & Info) ── */}
          <div>

            {/* Section Header */}
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  What's Included in Package
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
                  Detailed list of {totalItemsCount} tests, consultations, and screening profiles included.
                </p>
              </div>
            </div>

            {/* Inclusion Categories */}
            {groupedSubitems.map((group) => {
              const isExpanded = !!expandedCategories[group.title];
              const displayItems = isExpanded ? group.items : group.items.slice(0, 6);
              const hiddenCount = group.items.length - 6;

              return (
                <div key={group.title} className="web-cat-card">
                  
                  {/* Category Header */}
                  <div className="web-cat-card-header">
                    <div className="web-cat-card-title">
                      <div className="web-cat-icon-box" style={{ background: group.bg, color: group.color }}>
                        {group.title === "Tests" && <Droplet size={22} />}
                        {group.title === "Treatments" && <Activity size={22} />}
                        {group.title === "Profiles" && <FileText size={22} />}
                        {group.title !== "Tests" && group.title !== "Treatments" && group.title !== "Profiles" && <ShieldCheck size={22} />}
                      </div>
                      <div>
                        <div className="web-cat-name">{group.title}</div>
                        <span style={{ fontSize: "12.5px", color: "#64748b" }}>{group.items.length} Included Items</span>
                      </div>
                    </div>
                    <div className="web-cat-count-pill">{group.items.length}</div>
                  </div>

                  {/* Items Grid */}
                  <div className="web-cat-items-grid">
                    {displayItems.map((item, idx) => (
                      <div key={item.id || idx} className="web-item-pill">
                        <CheckCircle2 size={16} color="#16a34a" style={{ shrink: 0 }} />
                        <span style={{ wordBreak: "break-word" }}>{item.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Expand Toggle */}
                  {hiddenCount > 0 && (
                    <div className="web-expand-bar">
                      <button 
                        className="web-expand-btn" 
                        onClick={() => toggleCategoryExpand(group.title)}
                      >
                        {isExpanded ? (
                          <>Show less <ChevronUp size={15} /></>
                        ) : (
                          <>View +{hiddenCount} more {group.title.toLowerCase()} <ChevronDown size={15} /></>
                        )}
                      </button>
                    </div>
                  )}

                </div>
              );
            })}

            {/* ── 3 FEATURE CARDS BELOW PROFILES ── */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: "24px", 
              marginTop: "24px", 
              marginBottom: "32px",
              padding: "28px 24px",
              background: "#ffffff",
              borderRadius: "22px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)"
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ 
                  width: "64px", 
                  height: "64px", 
                  borderRadius: "50%", 
                  background: "#e0f2fe", 
                  color: "#0284c7", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.12)"
                }}>
                  <Award size={28} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155", textAlign: "center", lineHeight: 1.35, maxWidth: "130px" }}>
                  Doctor Verified Report
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ 
                  width: "64px", 
                  height: "64px", 
                  borderRadius: "50%", 
                  background: "#e0f2fe", 
                  color: "#0284c7", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.12)"
                }}>
                  <Stethoscope size={28} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155", textAlign: "center", lineHeight: 1.35, maxWidth: "130px" }}>
                  Certified Laboratory
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ 
                  width: "64px", 
                  height: "64px", 
                  borderRadius: "50%", 
                  background: "#e0f2fe", 
                  color: "#0284c7", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.12)"
                }}>
                  <Sparkles size={28} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155", textAlign: "center", lineHeight: 1.35, maxWidth: "130px" }}>
                  Millions Happy Customer
                </span>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Sticky Booking Sidebar) ── */}
          <div>
            <div className="web-sticky-card">
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Package Price
                  </span>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#1b4d54", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ₹{price.toLocaleString()}
                  </div>
                </div>
                {discount > 0 && (
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "12.5px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px" }}>
                    {discount}% OFF
                  </span>
                )}
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "14px", border: "1px solid #f1f5f9", marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", color: "#334155", display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Package Fee</span>
                  <span>₹{price.toLocaleString()}</span>
                </div>
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "8px", marginTop: "8px", fontSize: "14px", fontWeight: "800", color: "#0f172a", display: "flex", justifyContent: "space-between" }}>
                  <span>Amount Payable</span>
                  <span>₹{price.toLocaleString()}</span>
                </div>
              </div>

              <button className="web-book-btn" onClick={handleBookClick}>
                Book Health Package <ArrowRight size={18} />
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "18px" }}>
                <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                  <CheckCircle2 size={16} color="#16a34a" /> <b>100% Certified Labs:</b> NABL & ISO Accredited
                </div>
                <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                  <CheckCircle2 size={16} color="#16a34a" /> <b>Free Phlebotomist:</b> Hygienic Home Collection
                </div>
                <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                  <CheckCircle2 size={16} color="#16a34a" /> <b>Doctor Review:</b> Free tele-consultation on report
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ── BOOKING MODAL ── */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="Schedule Health Package"
        maxWidth="680px"
      >
        {/* Unified, Premium Header */}
        <div style={{ 
          marginBottom: "20px", 
          padding: "18px 20px", 
          background: "linear-gradient(135deg, #1b4d54 0%, #11353a 100%)", 
          borderRadius: "18px", 
          color: "#fff", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div style={{ flex: "1 1 280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", background: "rgba(255, 255, 255, 0.15)", padding: "3px 8px", borderRadius: "20px", color: "#2dd4bf" }}>
                🏥 Center Visit
              </span>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "rgba(255, 255, 255, 0.65)" }}>
                {packageData?.category || "Full Body & Preventive Care"}
              </span>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "8px 0 0 0", color: "#ffffff", letterSpacing: "-0.01em" }}>{title}</h3>
          </div>
          <div style={{ minWidth: "120px" }}>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#2dd4bf" }}>₹{price.toLocaleString()}</div>
          </div>
        </div>

        <SelectSlotUI onConfirm={confirmBooking} type="lab" />
      </Modal>

    </main>
  );
}
