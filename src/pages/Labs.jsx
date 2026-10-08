import { 
  Search, ChevronRight, ChevronLeft, Activity, FlaskConical, Clock, Heart, ShieldCheck, 
  Sparkles, Droplets, Bone, Brain, Baby, Eye, Ribbon, Flame, Wind, Pill, Syringe, 
  Scissors, Apple, Zap, Users, Dumbbell, Beaker, Microscope, TestTube, Stethoscope, 
  CalendarDays, MapPin, ArrowRight, CheckCircle2, Filter, X, Wallet, Home, Building2
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getLabPackages, getDiagnosticTests, getDiagnosticPackages, getAppointments, getLabOrderHistory, createLabOrder, verifyLabPayment, loadRazorpayScript, getWalletAmount } from "../services/dataService";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import { packages as defaultPackages } from "../mocks/data";
import SelectSlotUI from "../components/doctors/SelectSlotUI";
import Modal from "../components/common/Modal";
import LabItemIcon from "../components/labs/LabItemIcon";

/* ─── Mock Individual Lab Tests Data ─── */
const mockLabTests = [
  {
    id: "lt-1",
    title: "BILIRUBIN DIRECT",
    category: "Fluid Bilirubin",
    department: "Liver Care",
    price: 150,
    oldPrice: 250,
    discount: "40% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-2",
    title: "BILIRUBIN INDIRECT",
    category: "Fluid Bilirubin",
    department: "Liver Care",
    price: 150,
    oldPrice: 250,
    discount: "40% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: false
  },
  {
    id: "lt-3",
    title: "BLOOD SUGAR FASTING",
    category: "Renal & Metabolic Function",
    department: "Diabetes",
    price: 100,
    oldPrice: 180,
    discount: "44% OFF",
    fasting: "8-10 Hrs Fasting",
    reportTime: "12 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-4",
    title: "COMPLETE BLOOD COUNT (CBC)",
    category: "Hematology Profile",
    department: "Blood",
    price: 299,
    oldPrice: 500,
    discount: "40% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-5",
    title: "THYROID STIMULATING HORMONE (TSH)",
    category: "Endocrine Profile",
    department: "Thyroid",
    price: 220,
    oldPrice: 400,
    discount: "45% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-6",
    title: "LIPID PROFILE TOTAL",
    category: "Cardiac Risk Panel",
    department: "Heart",
    price: 499,
    oldPrice: 900,
    discount: "44% OFF",
    fasting: "10-12 Hrs Fasting",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: false
  },
  {
    id: "lt-7",
    title: "HbA1c GLYCATED HEMOGLOBIN",
    category: "3-Month Diabetes Monitor",
    department: "Diabetes",
    price: 350,
    oldPrice: 600,
    discount: "41% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-8",
    title: "VITAMIN D3 (25-OH)",
    category: "Bone & Immune Health",
    department: "Vitamins",
    price: 599,
    oldPrice: 1200,
    discount: "50% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: false
  }
];

/* ─── Mock Health Packages ─── */
const mockHealthPackages = [
  {
    id: "pkg-1",
    title: "Ortho Robotics Package",
    category: "Bone & Joint Advanced",
    tests: "45+ Tests Included",
    price: 197380,
    oldPrice: 225000,
    discount: "12% OFF",
    fasting: "Fasting Required",
    reportTime: "24 Hours",
    img: "/images/full-body-checkup.png",
    badge: "Specialized"
  },
  {
    id: "pkg-2",
    title: "Paediatric Surgery 3A.S14.17143",
    category: "Child Health & Pre-Surgery",
    tests: "30+ Tests Included",
    price: 40000,
    oldPrice: 50000,
    discount: "20% OFF",
    fasting: "Fasting Required",
    reportTime: "24 Hours",
    img: "/images/thyroid-profile.png",
    badge: "Clinical"
  },
  {
    id: "pkg-3",
    title: "Comprehensive Full Body Checkup",
    category: "Complete Preventive Care",
    tests: "80+ Tests Included",
    price: 1499,
    oldPrice: 2300,
    discount: "35% OFF",
    fasting: "10-12 Hrs Fasting",
    reportTime: "24 Hours",
    img: "/images/full-body-checkup.png",
    badge: "Most Booked"
  },
  {
    id: "pkg-4",
    title: "Senior Citizen Diabetes & Cardiac Care",
    category: "Geriatric Special",
    tests: "55+ Tests Included",
    price: 799,
    oldPrice: 1200,
    discount: "33% OFF",
    fasting: "10-12 Hrs Fasting",
    reportTime: "24 Hours",
    img: "/images/diabetes.png",
    badge: "Popular for Seniors"
  },
  {
    id: "pkg-5",
    title: "Advanced Cardiac Health Profile",
    category: "Heart & Vascular Risk",
    tests: "40+ Tests Included",
    price: 1199,
    oldPrice: 1800,
    discount: "33% OFF",
    fasting: "Fasting Required",
    reportTime: "24 Hours",
    img: "/images/heart-health.png",
    badge: "Doctor Verified"
  }
];

const categoriesFilterList = [
  { name: "All", icon: <FlaskConical size={16} /> },
  { name: "Diabetes", icon: <Droplets size={16} /> },
  { name: "Liver Care", icon: <Beaker size={16} /> },
  { name: "Heart", icon: <Heart size={16} /> },
  { name: "Thyroid", icon: <Activity size={16} /> },
  { name: "Blood", icon: <Droplets size={16} /> },
  { name: "Vitamins", icon: <Apple size={16} /> },
  { name: "Full Body", icon: <Stethoscope size={16} /> }
];

// Picks an accent colour for an order card (icon comes from LabItemIcon, same as Orders page) based on keywords in the test name
const orderIconRules = [
  { match: /hba1c|glucose|sugar|diabet|insulin|glycosylated/, Icon: Droplets, color: "#E11D48" },
  { match: /lipid|cholesterol|triglycer|cardiac|troponin|heart|hdl|ldl/, Icon: Heart, color: "#DB2777" },
  { match: /thyroid|\btsh\b|\bt3\b|\bt4\b/, Icon: Activity, color: "#7C3AED" },
  { match: /liver|\blft\b|bilirubin|sgot|sgpt|\balt\b|\bast\b|albumin|globulin|protein/, Icon: Beaker, color: "#D97706" },
  { match: /kidney|\bkft\b|renal|creatinine|urea|uric|urine/, Icon: FlaskConical, color: "#0891B2" },
  { match: /vitamin|\bb12\b|\bd3\b|\biron\b|ferritin|calcium/, Icon: Apple, color: "#16A34A" },
  { match: /bone|joint|arthritis/, Icon: Bone, color: "#64748B" },
  { match: /\bcbc\b|blood count|hemoglobin|haemoglobin|platelet|\besr\b/, Icon: Droplets, color: "#DC2626" },
  { match: /pregnan|\bhcg\b|fertility|\bamh\b|prolactin/, Icon: Baby, color: "#EC4899" },
  { match: /cancer|tumou?r|\bpsa\b|\bcea\b|\bca[- ]?125\b/, Icon: Ribbon, color: "#9333EA" },
  { match: /covid|allergy|lung|respirat/, Icon: Wind, color: "#0EA5E9" },
  { match: /full body|package|checkup|profile/, Icon: Stethoscope, color: "#2563EB" },
];

const getOrderIcon = (name) => {
  const text = String(name || "").toLowerCase();
  return orderIconRules.find((r) => r.match.test(text)) || { Icon: TestTube, color: "var(--primary)" };
};

const mockLabAppointments = [
  { id: 1, date: "June 27, 2026", status: "Upcoming", name: "Complete Blood Count", lab: "LifeCare Diagnostics", time: "10:30 AM" },
  { id: 2, date: "July 5, 2026", status: "Upcoming", name: "Thyroid Profile", lab: "MediTest Labs", time: "2:15 PM" },
  { id: 3, date: "July 12, 2026", status: "Scheduled", name: "Lipid Profile", lab: "PathCare Labs", time: "9:00 AM" },
  { id: 4, date: "July 20, 2026", status: "Upcoming", name: "Vitamin D & B12 Panel", lab: "HealthFirst Labs", time: "11:00 AM" },
];

