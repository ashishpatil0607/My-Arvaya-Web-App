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
        <style>{`
          .pkg-skel-grid { display: grid; grid-template-columns: 1fr 380px; gap: 32px; }
          @media (max-width: 992px) { .pkg-skel-grid { grid-template-columns: 1fr; } }
        `}</style>
        <div className="container">
          <div className="skeleton" style={{ height: "40px", width: "300px", maxWidth: "100%", borderRadius: "12px", marginBottom: "24px" }} />
          <div className="skeleton" style={{ height: "260px", borderRadius: "28px", marginBottom: "32px" }} />
          <div className="pkg-skel-grid">
            <div className="skeleton" style={{ height: "500px", borderRadius: "24px" }} />
            <div className="skeleton" style={{ height: "400px", borderRadius: "24px" }} />
          </div>
        </div>
      </main>
    );
  }

  if (!packageData) {
    return (
      <main style={{ padding: "96px 0", textAlign: "center", background: "var(--bg-app)", minHeight: "100vh" }}>
        <div className="container">
          <div style={{
            width: "96px", height: "96px", borderRadius: "50%", margin: "0 auto 20px auto",
            background: "var(--primary-light)", color: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 10px rgba(46, 102, 110, 0.06)"
          }}>
            <Stethoscope size={44} />
          </div>
          <h2 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px", letterSpacing: "-0.02em" }}>Health Package Not Found</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "28px", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>The package you are looking for might have been moved or removed.</p>
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
    <main className="page page-enter" style={{ background: "#f6f8fa", minHeight: "100vh", paddingBottom: "96px", color: "#1e293b" }}>

      {/* ── STYLES ── */}
      <style>{`
        @keyframes pkgFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pkgFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(0, -18px); }
        }

        .pkg-anim { animation: pkgFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .pkg-anim-d1 { animation-delay: 0.08s; }
        .pkg-anim-d2 { animation-delay: 0.16s; }
        .pkg-anim-d3 { animation-delay: 0.24s; }

        @media (prefers-reduced-motion: reduce) {
          .pkg-anim, .web-pkg-orb { animation: none !important; }
        }

        /* ── HERO ── */
        .web-pkg-hero {
          background:
            radial-gradient(120% 140% at 0% 0%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%),
            linear-gradient(135deg, #0f3a40 0%, var(--primary-dark) 45%, var(--primary) 100%);
          color: #ffffff;
          padding: 52px 0 60px 0;
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .web-pkg-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(115deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 60%);
          -webkit-mask-image: linear-gradient(115deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 60%);
          pointer-events: none;
          z-index: -1;
        }

        .web-pkg-hero::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        }

        .web-pkg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(10px);
          pointer-events: none;
          z-index: -1;
          animation: pkgFloat 9s ease-in-out infinite;
        }

        .web-pkg-orb.one {
          width: 420px;
          height: 420px;
          top: -180px;
          right: -80px;
          background: radial-gradient(circle, rgba(94, 234, 212, 0.22) 0%, rgba(94, 234, 212, 0) 70%);
        }

        .web-pkg-orb.two {
          width: 320px;
          height: 320px;
          bottom: -160px;
          right: 28%;
          background: radial-gradient(circle, rgba(251, 145, 63, 0.18) 0%, rgba(251, 145, 63, 0) 70%);
          animation-delay: -4s;
        }

        .web-pkg-hero-inner {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 48px;
          align-items: center;
        }

        @media (max-width: 992px) {
          .web-pkg-hero-inner {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }

        .web-pkg-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans, sans-serif);
          font-size: clamp(26px, 3.4vw, 40px);
          font-weight: 800;
          line-height: 1.18;
          color: #ffffff;
          margin: 4px 0 14px 0;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .web-pkg-lead {
          font-size: 15.5px;
          color: rgba(255,255,255,0.82);
          margin: 0 0 8px 0;
          max-width: 640px;
          line-height: 1.6;
        }

        .web-pkg-hero-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .web-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 13px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .web-hero-badge.tag {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .web-hero-badge.green {
          background: rgba(34, 197, 94, 0.16);
          border: 1px solid rgba(134, 239, 172, 0.4);
          color: #bbf7d0;
        }

        .web-pkg-stat-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 28px;
        }

        @media (max-width: 640px) {
          .web-pkg-stat-cards {
            grid-template-columns: 1fr;
          }
        }

        .web-stat-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 18px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
        }

        .web-stat-card:hover {
          transform: translateY(-3px);
          background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%);
          border-color: rgba(255, 255, 255, 0.28);
        }

        .web-stat-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.1));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .web-stat-value {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .web-stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin-top: 1px;
        }

        /* Hero price card */
        .web-hero-price {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 28px;
          padding: 26px;
          box-shadow: 0 24px 60px rgba(4, 25, 29, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .web-hero-price-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #fed7aa;
          background: rgba(251, 145, 63, 0.16);
          border: 1px solid rgba(251, 145, 63, 0.35);
          padding: 5px 11px;
          border-radius: 999px;
        }

        .web-hero-price-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .web-hero-price-value {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 40px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .web-hero-price-note {
          font-size: 13px;
          color: rgba(255,255,255,0.82);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.12);
        }

        /* Cancel the global main.page > div:first-of-type panel background */
        #pkg-main-content {
          background: none !important;
          border-bottom: 0 !important;
        }

        /* ── BACK BUTTON ── */
        .web-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-dark);
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 9px 18px 9px 14px;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: all 0.2s ease;
        }

        .web-back-btn svg { transition: transform 0.2s ease; }

        .web-back-btn:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 14px rgba(46, 102, 110, 0.12);
        }

        .web-back-btn:hover svg { transform: translateX(-3px); }

        /* ── LAYOUT ── */
        .web-pkg-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 32px;
          margin-top: 28px;
        }

        @media (max-width: 992px) {
          .web-pkg-layout {
            grid-template-columns: 1fr;
          }
        }

        .web-section-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(22px, 2.4vw, 28px);
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .web-section-sub {
          font-size: 14.5px;
          color: #64748b;
          margin: 6px 0 0 0;
        }

        /* ── CATEGORY CARD ── */
        .web-cat-card {
          position: relative;
          background: #ffffff;
          border-radius: 22px;
          border: 1px solid #e8edf2;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 28px rgba(18, 51, 58, 0.05);
          overflow: hidden;
          margin-bottom: 20px;
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }

        .web-cat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--cat-color), color-mix(in srgb, var(--cat-color) 30%, transparent));
        }

        .web-cat-card:hover {
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 16px 40px rgba(18, 51, 58, 0.09);
        }

        .web-cat-card-header {
          padding: 22px 24px 18px 24px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--cat-bg) 55%, #ffffff) 0%, #ffffff 100%);
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .web-cat-card-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .web-cat-icon-box {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cat-color) 18%, transparent);
        }

        .web-cat-name {
          font-family: 'Plus Jakarta Sans', var(--font-sans, sans-serif);
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.015em;
        }

        .web-cat-sub {
          font-size: 12.5px;
          color: #64748b;
        }

        .web-cat-count-pill {
          min-width: 40px;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: 999px;
          color: var(--cat-color);
          background: var(--cat-bg);
          border: 1px solid color-mix(in srgb, var(--cat-color) 20%, transparent);
        }

        .web-cat-items-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          padding: 20px 24px;
        }

        @media (max-width: 640px) {
          .web-cat-items-grid {
            grid-template-columns: 1fr;
            padding: 16px;
          }
          .web-cat-card-header {
            padding: 18px 16px 14px 16px;
          }
        }

        .web-item-pill {
          display: flex;
          align-items: center;
          gap: 11px;
          background: #f8fafc;
          border: 1px solid #eef2f6;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
          line-height: 1.4;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .web-item-pill:hover {
          background: #ffffff;
          border-color: color-mix(in srgb, var(--cat-color) 35%, #e2e8f0);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
          transform: translateY(-1px);
        }

        .web-item-check {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dcfce7;
          color: #16a34a;
        }

        .web-expand-bar {
          padding: 4px 24px 22px 24px;
          text-align: center;
        }

        .web-expand-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: var(--primary-dark);
          font-size: 13.5px;
          font-weight: 700;
          padding: 9px 20px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .web-expand-btn:hover {
          background: var(--primary-dark);
          color: #ffffff;
          border-color: var(--primary-dark);
          box-shadow: 0 6px 16px rgba(31, 79, 87, 0.22);
        }

        /* ── TRUST FEATURES ── */
        .web-trust-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 8px;
          margin-bottom: 32px;
        }

        @media (max-width: 640px) {
          .web-trust-grid {
            grid-template-columns: 1fr;
          }
        }

        .web-trust-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: #ffffff;
          border: 1px solid #e8edf2;
          border-radius: 20px;
          padding: 24px 16px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .web-trust-card:hover {
          transform: translateY(-4px);
          border-color: #bae6fd;
          box-shadow: 0 14px 32px rgba(2, 132, 199, 0.1);
        }

        .web-trust-icon {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.14), inset 0 0 0 1px rgba(2, 132, 199, 0.1);
        }

        .web-trust-label {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.35;
          max-width: 150px;
        }

        /* ── STICKY BOOKING CARD ── */
        .web-sticky-card {
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 50px rgba(18, 51, 58, 0.1);
          position: sticky;
          top: 140px;
          overflow: hidden;
        }

        .web-sticky-head {
          position: relative;
          padding: 24px 26px 22px 26px;
          background:
            radial-gradient(100% 120% at 100% 0%, rgba(94, 234, 212, 0.18) 0%, rgba(94, 234, 212, 0) 60%),
            linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
          color: #ffffff;
        }

        .web-sticky-head-label {
          font-size: 11.5px;
          color: rgba(255,255,255,0.72);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .web-sticky-price {
          font-size: 34px;
          font-weight: 800;
          color: #ffffff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-top: 4px;
        }

        .web-discount-pill {
          background: #22c55e;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          padding: 5px 11px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
          white-space: nowrap;
        }

        .web-sticky-body {
          padding: 22px 26px 26px 26px;
        }

        .web-bill {
          background: #f8fafc;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #eef2f6;
          margin-bottom: 20px;
        }

        .web-bill-row {
          font-size: 13.5px;
          color: #475569;
          display: flex;
          justify-content: space-between;
        }

        .web-bill-total {
          border-top: 1px dashed #cbd5e1;
          padding-top: 12px;
          margin-top: 12px;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          justify-content: space-between;
        }

        .web-book-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          background: linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
          color: #ffffff;
          border: none;
          padding: 16px 24px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 22px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255,255,255,0.25);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          margin-bottom: 20px;
        }

        .web-book-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -120%;
          width: 60%;
          height: 100%;
          background: linear-gradient(110deg, transparent, rgba(255,255,255,0.35), transparent);
          transition: left 0.6s ease;
        }

        .web-book-btn svg { transition: transform 0.25s ease; }

        .web-book-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(249, 115, 22, 0.45), inset 0 1px 0 rgba(255,255,255,0.25);
        }

        .web-book-btn:hover::after { left: 140%; }
        .web-book-btn:hover svg { transform: translateX(4px); }

        .web-book-btn:focus-visible,
        .web-expand-btn:focus-visible,
        .web-back-btn:focus-visible {
          outline: 3px solid rgba(46, 102, 110, 0.35);
          outline-offset: 2px;
        }

        .web-perks {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }

        .web-perk {
          font-size: 13px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #475569;
          line-height: 1.45;
        }

        .web-perk b { color: #0f172a; }

        .web-perk-icon {
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          border-radius: 8px;
          background: #f0fdf4;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -3px;
        }
      `}</style>

      {/* ── TOP HERO HEADER BANNER ── */}
      <section className="web-pkg-hero">
        <span className="web-pkg-orb one" aria-hidden="true" />
        <span className="web-pkg-orb two" aria-hidden="true" />
        <div className="container">

          {/* Breadcrumbs Removed */}
          <div className="web-pkg-hero-inner">
            <div>
              {/* Badges Row */}
              <div className="web-pkg-hero-badges pkg-anim">
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
              <h1 className="web-pkg-title pkg-anim pkg-anim-d1">{title}</h1>

              <p className="web-pkg-lead pkg-anim pkg-anim-d1">
                Comprehensive health screening & diagnostic checkup package designed by specialist doctors with certified home sample collection.
              </p>

              {/* Stats Summary Bar */}
              <div className="web-pkg-stat-cards pkg-anim pkg-anim-d2">
                <div className="web-stat-card">
                  <div className="web-stat-icon"><Droplet size={18} /></div>
                  <div>
                    <div className="web-stat-value">{totalItemsCount} Total Items</div>
                    <div className="web-stat-label">Tests & Consultations</div>
                  </div>
                </div>

                <div className="web-stat-card">
                  <div className="web-stat-icon"><Clock size={18} /></div>
                  <div>
                    <div className="web-stat-value">24 Hours</div>
                    <div className="web-stat-label">Smart Digital Report</div>
                  </div>
                </div>

                <div className="web-stat-card">
                  <div className="web-stat-icon"><UserCheck size={18} /></div>
                  <div>
                    <div className="web-stat-value">Free Doctor</div>
                    <div className="web-stat-label">Report Consultation</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Top Quick Price Card for Large Screens */}
            <div className="web-hero-price pkg-anim pkg-anim-d3">
              <span className="web-hero-price-label">Package Special Offer</span>
              <div className="web-hero-price-row">
                <span className="web-hero-price-value">
                  ₹{price.toLocaleString()}
                </span>
              </div>
              <p className="web-hero-price-note">
                <CheckCircle2 size={15} color="#86efac" /> Includes Home Sample Collection & Tax
              </p>
              <button onClick={handleBookClick} className="web-book-btn" style={{ marginTop: "8px", marginBottom: 0 }}>
                Book Package Now <ArrowRight size={18} />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER (Two Column Layout) ── */}
      <div className="container" id="pkg-main-content">

        {/* Back Button */}
        <div style={{ marginTop: "28px" }}>
          <button onClick={() => go(-1)} className="web-back-btn">
            <ArrowLeft size={16} /> Back to Packages
          </button>
        </div>

        <div className="web-pkg-layout">

          {/* ── LEFT COLUMN (Included Details & Info) ── */}
          <div>

            {/* Section Header */}
            <div style={{ marginBottom: "22px" }}>
              <h2 className="web-section-title">What's Included in Package</h2>
              <p className="web-section-sub">
                Detailed list of {totalItemsCount} tests, consultations, and screening profiles included.
              </p>
            </div>

            {/* Inclusion Categories */}
            {groupedSubitems.map((group) => {
              const isExpanded = !!expandedCategories[group.title];
              const displayItems = isExpanded ? group.items : group.items.slice(0, 6);
              const hiddenCount = group.items.length - 6;

              return (
                <div
                  key={group.title}
                  className="web-cat-card"
                  style={{ "--cat-color": group.color, "--cat-bg": group.bg }}
                >

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
                        <span className="web-cat-sub">{group.items.length} Included Items</span>
                      </div>
                    </div>
                    <div className="web-cat-count-pill">{group.items.length}</div>
                  </div>

                  {/* Items Grid */}
                  <div className="web-cat-items-grid">
                    {displayItems.map((item, idx) => (
                      <div key={item.id || idx} className="web-item-pill">
                        <span className="web-item-check"><CheckCircle2 size={14} /></span>
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
            <div className="web-trust-grid">
              <div className="web-trust-card">
                <div className="web-trust-icon"><Award size={28} /></div>
                <span className="web-trust-label">Doctor Verified Report</span>
              </div>

              <div className="web-trust-card">
                <div className="web-trust-icon"><Stethoscope size={28} /></div>
                <span className="web-trust-label">Certified Laboratory</span>
              </div>

              <div className="web-trust-card">
                <div className="web-trust-icon"><Sparkles size={28} /></div>
                <span className="web-trust-label">Millions Happy Customer</span>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Sticky Booking Sidebar) ── */}
          <div>
            <div className="web-sticky-card">

              <div className="web-sticky-head">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <span className="web-sticky-head-label">Total Package Price</span>
                    <div className="web-sticky-price">
                      ₹{price.toLocaleString()}
                    </div>
                  </div>
                  {discount > 0 && (
                    <span className="web-discount-pill">{discount}% OFF</span>
                  )}
                </div>
              </div>

              <div className="web-sticky-body">
                <div className="web-bill">
                  <div className="web-bill-row">
                    <span>Package Fee</span>
                    <span>₹{price.toLocaleString()}</span>
                  </div>
                  <div className="web-bill-total">
                    <span>Amount Payable</span>
                    <span>₹{price.toLocaleString()}</span>
                  </div>
                </div>

                <button className="web-book-btn" onClick={handleBookClick}>
                  Book Health Package <ArrowRight size={18} />
                </button>

                <div className="web-perks">
                  <div className="web-perk">
                    <span className="web-perk-icon"><CheckCircle2 size={15} /></span>
                    <span><b>100% Certified Labs:</b> NABL & ISO Accredited</span>
                  </div>
                  <div className="web-perk">
                    <span className="web-perk-icon"><CheckCircle2 size={15} /></span>
                    <span><b>Free Phlebotomist:</b> Hygienic Home Collection</span>
                  </div>
                  <div className="web-perk">
                    <span className="web-perk-icon"><CheckCircle2 size={15} /></span>
                    <span><b>Doctor Review:</b> Free tele-consultation on report</span>
                  </div>
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
