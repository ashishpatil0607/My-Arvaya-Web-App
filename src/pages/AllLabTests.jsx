import { 
  Search, ChevronRight, ArrowLeft, FlaskConical, Clock, Heart, ShieldCheck, 
   Droplets, Beaker, Stethoscope, TestTube, MapPin, ArrowRight, X, Filter, Wallet
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getDiagnosticTests, getWalletAmount, createLabOrder, verifyLabPayment, loadRazorpayScript } from "../services/dataService";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import SelectSlotUI from "../components/doctors/SelectSlotUI";
import Modal from "../components/common/Modal";
import LabItemIcon from "../components/labs/LabItemIcon";

function toTitleCase(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .split(" ")
    .map(word => {
      if (word === "-" || word === "&" || word === "/") return word;
      if (word.startsWith("(") && word.endsWith(")")) {
        return "(" + word.slice(1, -1).toUpperCase() + ")";
      }
      if (["rft", "lft", "cbc", "tsh", "hba1c"].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function AllLabTests() {
  const go = useNavigate();
  const { setBookingType, setLabPackage, setLabVisitType, setDate, setSlot, setBookingId, globalLocation } = useBooking();
  const { user, openLoginModal } = useAuth();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [visitType, setVisitType] = useState("home");
  const [walletBalance, setWalletBalance] = useState(0);
  const [applyWallet, setApplyWallet] = useState(false);
  const [walletAppliedAmount, setWalletAppliedAmount] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isInitialMount = useRef(true);

  // Fetch tests from API and apply filter upon response
  const fetchTestsFromApi = (searchKeyword = "") => {
    setLoading(true);
    setAppliedQuery(searchKeyword);

    const payload = {
      pageSize: 300,
      search: searchKeyword,
      q: searchKeyword,
      filter: searchKeyword ? ` AND (service_name LIKE '%${searchKeyword}%' OR name LIKE '%${searchKeyword}%' OR profile_name LIKE '%${searchKeyword}%')` : ""
    };

    getDiagnosticTests(payload)
      .then((apiTests) => {
        if (Array.isArray(apiTests)) {
          const normalized = apiTests.map((t, idx) => {
            const rawTitle = t.service_name || t.name || t.title || t.test_name || `Lab Test ${idx + 1}`;
            const rawCategory = t.profile_name || t.category || t.test_category_name || t.department || "Fluid & Clinical Test";
            const priceVal = parseFloat(t.price || t.cost || t.amount || 150);

            return {
              id: t.id || t.service_key || `api-test-${idx}`,
              service_key: t.service_key,
              service_name: t.service_name || rawTitle,
              title: toTitleCase(rawTitle),
              rawTitle: String(rawTitle),
              category: rawCategory,
              price: priceVal,
              fasting: t.fasting || (t.fasting_required ? "Fasting Required" : "No Fasting Required"),
              reportTime: t.reportTime || t.report_time || "24 Hours",
              img: t.img || t.image || "/lab_test_sample.png"
            };
          });
          setTests(normalized);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("AllLabTests fetch error:", err);
        setLoading(false);
      });
  };

  // Initial fetch on page load
  useEffect(() => {
    fetchTestsFromApi("");
  }, []);

  // Trigger API and clear filter in UI when search bar input length becomes 0 (after backspace / clearing)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (q.trim().length === 0 && appliedQuery !== "") {
      fetchTestsFromApi("");
    }
  }, [q, appliedQuery]);

  // Extract unique profiles/categories for filter chips
  const profileList = useMemo(() => {
    const set = new Set();
    tests.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ["All", ...Array.from(set)];
  }, [tests]);

  // Filtered list applied in UI ONLY after API triggers
  const filteredTests = useMemo(() => {
    return tests.filter(item => {
      if (appliedQuery) {
        const queryLower = appliedQuery.toLowerCase();
        const matchQ = (item.title || "").toLowerCase().includes(queryLower) || 
                       (item.category || "").toLowerCase().includes(queryLower) ||
                       (item.rawTitle || "").toLowerCase().includes(queryLower);
        if (!matchQ) return false;
      }
      if (selectedProfile !== "All") {
        return (item.category || "").toLowerCase() === selectedProfile.toLowerCase();
      }
      return true;
    });
   }, [tests, appliedQuery, selectedProfile]);

   useEffect(() => {
     if (!selectedItem || !user) return;
     setLoadingWallet(true);
     setApplyWallet(false);
     setWalletAppliedAmount(0);
     const patientId = user?.id || user?.user_id || user?.patient_id || "";
     getWalletAmount(patientId)
       .then((res) => {
         let wData = Array.isArray(res) ? res[0] : res;
         if (typeof wData === 'number' || typeof wData === 'string') {
           setWalletBalance(parseFloat(wData) || 0);
         } else if (wData && typeof wData === 'object') {
           setWalletBalance(parseFloat(wData.total_amount || wData.balance || wData.amount || wData.wallet_balance || wData.wallet_amount || wData.walletBalance || wData.total || 0));
         }
       })
       .catch((err) => {
         console.error("Failed to fetch wallet balance:", err);
         setWalletBalance(0);
       })
       .finally(() => {
         setLoadingWallet(false);
       });
   }, [selectedItem, user]);

   const maxWalletApplicable = Math.min(walletBalance, selectedItem?.price || 0);

   useEffect(() => {
     if (applyWallet) {
       setWalletAppliedAmount(maxWalletApplicable);
     } else {
       setWalletAppliedAmount(0);
     }
   }, [applyWallet, maxWalletApplicable]);

   const handleWalletInputChange = (e) => {
     let val = parseFloat(e.target.value);
     if (isNaN(val)) val = 0;
     if (val > maxWalletApplicable) val = maxWalletApplicable;
     if (val < 0) val = 0;
     setWalletAppliedAmount(val);
   };

  const confirmBooking = async (slotData) => {
    if (!user) {
      openLoginModal("/confirmed");
      return;
    }
    setSubmitting(true);
    try {
      const patient_id = user?.id || user?.user_id || user?.patient_id || "";
      const entitylocation = globalLocation?.location_key || globalLocation?.entitylocation || globalLocation?.key || "location7";
      const registrationdate = (() => {
        const raw = user?.created_at || user?.registration_date || user?.registrationdate || new Date().toISOString();
        const d = new Date(raw);
        if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}${mm}${dd}`;
      })();

      const tests = [];
      if (selectedItem?.subitems && Array.isArray(selectedItem.subitems) && selectedItem.subitems.length > 0) {
        selectedItem.subitems.forEach(sub => {
          tests.push({
            key: sub.service_key || sub.id || sub.key,
            Name: sub.service_name || sub.name || sub.title
          });
        });
      } else {
        tests.push({
          key: selectedItem?.service_key || selectedItem?.id || selectedItem?.key,
          Name: selectedItem?.service_name || selectedItem?.name || selectedItem?.title
        });
      }

      const payload = {
        entitykey: "secure-hospitals",
        entitylocation: entitylocation,
        patient_id: patient_id,
        wallet_amount_used: applyWallet ? walletAppliedAmount : 0,
        patientInfo: {
          patientName: user?.name || "Guest",
          mobileNumber: user?.mobile_number || user?.mobile || user?.phone || "",
          registrationdate: registrationdate
        },
        drInfo: {
          drKey: "sh-dummy",
          drName: "Dummy",
          drSpeciality: ["Paediatrician"]
        },
        tests: tests
      };

      const result = await createLabOrder(payload);

      setBookingType("lab");
      setLabPackage(selectedItem);
      setLabVisitType(visitType);
      setDate(new Date(slotData.date));
      setSlot(slotData.time);
      setApplyWallet(false);
      setWalletAppliedAmount(0);

      const labPrice = selectedItem?.price || 0;
      const amountToPay = labPrice - (applyWallet ? walletAppliedAmount : 0);

      if (amountToPay <= 0) {
        const bookingId = result.order_id || result.bookingId || result.razorpay_order_id || "LAB" + Math.floor(Math.random() * 100000000);
        setBookingId(bookingId);
        go("/confirmed");
        return;
      }

      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you offline?");
        setSubmitting(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TeZHDSZsRNLvz7",
        amount: amountToPay * 100,
        currency: "INR",
        name: "Arvaya Healthcare",
        description: "Lab Test Booking",
        order_id: result.razorpay_order_id,
        handler: async function (response) {
          try {
            await verifyLabPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...payload
            });
            const bookingId = result.razorpay_order_id || result.bookingId || result.order_id || "LAB" + Math.floor(Math.random() * 100000000);
            setBookingId(bookingId);
            go("/confirmed");
          } catch (err) {
            console.error("Payment verification failed", err);
            alert("Payment verification failed. Please contact support.");
            setSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || "Guest",
          contact: user?.mobile || user?.phone || "",
        },
        theme: {
          color: "#2e666e",
        },
        modal: {
          ondismiss: function() {
            setSubmitting(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error("Lab booking failed:", err);
      if (err.status === 409) {
        alert(err.message || "Slot already booked");
      } else {
        alert("Booking failed. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <main className="page page-enter" style={{ padding: 0, background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '100vh' }}>
      
      {/* Styles */}
      <style>{`
        .all-tests-hero {
          background: #ffffff;
          border-bottom: 1px solid var(--border);
          padding: 24px 0 28px 0;
        }

        .all-tests-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(18, 51, 58, 0.05);
          position: relative;
        }

        .all-tests-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 32px rgba(18, 51, 58, 0.12);
          border-color: var(--primary-soft);
        }

        .all-tests-card-img-container {
          height: 146px;
          width: 100%;
          display: grid;
          place-items: end center;
          padding: 47px 14px 14px;
          box-sizing: border-box;
          background: #f0f7f7;
          overflow: hidden;
          position: relative;
        }

        .all-tests-card-visual {
          position: relative;
          z-index: 1;
          display: grid;
          width: 76px;
          height: 76px;
          place-items: center;
          color: #087b73;
          background: linear-gradient(160deg, #ffffff 0%, #f2fbf8 100%);
          border: 1px solid #ffffff;
          border-radius: 24px;
          box-shadow:
            0 12px 24px rgba(5, 73, 78, 0.13),
            0 0 0 6px rgba(255, 255, 255, 0.45);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .all-tests-card:hover .all-tests-card-visual {
          transform: translateY(-3px) scale(1.06) rotate(-3deg);
        }

        .all-tests-card-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(4px);
          color: var(--primary-dark);
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 12px;
          border: 1px solid rgba(46, 102, 110, 0.2);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .all-tests-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .all-tests-card-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-weight: 700;
          font-size: 15px;
          line-height: 1.35;
          color: #12333A;
          margin-bottom: 6px;
          min-height: 40px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .all-tests-card-sub {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--primary);
          background: #f0f7f7;
          padding: 4px 10px;
          border-radius: 10px;
          width: fit-content;
          margin-bottom: 16px;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .all-tests-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px dashed var(--border);
        }

        .all-tests-card-price-col {
          display: flex;
          flex-direction: column;
        }

        .all-tests-card-price-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .all-tests-card-price {
          font-weight: 800;
          font-size: 18px;
          color: #12333A;
          line-height: 1.1;
        }

        .all-tests-card-btn {
          background: #1b4d54;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 6px rgba(27, 77, 84, 0.2);
        }

        .all-tests-card-btn:hover {
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(46, 102, 110, 0.35);
          transform: translateY(-1px);
        }

        .all-tests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 20px;
        }

        /* ── Match Labs page card styling ── */
        .all-tests-card {
          background: linear-gradient(180deg, #ffffff 60%, #fbfefd 100%);
          border: 1px solid rgba(8, 120, 125, 0.14);
          border-radius: 22px;
          box-shadow: 0 11px 28px rgba(5, 73, 78, 0.08);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .all-tests-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          z-index: 3;
          height: 4px;
          background: linear-gradient(90deg, #087b73, #2bc4a6, #087b73);
          background-size: 200% 100%;
          transition: background-position 0.6s ease;
        }

        .all-tests-card:hover {
          transform: translateY(-6px);
          border-color: rgba(8, 120, 125, 0.32);
          box-shadow: 0 22px 40px -10px rgba(5, 73, 78, 0.22), 0 6px 14px rgba(5, 73, 78, 0.06);
        }

        .all-tests-card:hover::before {
          background-position: 100% 0;
        }

        /* Decorative rings behind the icon */
        .all-tests-card-img-container::before,
        .all-tests-card-img-container::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        .all-tests-card-img-container::before {
          width: 150px;
          height: 150px;
          right: -55px;
          top: -60px;
          border: 1px solid rgba(8, 123, 115, 0.12);
          background: radial-gradient(circle, rgba(52, 211, 180, 0.12), transparent 70%);
        }

        .all-tests-card-img-container::after {
          width: 90px;
          height: 90px;
          left: -35px;
          bottom: -45px;
          border: 1px solid rgba(8, 123, 115, 0.1);
        }

        .all-tests-card-visual {
          box-shadow:
            0 12px 24px rgba(5, 73, 78, 0.13),
            0 0 0 6px rgba(255, 255, 255, 0.45),
            inset 0 -3px 0 rgba(8, 123, 115, 0.06);
        }

        .all-tests-card-tag {
          top: 15px;
          left: 13px;
          z-index: 4;
          gap: 5px;
          padding: 5px 8px;
          color: #087b73;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(8, 123, 115, 0.22);
          border-radius: 9px;
          box-shadow: 0 6px 14px rgba(5, 73, 78, 0.08), inset 0 1px 0 #fff;
          font-size: 9.5px;
          font-weight: 800;
        }

        .all-tests-card-title {
          font-family: var(--font-display);
          font-size: 13.5px;
          font-weight: 800;
          min-height: 37px;
          transition: color 0.2s ease;
        }

        .all-tests-card:hover .all-tests-card-title {
          color: #087b73;
        }

        .all-tests-card-sub {
          color: #087b73;
          background: linear-gradient(90deg, #e8f6f3, #f2faf8);
          border: 1px solid rgba(8, 123, 115, 0.14);
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 750;
        }

        .all-tests-card-footer {
          padding-top: 11px;
          border-top: 1px dashed color-mix(in srgb, #087b73 22%, #dce8e7);
        }

        .all-tests-card-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 35px;
          justify-content: center;
          border-radius: 11px;
          background: linear-gradient(135deg, #0b8f84 0%, #087b73 50%, #0a5a5c 100%);
          box-shadow: 0 8px 18px rgba(8, 123, 115, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .all-tests-card-btn::after {
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

        .all-tests-card-btn svg {
          transition: transform 0.2s ease;
        }

        .all-tests-card-btn:hover {
          background: linear-gradient(135deg, #0b8f84 0%, #087b73 50%, #0a5a5c 100%);
          box-shadow: 0 12px 22px rgba(8, 123, 115, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .all-tests-card-btn:hover::after {
          left: 130%;
        }

        .all-tests-card-btn:hover svg {
          transform: translateX(3px);
        }

        @media (prefers-reduced-motion: reduce) {
          .all-tests-card,
          .all-tests-card-visual,
          .all-tests-card-btn::after {
            transition: none;
          }
        }

        @media (max-width: 768px) {
          .all-tests-hero {
            padding: 16px 0 20px 0;
          }
          .all-tests-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .all-tests-card-body {
            padding: 12px;
          }
          .all-tests-card-title {
            font-size: 13.5px;
            min-height: 34px;
          }
          .all-tests-card-sub {
            font-size: 10.5px;
            padding: 3px 8px;
            margin-bottom: 10px;
          }
          .all-tests-card-price {
            font-size: 16px;
          }
          .all-tests-card-btn {
            padding: 6px 11px;
            font-size: 11.5px;
            border-radius: 16px;
            white-space: nowrap;
          }
        }

        @media (max-width: 440px) {
          .all-tests-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .all-tests-card-img-container {
            height: 118px;
            padding: 38px 10px 10px;
          }
          .all-tests-card-visual {
            width: 62px;
            height: 62px;
            border-radius: 20px;
          }
          .all-tests-card-visual svg {
            width: 34px;
            height: 34px;
          }
          .all-tests-card-body {
            padding: 10px 8px;
          }
          .all-tests-card-title {
            font-size: 12.5px;
            line-height: 1.25;
            min-height: 32px;
          }
        }
      `}</style>

      {/* Hero / Header Section */}
      <div className="all-tests-hero">
        <div className="container">
          
          {/* Top Breadcrumb & Back */}
          <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="app-breadcrumbs">
              <Link to="/">Home</Link> 
              <ChevronRight size={12} /> 
              <Link to="/labs">Lab Tests</Link> 
              <ChevronRight size={12} /> 
              <span>All Lab Tests</span>
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
            All Diagnostic Lab Tests
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
            Showing NABL & ISO certified individual diagnostic lab tests with doorstep phlebotomist collection.
          </p>

          {/* Search Bar & Profile Filters */}
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
                  fetchTestsFromApi(q.trim()); 
                }} 
                style={{ flex: 1, display: 'flex', alignItems: 'center' }}
              >
                <input
                  placeholder="Search by test name, profile (e.g. Creatinine, Bilirubin, Uric Acid)..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchTestsFromApi(q.trim());
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
                    fetchTestsFromApi("");
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
            Showing {filteredTests.length} {filteredTests.length === 1 ? 'Lab Test' : 'Lab Tests'}
          </span>
        </div>

        {loading ? (
          <div className="all-tests-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="all-tests-card" style={{ height: '280px' }}>
                <div className="skeleton" style={{ height: '120px' }} />
                <div style={{ padding: '16px' }}>
                  <div className="skeleton skeleton-title" style={{ width: '80%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTests.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FlaskConical size={48} style={{ opacity: 0.25, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>No lab tests found</h3>
            <p>Try searching for a different test name or clearing your filter.</p>
          </div>
        ) : (
          <div className="all-tests-grid">
            {filteredTests.map((test) => (
              <div className="all-tests-card" key={test.id}>
                <div className="all-tests-card-img-container">
                  <div className="all-tests-card-visual"><LabItemIcon item={test} size={43} /></div>
                  <span className="all-tests-card-tag"><TestTube size={10} /> Certified</span>
                </div>
                <div className="all-tests-card-body">
                  <div className="all-tests-card-title">{test.title}</div>
                  <div className="all-tests-card-sub">{toTitleCase(test.category)}</div>
                  <div className="all-tests-card-footer">
                    <button className="all-tests-card-btn" onClick={() => setSelectedItem(test)}>
                      More Details <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => { setSelectedItem(null); setApplyWallet(false); setWalletAppliedAmount(0); }}
        title="Schedule Lab Test"
        maxWidth="680px"
      >
        {selectedItem && (
          <div style={{ marginBottom: "24px", padding: '18px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{selectedItem.title}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedItem.category}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>₹{selectedItem.price.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                <Clock size={14} color="var(--primary)" /> <b>Report Delivery:</b> {selectedItem.reportTime || "24 Hours"}
              </div>
              <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                <ShieldCheck size={14} color="#16a34a" /> <b>Fasting:</b> {selectedItem.fasting || "No Fasting Required"}
              </div>
            </div>
          </div>
         )}

         {!loadingWallet && walletBalance > 0 && (
           <div style={{ marginBottom: "24px", background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ background: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '50%' }}>
                   <Wallet size={20} />
                 </div>
                 <div>
                   <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Wallet Balance</h3>
                   <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Available to redeem</span>
                 </div>
               </div>
               <b style={{ color: '#16a34a', fontSize: '18px' }}>₹{walletBalance}</b>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
               <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>Apply wallet balance</span>
               <div 
                 onClick={() => { if(walletBalance > 0) setApplyWallet(!applyWallet) }}
                 style={{
                   width: '40px',
                   height: '22px',
                   borderRadius: '11px',
                   background: applyWallet ? '#114c54' : '#e5e7eb',
                   position: 'relative',
                   cursor: walletBalance > 0 ? 'pointer' : 'not-allowed',
                   opacity: walletBalance > 0 ? 1 : 0.5,
                   transition: 'background 0.3s'
                 }}
               >
                 <div style={{
                   width: '18px',
                   height: '18px',
                   borderRadius: '50%',
                   background: '#fff',
                   position: 'absolute',
                   top: '2px',
                   left: applyWallet ? '20px' : '2px',
                   transition: 'left 0.3s',
                   boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                 }} />
               </div>
             </div>

             {applyWallet && (
               <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '600' }}>
                   <span>₹</span>
                   <input 
                     type="number" 
                     value={walletAppliedAmount} 
                     onChange={handleWalletInputChange}
                     style={{ background: 'transparent', border: 'none', outline: 'none', width: '80px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}
                   />
                 </div>
                 <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>Max ₹{maxWalletApplicable}</span>
               </div>
             )}
           </div>
         )}

         {loadingWallet && (
           <div style={{ marginBottom: "24px", textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
             <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--primary)', border: '2px solid rgba(0,0,0,0.1)', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}></div>
             Loading wallet balance...
           </div>
         )}

         <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "12px" }}>
            Select Collection Preference
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
              <input type="radio" name="labVisitType" value="home" checked={visitType === 'home'} onChange={() => setVisitType('home')} style={{ display: 'none' }} />
              <div>
                <b style={{ display: 'block', color: visitType === 'home' ? 'var(--primary-dark)' : 'var(--text-main)', marginBottom: '4px', fontSize: '14px' }}>
                  🏡 Home Sample Collection
                </b>
                <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, display: 'block' }}>A certified phlebotomist visits your doorstep.</small>
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
              <input type="radio" name="labVisitType" value="lab" checked={visitType === 'lab'} onChange={() => setVisitType('lab')} style={{ display: 'none' }} />
              <div>
                <b style={{ display: 'block', color: visitType === 'lab' ? 'var(--primary-dark)' : 'var(--text-main)', marginBottom: '4px', fontSize: '14px' }}>
                  🏥 Diagnostic Center Visit
                </b>
                <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, display: 'block' }}>Walk-in to your nearest accredited partner lab.</small>
              </div>
            </label>
          </div>
        </div>

        <SelectSlotUI onConfirm={confirmBooking} type="lab" submitting={submitting} />
      </Modal>

    </main>
  );
}