export default function Labs({ forceModalOpen = false }) {
  const go = useNavigate();
  const { setBookingType, setLabPackage, setLabVisitType, setDate, setSlot, setBookingId, globalLocation } = useBooking();
  const { user, openLoginModal } = useAuth();

  const [q, setQ] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [visitType, setVisitType] = useState("home");
  const [showAllTests, setShowAllTests] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [applyWallet, setApplyWallet] = useState(false);
  const [walletAppliedAmount, setWalletAppliedAmount] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Dynamic state populated by APIs
  const [labTests, setLabTests] = useState(mockLabTests.slice(0, 8));
  const [healthPackages, setHealthPackages] = useState(mockHealthPackages.slice(0, 5));
  const [appointments, setAppointments] = useState([]);

  // Scroll refs for carousels
  const testsScrollRef = useRef(null);
  const packagesScrollRef = useRef(null);
  const apptsScrollRef = useRef(null);

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

  // Fetch API data on mount / clicking Lab Tests
  useEffect(() => {
    let isMounted = true;

    // Trigger API 1: /api/diagnostic/getTests
    getDiagnosticTests({ pageSize: 12 })
      .then((apiTests) => {
        if (!isMounted) return;
        if (Array.isArray(apiTests) && apiTests.length > 0) {
          const normalized = apiTests.map((t, idx) => {
            let rawTitle = t.service_name || t.name || t.title || t.test_name || `Lab Test ${idx+1}`;
            if (rawTitle.includes('-')) rawTitle = rawTitle.split('-')[0].trim();
            const rawCategory = t.profile_name || t.category || t.test_category_name || t.department || "Fluid & Clinical Test";
            const priceVal = parseFloat(t.price || t.cost || t.amount || 150);
            const oldPriceVal = Math.round(priceVal * 1.4);

            return {
              id: t.id || t.service_key || `api-test-${idx}`,
              service_key: t.service_key,
              service_name: t.service_name || rawTitle,
              title: toTitleCase(rawTitle),
              category: rawCategory,
              department: rawCategory,
              price: priceVal,
              oldPrice: oldPriceVal,
              discount: `${Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100)}% OFF`,
              fasting: t.fasting || (t.fasting_required ? "Fasting Required" : "No Fasting Required"),
              reportTime: t.reportTime || t.report_time || "24 Hours",
              img: t.img || t.image || "/lab_test_sample.png",
              popular: idx % 2 === 0
            };
          });
          // Display exact 1st 8 Lab Tests from /api/diagnostic/getTests
          setLabTests(normalized.slice(0, 8));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch /api/diagnostic/getTests:", err);
      });

    // Trigger API 2: /api/diagnostic/getPackages
    getDiagnosticPackages({ pageSize: 10 })
      .then((apiPkgs) => {
        if (!isMounted) return;
        if (Array.isArray(apiPkgs) && apiPkgs.length > 0) {
          const normalized = apiPkgs.map((p, idx) => {
            let rawTitle = p.package_name || p.name || p.title || `Health Package ${idx+1}`;
            if (rawTitle.includes('-')) rawTitle = rawTitle.split('-')[0].trim();
            const priceVal = parseFloat(p.package_price || p.price || p.cost || p.amount || 999);
            const oldPriceVal = Math.round(priceVal * 1.25);
            const itemCount = Array.isArray(p.subitems) && p.subitems.length > 0 
              ? `${p.subitems.length}+ Tests Included` 
              : "30+ Tests Included";

            return {
              id: p.rateplan_package_id || p.id || p.package_key || `api-pkg-${idx}`,
              title: rawTitle,
              category: p.category || p.package_category || "Comprehensive Health Care",
              tests: itemCount,
              subitems: Array.isArray(p.subitems) ? p.subitems : [],
              price: priceVal,
              oldPrice: oldPriceVal,
              discount: `${Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100)}% OFF`,
              fasting: p.fasting || (p.fasting_required ? "Fasting Required" : "10-12 Hrs Fasting"),
              reportTime: p.reportTime || p.report_time || "24 Hours",
              img: p.img || p.image || (rawTitle.toLowerCase().includes("diabet") ? "/images/diabetes.png" : rawTitle.toLowerCase().includes("heart") ? "/images/heart-health.png" : rawTitle.toLowerCase().includes("thyroid") ? "/images/thyroid-profile.png" : "/images/full-body-checkup.png"),
              badge: p.badge || (idx === 0 ? "Most Booked" : idx === 1 ? "Popular" : "Doctor Verified")
            };
          });
          // Display 5 Packages
          setHealthPackages(normalized.slice(0, 5));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch /api/diagnostic/getPackages:", err);
      });

    // Trigger API 3: /api/lims/laborder/history
    const patientId = user?.id || user?.user_id || user?.patient_id || "";
    getLabOrderHistory(patientId)
      .then((apiOrders) => {
        if (!isMounted) return;
        if (Array.isArray(apiOrders) && apiOrders.length > 0) {
          const normalized = apiOrders.map((order, idx) => {
            const rawDate = order.order_date || order.created_at || order.created_on || order.date || order.orderDate;
            let dateStr = "Recent";
            let timeStr = "";
            if (rawDate) {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              } else if (typeof rawDate === 'string') {
                dateStr = rawDate;
              }
            }
            const rawStatus = (order.order_status || order.status || "Processing");
            const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

            return {
              id: order.order_id || order.lab_order_id || order.id || `order-${idx}`,
              date: dateStr,
              time: timeStr,
              status: formattedStatus,
              name: order.test_names || order.tests || order.items || order.test_category_name || `Lab Test ${idx + 1}`,
              lab: order.lab_name || order.center_name || order.lab || order.hospital_name || "Arvaya Health Lab"
            };
          });

          setAppointments(normalized.slice(0, 4));
        } else {
          setAppointments([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch /api/lims/laborder/history:", err);
        setAppointments([]);
      });

    return () => { isMounted = false; };
  }, []);

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

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Filtered Lab Tests
  const filteredTests = useMemo(() => {
    return (labTests || []).filter(item => {
      const matchQ = (item.title || "").toLowerCase().includes(q.toLowerCase()) || 
                     (item.category || "").toLowerCase().includes(q.toLowerCase()) ||
                     (item.department || "").toLowerCase().includes(q.toLowerCase());
      if (!matchQ) return false;
      if (selectedFilter !== "All") {
        return (item.department || "").toLowerCase().includes(selectedFilter.toLowerCase()) ||
               (item.category || "").toLowerCase().includes(selectedFilter.toLowerCase());
      }
      return true;
    });
  }, [labTests, q, selectedFilter]);

  // Filtered Packages
  const filteredPackages = useMemo(() => {
    return (healthPackages || []).filter(item => {
      const matchQ = (item.title || "").toLowerCase().includes(q.toLowerCase()) || 
                     (item.category || "").toLowerCase().includes(q.toLowerCase());
      if (!matchQ) return false;
      if (selectedFilter !== "All") {
        return (item.title || "").toLowerCase().includes(selectedFilter.toLowerCase()) ||
               (item.category || "").toLowerCase().includes(selectedFilter.toLowerCase());
      }
      return true;
    });
  }, [healthPackages, q, selectedFilter]);

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
    <main className="page page-enter labs-page" style={{ padding: 0, color: 'var(--text-main)' }}>
      
      {/* Embedded Responsive Styling for Lab UI */}
      <style>{`
        .lab-container-custom {
          padding: 32px 16px 40px 16px;
        }

        .lab-hero-banner {
          background: linear-gradient(135deg, #eef8f6 0%, #e0f2f0 55%, #d8eae7 100%);
          border-radius: 24px;
          margin-top: 12px;
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(46, 102, 110, 0.08);
          border: 1px solid rgba(46, 102, 110, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 24px;
        }

        .lab-hero-content {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          max-width: 600px;
        }

        .lab-hero-icon {
          display: flex;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          color: var(--primary-dark);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 24px rgba(0, 60, 55, 0.2);
          transform: rotate(-6deg);
        }

        .lab-hero-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: #0d5c63;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(4px);
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid rgba(13, 92, 99, 0.18);
          margin-bottom: 12px;
        }

        .lab-hero-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-weight: 800;
          font-size: 24px;
          line-height: 1.25;
          color: #12333A;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .lab-hero-subtitle {
          font-size: 13.5px;
          color: #3b6066;
          margin: 0 0 16px 0;
          font-weight: 500;
          line-height: 1.4;
        }

        .lab-hero-search-wrapper {
          background: #ffffff;
          border: 1.5px solid rgba(46, 102, 110, 0.22);
          border-radius: 16px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
          margin-bottom: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .lab-hero-search-wrapper:focus-within {
          border-color: var(--primary);
          box-shadow: 0 4px 16px rgba(46, 102, 110, 0.15);
        }

        .lab-hero-search-input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 13.5px;
          color: var(--text-main);
          font-weight: 500;
        }

        .lab-hero-search-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 2px;
          display: flex;
          align-items: center;
        }

        .lab-hero-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .lab-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: #12333a;
          background: #ffffff;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid rgba(46, 102, 110, 0.14);
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          white-space: nowrap;
        }

        .lab-hero-img-col {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .lab-hero-img-card {
          position: relative;
          background: #ffffff;
          padding: 12px;
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .lab-hero-img {
          width: 135px;
          height: auto;
          object-fit: contain;
        }

        .lab-hero-stat-badge {
          position: absolute;
          bottom: -10px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 4px 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          white-space: nowrap;
        }

        .lab-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .lab-section-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-size: 20px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
        }

        .lab-view-all-btn {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary);
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s, transform 0.2s;
        }

        .lab-view-all-btn:hover {
          color: var(--primary-dark);
          transform: translateX(2px);
        }

        /* Scroll Rows with Navigation Arrows */
        .lab-scroll-wrapper {
          position: relative;
        }

        .lab-scroll-row {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 8px 4px 16px 4px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
        }

        .lab-scroll-row::-webkit-scrollbar {
          display: none;
        }

        .lab-scroll-row > * {
          scroll-snap-align: start;
          flex-shrink: 0;
        }

        .lab-scroll-arrow {
          position: absolute;
          top: 45%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-main);
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s;
        }

        .lab-scroll-arrow:hover {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          transform: translateY(-50%) scale(1.08);
        }

        .lab-scroll-arrow.left { left: -14px; }
        .lab-scroll-arrow.right { right: -14px; }

        /* Card Styles: Lab Test */
        .lab-card {
          width: 250px;
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

        .lab-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 32px rgba(18, 51, 58, 0.12);
          border-color: var(--primary-soft);
        }

        .lab-card-img-container {
          height: 120px;
          width: 100%;
          background: #f0f7f7;
          overflow: hidden;
          position: relative;
        }

        .lab-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s;
        }

        .lab-card:hover .lab-card-img {
          transform: scale(1.06);
        }

        .lab-card-tag {
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

        .lab-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .lab-card-title {
          font-family: 'Plus Jakarta Sans', var(--font-sans);
          font-weight: 700;
          font-size: 14.5px;
          line-height: 1.35;
          color: #12333A;
          margin-bottom: 6px;
          min-height: 25px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lab-card-sub {
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
          margin-bottom: 14px;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lab-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px dashed var(--border);
          gap: 6px;
        }

        .lab-card-price-col {
          display: flex;
          flex-direction: column;
        }

        .lab-card-price-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .lab-card-price {
          font-weight: 800;
          font-size: 18px;
          color: #12333A;
          line-height: 1.1;
        }

        .lab-card-btn {
          background: #1b4d54;
          color: #ffffff;
          border: none;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 2px 6px rgba(27, 77, 84, 0.2);
        }

        .lab-card-btn:hover {
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(46, 102, 110, 0.35);
          transform: translateY(-1px);
        }

        /* Package Card */
        .pkg-card {
          width: 280px;
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(18, 51, 58, 0.04);
          position: relative;
        }

        .pkg-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(18, 51, 58, 0.1);
          border-color: var(--primary-soft);
        }

        .pkg-card-img-container {
          height: 135px;
          width: 100%;
          background: #f0f7f7;
          overflow: hidden;
          position: relative;
        }

        .pkg-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: var(--primary);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .pkg-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .pkg-card-title {
          font-weight: 800;
          font-size: 15px;
          line-height: 1.3;
          color: var(--text-main);
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 40px;
        }

        .pkg-card-tests-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #16a34a;
          background: #dcfce7;
          padding: 3px 8px;
          border-radius: 6px;
          width: fit-content;
          margin-bottom: 12px;
        }

        .pkg-card-btn {
          width: 100%;
          background: #1b4d54;
          color: #ffffff;
          border: none;
          padding: 10px 14px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }

        .pkg-card-btn:hover {
          background: var(--primary);
        }

        .lab-grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .pkg-grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .lab-appointments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        /* ── MEDIA QUERIES FOR FULL RESPONSIVENESS ── */

        /* Tablets & Laptops (641px to 1024px) */
        @media (max-width: 1024px) {
          .lab-container-custom {
            padding: 24px 16px 48px 16px;
          }
          .lab-hero-banner {
            padding: 20px 22px;
          }
          .lab-hero-title {
            font-size: 19px;
          }
          .lab-card {
            width: 225px;
          }
          .pkg-card {
            width: 250px;
          }
          .lab-scroll-arrow.left { left: -4px; }
          .lab-scroll-arrow.right { right: -4px; }
        }

        /* Mobile Devices (320px to 640px) */
        @media (max-width: 640px) {
          .lab-container-custom {
            padding: 16px 12px 36px 12px;
          }
          .lab-hero-banner {
            flex-direction: column;
            padding: 20px 16px;
            border-radius: 20px;
            margin-top: 6px;
            margin-bottom: 20px;
            gap: 14px;
            text-align: left;
            align-items: flex-start;
          }
          .lab-hero-content {
            width: 100%;
            max-width: 100%;
          }
          .lab-hero-pill-tag {
            font-size: 11px;
            padding: 3px 10px;
            margin-bottom: 8px;
          }
          .lab-hero-title {
            font-size: 19px;
            line-height: 1.3;
            margin-bottom: 6px;
            text-align: left;
          }
          .lab-hero-subtitle {
            font-size: 12.5px;
            margin-bottom: 14px;
          }
          .lab-hero-search-wrapper {
            padding: 8px 12px;
            margin-bottom: 14px;
            border-radius: 14px;
          }
          .lab-hero-search-input {
            font-size: 13px;
          }
          .lab-hero-badges {
            gap: 6px;
            justify-content: flex-start;
          }
          .lab-hero-badge {
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 16px;
          }
          .lab-hero-img-col {
            display: none;
          }
          .lab-section-header {
            margin-bottom: 12px;
          }
          .lab-section-title {
            font-size: 17px;
          }
          .lab-view-all-btn {
            font-size: 12.5px;
          }
          .lab-scroll-arrow {
            display: none;
          }
          .lab-scroll-row {
            gap: 12px;
            padding: 4px 2px 12px 2px;
          }
          .lab-card {
            width: 205px;
            border-radius: 16px;
          }
          .lab-card-img-container {
            height: 110px;
          }
          .lab-card-body {
            padding: 12px;
          }
          .lab-card-title {
            font-size: 13.5px;
            min-height: 34px;
            margin-bottom: 4px;
          }
          .lab-card-sub {
            font-size: 10.5px;
            padding: 3px 8px;
            margin-bottom: 10px;
          }
          .lab-card-footer {
            padding-top: 8px;
          }
          .lab-card-price {
            font-size: 16px;
          }
          .lab-card-btn {
            padding: 6px 11px;
            font-size: 11.5px;
            border-radius: 16px;
          }
          .pkg-card {
            width: 235px;
            border-radius: 16px;
          }
          .pkg-card-img-container {
            height: 120px;
          }
          .pkg-card-body {
            padding: 12px 14px;
          }
          .pkg-card-title {
            font-size: 14px;
            min-height: 36px;
          }
          .pkg-card-btn {
            padding: 8px 12px;
            font-size: 12px;
            border-radius: 16px;
          }
          .lab-grid-view {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .lab-grid-view .lab-card {
            width: 100%;
          }
          .pkg-grid-view {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .pkg-grid-view .pkg-card {
            width: 100%;
          }
          .lab-appointments-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }

        /* Very Small Screens (< 420px) */
        @media (max-width: 420px) {
          .lab-card {
            width: 195px;
          }
          .pkg-card {
            width: 220px;
          }
        }
      `}</style>

      <style>{`
        .labs-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 1% 12%, rgba(71, 220, 174, 0.15), transparent 24rem),
            radial-gradient(circle at 98% 62%, rgba(51, 157, 225, 0.1), transparent 25rem),
            #f7fbfa;
        }

        .lab-top-shell {
          padding: 16px 0 0 !important;
          background: transparent !important;
          border-bottom: 0 !important;
        }

        .lab-hero-banner {
          min-height: 145px;
          margin: 0 0 14px;
          padding: 18px 28px;
          overflow: hidden;
          color: #fff;
          background:
            radial-gradient(circle at 78% 50%, rgba(94, 234, 212, 0.28), transparent 32%),
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.16), transparent 38%),
            radial-gradient(circle at 45% 120%, rgba(56, 189, 248, 0.18), transparent 40%),
            linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 58%, #0f2f36 100%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 26px;
          box-shadow:
            0 24px 50px -12px rgba(15, 60, 66, 0.45),
            0 8px 18px rgba(31, 79, 87, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.22);
          isolation: isolate;
        }

        /* Subtle dot texture */
        .lab-hero-banner::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1.2px);
          background-size: 18px 18px;
          -webkit-mask-image: linear-gradient(100deg, transparent 35%, #000 70%, transparent 100%);
          mask-image: linear-gradient(100deg, transparent 35%, #000 70%, transparent 100%);
        }

        /* Soft moving sheen */
        .lab-hero-banner::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -40%;
          width: 35%;
          z-index: 0;
          pointer-events: none;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.09), transparent);
          transform: skewX(-18deg);
          animation: labHeroSheen 7s ease-in-out infinite;
        }

        @keyframes labHeroSheen {
          0%, 55% { left: -40%; }
          100% { left: 130%; }
        }

        @keyframes labHeroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes labHeroIconFloat {
          0%, 100% { transform: rotate(-6deg) translateY(0); }
          50% { transform: rotate(-3deg) translateY(-4px); }
        }

        .lab-hero-content,
        .lab-hero-img-col {
          position: relative;
          z-index: 1;
        }

        .lab-hero-icon {
          color: var(--primary-dark);
          background: linear-gradient(145deg, #ffffff 0%, #e6fbf5 100%);
          box-shadow:
            0 14px 28px rgba(0, 40, 37, 0.32),
            0 0 0 5px rgba(255, 255, 255, 0.12),
            inset 0 -2px 0 rgba(13, 92, 99, 0.08);
          animation: labHeroIconFloat 5s ease-in-out infinite;
        }

        .lab-hero-content {
          max-width: 660px;
        }

        .lab-hero-pill-tag {
          margin-bottom: 10px;
          padding: 6px 11px;
          color: #d8fff3;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06));
          border: 1px solid rgba(255, 255, 255, 0.26);
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 4px 12px rgba(0, 40, 37, 0.12);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.045em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .lab-hero-pill-tag svg {
          color: #d8fff3 !important;
        }

        .lab-hero-title {
          max-width: 640px;
          margin-bottom: 6px;
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(1.4rem, 2.2vw, 1.85rem);
          line-height: 1.18;
          letter-spacing: -0.03em;
          background: linear-gradient(90deg, #ffffff 0%, #ffffff 55%, #b8f5e4 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
          filter: drop-shadow(0 2px 8px rgba(0, 30, 28, 0.25));
        }

        .lab-hero-subtitle {
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 12.5px;
          font-weight: 500;
        }

        .lab-hero-search-wrapper {
          max-width: 570px;
          margin-bottom: 15px;
          padding: 10px 13px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.78);
          border-radius: 14px;
          box-shadow: 0 10px 24px rgba(0, 57, 53, 0.16);
        }

        .lab-hero-search-wrapper:focus-within {
          border-color: #fff;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.14), 0 12px 28px rgba(0, 57, 53, 0.2);
        }

        .lab-hero-search-input {
          font-size: 12.5px;
        }

        .lab-hero-badges {
          gap: 8px;
        }

        .lab-hero-badge {
          padding: 6px 10px;
          color: #fff;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(18, 51, 58, 0.45));
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 6px 14px rgba(0, 30, 28, 0.16);
          font-size: 10px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }

        .lab-hero-badge:hover {
          transform: translateY(-2px);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(18, 51, 58, 0.4));
          border-color: rgba(255, 255, 255, 0.3);
        }

        .lab-hero-img-wrap {
          position: relative;
          top: -13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Glow halo behind illustration */
        .lab-hero-img-wrap::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 55%;
          width: 170px;
          height: 170px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(167, 243, 208, 0.45) 0%, rgba(94, 234, 212, 0.15) 45%, transparent 70%);
          filter: blur(6px);
          z-index: -1;
        }

        .lab-hero-img-photo {
          display: block;
          width: auto;
          height: 100%;
          max-height: 150px;
          max-width: 100%;
          object-fit: contain;
          filter: drop-shadow(0 14px 18px rgba(0, 30, 28, 0.35));
          animation: labHeroFloat 5.5s ease-in-out infinite;
        }

        .lab-hero-stat-badge {
          bottom: -13px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          color: var(--primary-dark);
          border: 0;
          border-radius: 9px;
          font-size: 9px;
          font-weight: 800;
          background: linear-gradient(180deg, #ffffff, #f1fbf8);
          box-shadow: 0 10px 22px rgba(0, 40, 37, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.18);
        }

        .lab-hero-stat-badge svg {
          color: #08a579;
        }

        @media (prefers-reduced-motion: reduce) {
          .lab-hero-banner::after,
          .lab-hero-icon,
          .lab-hero-img-photo {
            animation: none;
          }
        }

        .lab-category-strip {
          display: flex;
          gap: 9px;
          margin-top: 6px;
          padding: 5px 2px 14px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .lab-category-strip::-webkit-scrollbar {
          display: none;
        }

        .lab-category-chip {
          display: inline-flex;
          min-height: 37px;
          flex: 0 0 auto;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(8, 120, 125, 0.13);
          border-radius: 12px;
          box-shadow: 0 6px 16px rgba(5, 73, 78, 0.055);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .lab-category-chip:hover,
        .lab-category-chip.active {
          color: #fff;
          background: linear-gradient(135deg, #10a88e, #087b73);
          border-color: transparent;
          box-shadow: 0 9px 19px rgba(8, 123, 115, 0.2);
          transform: translateY(-2px);
        }

        .lab-container-custom {
          padding: 28px 16px 40px;
        }

        .lab-container-custom > section {
          margin-bottom: 44px !important;
        }

        .lab-container-custom > section:last-child {
          margin-bottom: 0 !important;
        }

        .lab-section-header {
          margin-bottom: 17px;
        }

        .lab-section-title {
          color: var(--text-main);
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .lab-view-all-btn {
          min-height: 36px;
          padding: 8px 11px;
          color: var(--primary);
          background: var(--primary-light);
          border: 1px solid rgba(8, 120, 125, 0.13);
          border-radius: 11px;
          font-size: 11.5px;
        }

        .lab-view-all-btn:hover {
          color: #fff;
          background: var(--primary);
          transform: translateX(0) translateY(-2px);
        }

        .lab-scroll-row {
          gap: 17px;
          padding: 6px 4px 18px;
        }

        .lab-scroll-arrow {
          width: 40px;
          height: 40px;
          color: var(--primary-dark);
          border-color: rgba(8, 120, 125, 0.16);
          box-shadow: 0 8px 22px rgba(5, 73, 78, 0.14);
        }

        .lab-theme-0,
        .lab-theme-1,
        .lab-theme-2,
        .lab-theme-3,
        .lab-theme-4,
        .lab-theme-5 {
          --lab-accent: #087b73;
          --lab-soft: #e8f6f3;
          --lab-tint: #f7fbfa;
        }

        .lab-card,
        .pkg-card {
          overflow: hidden;
          border: 1px solid rgba(8, 120, 125, 0.14);
          border-radius: 22px;
          box-shadow: 0 11px 28px rgba(5, 73, 78, 0.08);
        }

        .lab-card {
          width: 232px;
        }

        .pkg-card {
          width: 260px;
        }

        .lab-card::before,
        .pkg-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          z-index: 3;
          height: 5px;
          background: var(--lab-accent);
        }

        .lab-card:hover,
        .pkg-card:hover {
          border-color: rgba(8, 120, 125, 0.3);
          box-shadow: 0 17px 36px rgba(5, 73, 78, 0.13);
        }

        .lab-card-img-container,
        .pkg-card-img-container {
          display: grid;
          height: 146px;
          place-items: end center;
          padding: 47px 14px 14px;
          box-sizing: border-box;
          background: linear-gradient(145deg, var(--lab-tint), var(--lab-soft));
        }

        .lab-card-visual {
          position: relative;
          z-index: 1;
          display: grid;
          width: 76px;
          height: 76px;
          place-items: center;
          color: var(--lab-accent);
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.92);
          border-radius: 24px;
          box-shadow: 0 10px 22px rgba(5, 73, 78, 0.1);
          transform: none;
          transition: transform 0.25s ease;
        }

        .lab-card-visual.package {
          border-radius: 50%;
          transform: none;
        }

        .lab-card:hover .lab-card-visual,
        .pkg-card:hover .lab-card-visual {
          transform: scale(1.04);
        }

        .lab-card-tag,
        .pkg-card-badge {
          top: 15px;
          left: 13px;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          color: var(--lab-accent);
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid color-mix(in srgb, var(--lab-accent) 22%, transparent);
          border-radius: 9px;
          box-shadow: 0 5px 13px rgba(5, 73, 78, 0.06);
          font-size: 9.5px;
          font-weight: 800;
        }

        .lab-card-body,
        .pkg-card-body {
          padding: 15px;
        }

        .lab-card-title,
        .pkg-card-title {
          color: var(--text-main);
          font-family: var(--font-display);
          font-size: 13.5px;
          font-weight: 800;
        }

        .lab-card-title {
          min-height: 37px;
        }

        .lab-card-sub,
        .pkg-card-tests-badge {
          color: var(--lab-accent);
          background: var(--lab-soft);
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 750;
        }

        .lab-card-footer {
          margin-top: auto;
          padding-top: 11px;
          border-top: 1px dashed color-mix(in srgb, var(--lab-accent) 22%, #dce8e7);
        }

        .lab-card-btn,
        .pkg-card-btn {
          min-height: 35px;
          justify-content: center;
          color: #fff;
          background: var(--lab-accent);
          border-radius: 11px;
          box-shadow: 0 7px 16px color-mix(in srgb, var(--lab-accent) 22%, transparent);
        }

        .lab-card-btn {
          width: 100%;
        }

        .lab-card-btn:hover,
        .pkg-card-btn:hover {
          background: var(--lab-accent);
          filter: brightness(0.94) saturate(1.08);
        }

        /* ── Lab Tests & Health Packages: visual polish ── */
        .lab-section-title {
          position: relative;
          padding-bottom: 8px;
        }

        .lab-section-title::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 38px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--primary), #34d3b4);
        }

        .lab-view-all-btn {
          background: linear-gradient(180deg, #ffffff, var(--primary-light));
          box-shadow: 0 4px 12px rgba(5, 73, 78, 0.08), inset 0 1px 0 #fff;
          transition: color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.2s;
        }

        .lab-view-all-btn svg {
          transition: transform 0.2s ease;
        }

        .lab-view-all-btn:hover {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          box-shadow: 0 10px 20px rgba(5, 73, 78, 0.22);
        }

        .lab-view-all-btn:hover svg {
          transform: translateX(3px);
        }

        .lab-scroll-arrow {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(8, 120, 125, 0.14);
          box-shadow: 0 10px 24px rgba(5, 73, 78, 0.16), 0 0 0 4px rgba(255, 255, 255, 0.6);
        }

        .lab-scroll-arrow:hover {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border-color: transparent;
          box-shadow: 0 12px 26px rgba(5, 73, 78, 0.3), 0 0 0 4px rgba(8, 123, 115, 0.12);
        }

        .lab-card,
        .pkg-card {
          background: linear-gradient(180deg, #ffffff 60%, #fbfefd 100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .lab-card::before,
        .pkg-card::before {
          height: 4px;
          background: linear-gradient(90deg, var(--lab-accent), #2bc4a6, var(--lab-accent));
          background-size: 200% 100%;
          transition: background-position 0.6s ease;
        }

        .lab-card:hover,
        .pkg-card:hover {
          transform: translateY(-6px);
          border-color: rgba(8, 120, 125, 0.32);
          box-shadow: 0 22px 40px -10px rgba(5, 73, 78, 0.22), 0 6px 14px rgba(5, 73, 78, 0.06);
        }

        .lab-card:hover::before,
        .pkg-card:hover::before {
          background-position: 100% 0;
        }

        .lab-card .lab-card-img-container,
        .pkg-card .pkg-card-img-container {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 78%, rgba(255, 255, 255, 0.95) 0%, transparent 42%),
            linear-gradient(150deg, #f4fbf9 0%, #e3f5f1 60%, #d7efea 100%);
        }

        /* Decorative rings behind the icon */
        .lab-card .lab-card-img-container::before,
        .lab-card .lab-card-img-container::after,
        .pkg-card .pkg-card-img-container::before,
        .pkg-card .pkg-card-img-container::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        .lab-card .lab-card-img-container::before,
        .pkg-card .pkg-card-img-container::before {
          width: 150px;
          height: 150px;
          right: -55px;
          top: -60px;
          border: 1px solid rgba(8, 123, 115, 0.12);
          background: radial-gradient(circle, rgba(52, 211, 180, 0.12), transparent 70%);
        }

        .lab-card .lab-card-img-container::after,
        .pkg-card .pkg-card-img-container::after {
          width: 90px;
          height: 90px;
          left: -35px;
          bottom: -45px;
          border: 1px solid rgba(8, 123, 115, 0.1);
        }

        .lab-card .lab-card-visual,
        .pkg-card .lab-card-visual {
          background: linear-gradient(160deg, #ffffff 0%, #f2fbf8 100%);
          border: 1px solid rgba(255, 255, 255, 1);
          box-shadow:
            0 12px 24px rgba(5, 73, 78, 0.13),
            0 0 0 6px rgba(255, 255, 255, 0.45),
            inset 0 -3px 0 rgba(8, 123, 115, 0.06);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
        }

        .lab-card:hover .lab-card-visual,
        .pkg-card:hover .lab-card-visual {
          transform: translateY(-3px) scale(1.06) rotate(-3deg);
          box-shadow:
            0 16px 30px rgba(5, 73, 78, 0.18),
            0 0 0 7px rgba(255, 255, 255, 0.6),
            inset 0 -3px 0 rgba(8, 123, 115, 0.06);
        }

        .lab-card .lab-card-tag,
        .pkg-card .pkg-card-badge {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 6px 14px rgba(5, 73, 78, 0.08), inset 0 1px 0 #fff;
        }

        .lab-card .lab-card-title,
        .pkg-card .pkg-card-title {
          transition: color 0.2s ease;
        }

        .lab-card:hover .lab-card-title,
        .pkg-card:hover .pkg-card-title {
          color: var(--lab-accent);
        }

        .lab-card .lab-card-sub,
        .pkg-card .pkg-card-tests-badge {
          padding: 4px 10px;
          background: linear-gradient(90deg, var(--lab-soft), #f2faf8);
          border: 1px solid color-mix(in srgb, var(--lab-accent) 14%, transparent);
        }

        .lab-card .lab-card-btn,
        .pkg-card .pkg-card-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0b8f84 0%, var(--lab-accent) 50%, #0a5a5c 100%);
          box-shadow: 0 8px 18px color-mix(in srgb, var(--lab-accent) 28%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }

        .lab-card .lab-card-btn::after,
        .pkg-card .pkg-card-btn::after {
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

        .lab-card .lab-card-btn svg,
        .pkg-card .pkg-card-btn svg {
          transition: transform 0.2s ease;
        }

        .lab-card .lab-card-btn:hover,
        .pkg-card .pkg-card-btn:hover {
          background: linear-gradient(135deg, #0b8f84 0%, var(--lab-accent) 50%, #0a5a5c 100%);
          transform: translateY(-1px);
          box-shadow: 0 12px 22px color-mix(in srgb, var(--lab-accent) 34%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .lab-card .lab-card-btn:hover::after,
        .pkg-card .pkg-card-btn:hover::after {
          left: 130%;
        }

        .lab-card .lab-card-btn:hover svg,
        .pkg-card .pkg-card-btn:hover svg {
          transform: translateX(3px);
        }

        /* Packages: full-bleed photo (same as Home) + badge dot */
        .pkg-card .pkg-card-img-container {
          display: block;
          height: 150px;
          padding: 0;
        }

        .pkg-card .pkg-card-img-container::before,
        .pkg-card .pkg-card-img-container::after {
          display: none;
        }

        .pkg-card .pkg-card-img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pkg-card:hover .pkg-card-img {
          transform: scale(1.05);
        }

        /* ── Trust & Quality strip: visual polish ── */
        .labs-page .trust-features-panel {
          padding: 0;
          background: none;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }

        .labs-page .trust-features-grid {
          position: relative;
          z-index: 1;
        }

        .labs-page .trust-feature-item {
          position: relative;
          overflow: hidden;
          gap: 15px;
          padding: 18px 16px 20px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--tf-bg) 45%, #fff) 0%, #fff 55%);
          border: 1px solid color-mix(in srgb, var(--tf-color) 14%, transparent);
          border-radius: 18px;
          box-shadow: 0 6px 18px rgba(5, 73, 78, 0.05);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        /* soft colour glow in the corner */
        .labs-page .trust-feature-item::before {
          content: "";
          position: absolute;
          right: -30px;
          top: -30px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--tf-color) 14%, transparent), transparent 70%);
          pointer-events: none;
          transition: transform 0.4s ease;
        }

        /* accent line along the bottom */
        .labs-page .trust-feature-item::after {
          content: "";
          position: absolute;
          left: 16px;
          bottom: 0;
          width: 30px;
          height: 3px;
          background: var(--tf-color);
          border-radius: 999px 999px 0 0;
          transition: width 0.35s ease;
        }

        .labs-page .trust-feature-item:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--tf-color) 32%, transparent);
          box-shadow: 0 16px 30px color-mix(in srgb, var(--tf-color) 18%, transparent);
        }

        .labs-page .trust-feature-item:hover::before {
          transform: scale(1.5);
        }

        .labs-page .trust-feature-item:hover::after {
          width: calc(100% - 32px);
        }

        .labs-page .trust-feature-icon {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 15px;
          color: #fff !important;
          background: linear-gradient(145deg, color-mix(in srgb, var(--tf-color) 68%, #fff), var(--tf-color)) !important;
          box-shadow:
            0 0 0 5px var(--tf-bg),
            0 10px 20px color-mix(in srgb, var(--tf-color) 28%, transparent);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .labs-page .trust-feature-item:hover .trust-feature-icon {
          transform: rotate(-6deg) scale(1.06);
        }

        .labs-page .trust-feature-item h4 {
          margin-bottom: 3px;
          font-family: var(--font-display);
          font-size: 15px;
          letter-spacing: -0.01em;
        }

        .labs-page .trust-feature-item p {
          font-size: 12px;
          line-height: 1.4;
        }

        @media (max-width: 420px) {
          .labs-page .trust-features-panel {
            padding: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .labs-page .trust-feature-item,
          .labs-page .trust-feature-item::before,
          .labs-page .trust-feature-item::after,
          .labs-page .trust-feature-icon {
            transition: none;
          }
        }

        /* Packages: no price — full-width CTA, two-line title, image fade */
        .pkg-card .pkg-card-img-container {
          height: 160px;
        }

        .pkg-card .pkg-card-img-container::after {
          content: "";
          display: block;
          position: absolute;
          inset: auto 0 0;
          width: auto;
          height: 45%;
          border: none;
          border-radius: 0;
          background: linear-gradient(180deg, transparent, rgba(5, 44, 52, 0.22));
          pointer-events: none;
          z-index: 1;
        }

        .pkg-card .pkg-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          padding: 16px 16px 16px;
        }

        .pkg-card .pkg-card-title {
          display: -webkit-box;
          min-height: 2.6em;
          margin: 0;
          overflow: hidden;
          font-size: 15px;
          line-height: 1.3;
          letter-spacing: -0.01em;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .pkg-card .pkg-card-tests-badge {
          width: fit-content;
          gap: 6px;
          margin: 0;
          padding: 5px 11px;
          font-size: 11px;
        }

        .pkg-card .lab-card-footer {
          display: block;
          margin-top: auto;
          padding-top: 14px;
        }

        .pkg-card .lab-card-footer .pkg-card-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-height: 40px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 13px;
        }

        .pkg-card .pkg-card-badge::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2bc4a6;
          box-shadow: 0 0 0 3px rgba(43, 196, 166, 0.18);
        }

        @media (prefers-reduced-motion: reduce) {
          .lab-card,
          .pkg-card,
          .lab-card .lab-card-visual,
          .pkg-card .pkg-card-img,
          .lab-card .lab-card-btn::after,
          .pkg-card .pkg-card-btn::after {
            transition: none;
          }
        }

        .lab-grid-view,
        .pkg-grid-view {
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 18px;
        }

        .lab-order-card,
        .lab-order-empty {
          border: 1px solid rgba(8, 120, 125, 0.13) !important;
          border-radius: 20px !important;
          box-shadow: 0 11px 28px rgba(5, 73, 78, 0.07) !important;
        }

        .lab-order-card {
          --oc-color: var(--primary);
          --oc-bg: var(--primary-light);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 18px 18px 16px;
          background:
            radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--oc-color) 9%, transparent), transparent 45%),
            #ffffff;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .lab-order-card.is-done {
          --oc-color: #16a34a;
          --oc-bg: #dcfce7;
        }

        .lab-order-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 4px;
          background: linear-gradient(90deg, #0ca695, #2c82e0);
        }

        .lab-order-card:hover,
        .lab-order-card:focus-visible {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--oc-color) 30%, transparent) !important;
          box-shadow: 0 18px 34px -10px rgba(5, 73, 78, 0.2) !important;
          outline: none;
        }

        .lab-order-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .lab-order-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(145deg, color-mix(in srgb, var(--oi-color) 70%, #fff), var(--oi-color));
          box-shadow:
            0 0 0 4px color-mix(in srgb, var(--oi-color) 14%, #fff),
            0 8px 16px color-mix(in srgb, var(--oi-color) 26%, transparent);
          flex-shrink: 0;
        }

        .lab-order-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
          color: var(--oc-color);
          background: var(--oc-bg);
          border: 1px solid color-mix(in srgb, var(--oc-color) 18%, transparent);
        }

        .lab-order-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent);
        }

        .lab-order-name {
          font-size: 15.5px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.35;
          letter-spacing: -0.01em;
          margin-bottom: 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: calc(15.5px * 1.35 * 2);
        }

        .lab-order-when {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
        }

        .lab-order-when span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-main);
          background: #f3f7f8;
        }

        .lab-order-when svg {
          color: var(--primary);
        }

        .lab-order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px dashed rgba(8, 120, 125, 0.18);
        }

        .lab-order-lab {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lab-order-lab svg {
          color: var(--primary);
          flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .lab-order-card {
            transition: none;
          }
        }

        @media (max-width: 1024px) {
          .lab-hero-banner {
            padding: 20px 26px;
          }

          .lab-card { width: 218px; }
          .pkg-card { width: 245px; }
        }

        @media (max-width: 640px) {
          .lab-top-shell {
            padding-top: 10px !important;
          }

          .lab-hero-banner {
            min-height: auto;
            padding: 20px 18px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 62%, #133a41 100%);
            border-radius: 22px;
          }

          .lab-hero-pill-tag {
            margin-bottom: 10px;
            color: #d8fff3;
          }

          .lab-hero-title {
            color: #fff;
            font-size: 1.35rem;
          }

          .lab-hero-subtitle {
            color: rgba(255, 255, 255, 0.82);
          }

          .lab-hero-search-wrapper {
            padding: 9px 11px;
          }

          .lab-category-strip {
            margin-inline: -2px;
          }

          .lab-container-custom {
            padding: 20px 12px 42px;
          }

          .lab-section-title {
            font-size: 19px;
          }

          .lab-view-all-btn {
            min-height: 33px;
            padding: 7px 9px;
            font-size: 10.5px;
          }

          .lab-scroll-row {
            gap: 12px;
          }

          .lab-card {
            width: 202px;
            border-radius: 18px;
          }

          .pkg-card {
            width: 224px;
            border-radius: 18px;
          }

          .lab-card-img-container,
          .pkg-card-img-container {
            height: 126px;
            padding: 42px 10px 10px;
          }

          .lab-card-visual {
            width: 64px;
            height: 64px;
            border-radius: 20px;
          }

          .lab-card-visual svg {
            width: 36px;
            height: 36px;
          }

          .lab-card-body,
          .pkg-card-body {
            padding: 13px;
          }
        }
      `}</style>

      {/* ── Top Header Bar ── */}
      <div className="lab-top-shell">
        <div className="container">
          {/* Top Hero Banner */}
          <div className="lab-hero-banner">
            <div className="lab-hero-content">
              <div className="lab-hero-icon" aria-hidden="true">
                <Microscope size={26} />
              </div>

              <div>
                {/* Pre-title Pill Tag */}
                <div className="lab-hero-pill-tag">
                  <Sparkles size={13} color="#0d5c63" /> NABL & ISO Certified Partner Labs
                </div>

                {/* Title & Subtitle */}
                <h1 className="lab-hero-title">
                  Book trusted lab tests & health packages with ease.
                </h1>
                <p className="lab-hero-subtitle">
                  Free doorstep sample collection by certified phlebotomists.
                </p>

                {/* Trust Micro Badges */}
                <div className="lab-hero-badges">
                  <span className="lab-hero-badge">
                    <CheckCircle2 size={14} color="#4ade80" /> Certified Labs
                  </span>
                  <span className="lab-hero-badge">
                    <Clock size={14} color="#67e8f9" /> 12-24h Reports
                  </span>
                  <span className="lab-hero-badge">
                    <ShieldCheck size={14} color="#fb923c" /> Free Home Sample
                  </span>
                </div>
              </div>
            </div>

            {/* Right Graphic/Illustration (Desktop & Tablet) */}
            <div className="lab-hero-img-col">
              <div className="lab-hero-img-wrap" aria-hidden="true">
                <img src="/images/lab-tests.png" alt="" className="lab-hero-img-photo" />
                <div className="lab-hero-stat-badge">
                  <CheckCircle2 size={14} />
                  <span>4.9 Pathologist Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container lab-container-custom">

        {/* ── SECTION 1: LAB TESTS ── */}
        <section style={{ marginBottom: '48px' }}>
          <div className="lab-section-header">
            <h2 className="lab-section-title">Lab Tests</h2>
            <button 
              className="lab-view-all-btn"
              onClick={() => go("/labs/all-tests")}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>

          {filteredTests.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FlaskConical size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No lab tests found matching "{q}".</p>
            </div>
          ) : showAllTests ? (
            <div className="lab-grid-view">
              {filteredTests.map((test, index) => (
                <div className={`lab-card lab-theme-${index % 6}`} key={test.id} style={{ width: '100%' }}>
                  <div className="lab-card-img-container">
                    <div className="lab-card-visual"><LabItemIcon item={test} size={43} /></div>
                    <span className="lab-card-tag"><TestTube size={10} /> Certified</span>
                  </div>
                  <div className="lab-card-body">
                    <div className="lab-card-title">{toTitleCase(test.title)}</div>
                    <div className="lab-card-sub">{toTitleCase(test.category)}</div>
                    <div className="lab-card-footer">
                      <button className="lab-card-btn" onClick={() => setSelectedItem(test)}>
                        More Details <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="lab-scroll-wrapper">
              <button className="lab-scroll-arrow left" onClick={() => scrollContainer(testsScrollRef, "left")}>
                <ChevronLeft size={20} />
              </button>
              
              <div className="lab-scroll-row" ref={testsScrollRef}>
                {filteredTests.map((test, index) => (
                  <div className={`lab-card lab-theme-${index % 6}`} key={test.id}>
                    <div className="lab-card-img-container">
                      <div className="lab-card-visual"><LabItemIcon item={test} size={43} /></div>
                      <span className="lab-card-tag"><TestTube size={10} /> Certified</span>
                    </div>
                    <div className="lab-card-body">
                      <div className="lab-card-title">{toTitleCase(test.title)}</div>
                      <div className="lab-card-sub">{toTitleCase(test.category)}</div>
                      <div className="lab-card-footer">
                        <button className="lab-card-btn" onClick={() => setSelectedItem(test)}>
                          More Details <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="lab-scroll-arrow right" onClick={() => scrollContainer(testsScrollRef, "right")}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </section>

        {/* ── SECTION 2: HEALTH PACKAGES ── */}
        <section style={{ marginBottom: '48px' }}>
          <div className="lab-section-header">
            <h2 className="lab-section-title">Health Packages</h2>
            <button 
              className="lab-view-all-btn"
              onClick={() => go("/labs/all-packages")}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>

          {filteredPackages.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Stethoscope size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No health packages found matching "{q}".</p>
            </div>
          ) : showAllPackages ? (
            <div className="pkg-grid-view">
              {filteredPackages.map((pkg, index) => (
                <div className={`pkg-card lab-theme-${(index + 2) % 6}`} key={pkg.id} style={{ width: '100%' }}>
                  <div className="pkg-card-img-container">
                    <img src={pkg.img} alt={pkg.title} className="pkg-card-img" />
                    {pkg.badge && <div className="pkg-card-badge">{pkg.badge}</div>}
                  </div>
                  <div className="pkg-card-body">
                    <div className="pkg-card-title">{pkg.title}</div>
                    <div className="pkg-card-tests-badge">
                      <ShieldCheck size={12} /> {pkg.tests}
                    </div>
                    <div className="lab-card-footer">
                      <button className="pkg-card-btn" onClick={() => go(`/labs/package-details/${encodeURIComponent(pkg.id)}`, { state: { package: pkg } })}>
                        View Details <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="lab-scroll-wrapper">
              <button className="lab-scroll-arrow left" onClick={() => scrollContainer(packagesScrollRef, "left")}>
                <ChevronLeft size={20} />
              </button>

              <div className="lab-scroll-row" ref={packagesScrollRef}>
                {filteredPackages.map((pkg, index) => (
                  <div className={`pkg-card lab-theme-${(index + 2) % 6}`} key={pkg.id}>
                    <div className="pkg-card-img-container">
                      <img src={pkg.img} alt={pkg.title} className="pkg-card-img" />
                      {pkg.badge && <div className="pkg-card-badge">{pkg.badge}</div>}
                    </div>
                    <div className="pkg-card-body">
                      <div className="pkg-card-title">{pkg.title}</div>
                      <div className="pkg-card-tests-badge">
                        <ShieldCheck size={12} /> {pkg.tests}
                      </div>
                      <div className="lab-card-footer">
                        <button className="pkg-card-btn" onClick={() => go(`/labs/package-details/${encodeURIComponent(pkg.id)}`, { state: { package: pkg } })}>
                          View Details <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="lab-scroll-arrow right" onClick={() => scrollContainer(packagesScrollRef, "right")}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </section>

        {/* ── SECTION 3: MY ORDERS ── */}
        <section style={{ marginBottom: '48px' }}>
          <div className="lab-section-header">
            <h2 className="lab-section-title">My Orders</h2>
            <button className="lab-view-all-btn" onClick={() => go('/orders')}>
              View All <ArrowRight size={16} />
            </button>
          </div>

          {appointments.length > 0 ? (
            <div className="lab-appointments-grid">
              {appointments.slice(0, 4).map((appt) => {
                const isDone = ['delivered', 'completed', 'ready'].includes((appt.status || '').toLowerCase());
                const { color: iconColor } = getOrderIcon(appt.name);
                return (
                  <div
                    key={appt.id}
                    className={`lab-order-card${isDone ? ' is-done' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => go('/orders')}
                    onKeyDown={(e) => { if (e.key === 'Enter') go('/orders'); }}
                  >
                    <div className="lab-order-top">
                      <div className="lab-order-icon" style={{ '--oi-color': iconColor }}>
                        <LabItemIcon item={{ title: appt.name }} size={20} />
                      </div>
                      <span className="lab-order-status">
                        <span className="lab-order-status-dot" />
                        {appt.status}
                      </span>
                    </div>

                    <h4 className="lab-order-name">
                      {typeof appt.name === 'string' && appt.name.length > 60 ? appt.name.substring(0, 60) + '...' : appt.name}
                    </h4>

                    <div className="lab-order-when">
                      <span><CalendarDays size={13} /> {appt.date}</span>
                      {appt.time && <span><Clock size={13} /> {appt.time}</span>}
                    </div>

                    <div className="lab-order-footer">
                      <span className="lab-order-lab"><MapPin size={13} /> {appt.lab}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lab-order-empty" style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '32px 24px',
              textAlign: 'center'
            }}>
              <div style={{ width: '124px', height: '124px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="76" height="76" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <ellipse cx="60" cy="102" rx="34" ry="5" fill="var(--primary)" opacity="0.1" />
                  <path d="M34 20 H86 V88 L80 94 L74 88 L68 94 L62 88 L56 94 L50 88 L44 94 L38 88 L34 94 Z"
                        fill="#ffffff" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" />
                  <rect x="43" y="33" width="34" height="4" rx="2" fill="var(--primary-light)" />
                  <rect x="43" y="43" width="26" height="4" rx="2" fill="var(--primary-light)" />
                  <rect x="43" y="53" width="30" height="4" rx="2" fill="var(--primary-light)" />
                  <rect x="43" y="65" width="18" height="6" rx="3" fill="var(--primary)" opacity="0.85" />
                  <circle cx="84" cy="78" r="16" fill="var(--accent)" stroke="#ffffff" strokeWidth="3" />
                  <path d="M77.5 78 L82 82.5 L91 72.5" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: '700' }}>No Orders Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Your lab test orders will show up here once you book one.</p>
            </div>
          )}
        </section>

        {/* ── SECTION 4: TRUST & QUALITY FEATURES ── */}
        <section className="trust-features-panel">
          <div className="trust-features-grid">
            {[
              { icon: <ShieldCheck size={26} />, title: "Certified Labs", sub: "100% NABL & ISO accredited partners", color: "var(--primary)", bg: "var(--primary-light)" },
              { icon: <Clock size={26} />, title: "On-time Reports", sub: "Digital reports within 12 to 24 hours", color: "#2563EB", bg: "#DBEAFE" },
              { icon: <Microscope size={26} />, title: "Home Sample Collection", sub: "Safe & hygienic doorstep phlebotomist", color: "var(--accent)", bg: "#FEF0E2" },
              { icon: <Stethoscope size={26} />, title: "Doctor Verified", sub: "Reviewed by expert clinical pathologists", color: "#DB2777", bg: "#FCE7F3" },
            ].map((feature, i) => (
              <div key={i} className="trust-feature-item" style={{ "--tf-color": feature.color, "--tf-bg": feature.bg }}>
                <div className="trust-feature-icon" style={{ background: feature.bg, color: feature.color }}>
                  {feature.icon}
                </div>
                <div>
                  <h4>{feature.title}</h4>
                  <p>{feature.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── BOOKING / DETAILS MODAL ── */}
      <Modal
        isOpen={!!selectedItem || forceModalOpen}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.tests ? "Schedule Health Package" : "Schedule Lab Test"}
        maxWidth="680px"
      >
        {selectedItem && (
          <div style={{ marginBottom: "16px", padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
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
                <Clock size={15} color="var(--primary)" /> <b>Report Delivery:</b> {selectedItem.reportTime || "24 Hours"}
              </div>
              <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                <ShieldCheck size={15} color="var(--primary)" /> <b>Fasting:</b> {selectedItem.fasting || "No Fasting Required"}
              </div>
            </div>
          </div>
        )}

        {!loadingWallet && walletBalance > 0 && (
          <div style={{ marginBottom: "16px", background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
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
          <div style={{ marginBottom: "16px", textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--primary)', border: '2px solid rgba(0,0,0,0.1)', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}></div>
            Loading wallet balance...
          </div>
        )}

        <div style={{ marginBottom: "0px" }}>
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
                <b style={{ display: 'flex', alignItems: 'center', gap: '8px', color: visitType === 'home' ? 'var(--primary-dark)' : 'var(--text-main)', marginBottom: '4px', fontSize: '14px' }}>
                  <Home size={16} color={visitType === 'home' ? 'var(--primary)' : 'var(--text-muted)'} /> Home Sample Collection
                </b>
                <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, display: 'block', paddingLeft: '24px' }}>A certified phlebotomist visits your doorstep.</small>
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
                <b style={{ display: 'flex', alignItems: 'center', gap: '8px', color: visitType === 'lab' ? 'var(--primary-dark)' : 'var(--text-main)', marginBottom: '4px', fontSize: '14px' }}>
                  <Building2 size={16} color={visitType === 'lab' ? 'var(--primary)' : 'var(--text-muted)'} /> Diagnostic Center Visit
                </b>
                <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, display: 'block', paddingLeft: '24px' }}>Walk-in to your nearest accredited partner lab.</small>
              </div>
            </label>
          </div>
        </div>

        <SelectSlotUI onConfirm={confirmBooking} type="lab" submitting={submitting} />
      </Modal>

    </main>
  );
}
