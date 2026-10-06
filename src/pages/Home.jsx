import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Heart,
  Eye,
  Brain,
  Bone,
  Baby,
  ShieldCheck,
  Star,
  Pill,
  PhoneCall,
  Wallet,
  Gift,
  FileText,
  CreditCard,
  Search,
  Users,
  CalendarCheck,
  Stethoscope,
  Quote,
  Sparkles,
  MapPin,
  Building2,
  Navigation,
  TestTube,
  Clock,
  Siren,
  Smartphone,
  Download,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { packages } from "../mocks/data";
import AmbulanceRequestModal from "../components/ambulance/AmbulanceRequestModal";
import {
  getBanners,
  getDiagnosticPackages,
  getPatientReviews,
} from "../services/dataService";
import { getImageUrl, fetchImageBlob } from "../services/uploadService";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const go = useNavigate();
  const { user } = useAuth();
  const reviewsScrollRef = useRef(null);
  // Auto-scroll pauses while a card or nav button is hovered/focused
  const reviewsHoverRef = useRef(false);
  const reviewsFocusRef = useRef(false);
  const reviewsLastInteractionRef = useRef(0);
  const setReviewsPause = (ref, paused) => {
    ref.current = paused;
    reviewsLastInteractionRef.current = Date.now();
  };
  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.arvaya";
  const APP_STORE_URL = "https://apps.apple.com/in/app/myarvaya/id6803788368";

  const scrollReviews = (dir) => {
    reviewsLastInteractionRef.current = Date.now();
    if (reviewsScrollRef.current) {
      const scrollAmount = reviewsScrollRef.current.clientWidth / 2;
      reviewsScrollRef.current.scrollBy({
        left: dir === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);
  const [apiPackages, setApiPackages] = useState(packages.slice(0, 4));
  const [reviews, setReviews] = useState([
    {
      name: "Ananya Reddy",
      role: "Bangalore",
      text: "Booking an appointment was incredibly seamless. The doctor was available the same day and the consultation was thorough. Arvaya has become my go-to healthcare platform.",
      rating: 5,
    },
    {
      name: "Vikram Singh",
      role: "Mumbai",
      text: "The home sample collection for lab tests is a game-changer. The phlebotomist was on time, professional, and I got my reports within 24 hours. Highly recommended!",
      rating: 5,
    },
    {
      name: "Priya Nair",
      role: "Delhi",
      text: "Managing my family's health records in one place is so convenient. The ABHA integration makes sharing records with new doctors effortless. Love this platform!",
      rating: 5,
    },
  ]);

  useEffect(() => {
    let isMounted = true;
    getPatientReviews({ pageIndex: 0, pageSize: 0 })
      .then((apiReviews) => {
        if (!isMounted) return;
        if (Array.isArray(apiReviews) && apiReviews.length > 0) {
          const normalized = apiReviews.map((r) => ({
            name: r.patient_name || "Patient",
            role: "Verified Patient",
            text: r.review || "",
            rating: r.ratings || 5,
          }));
          setReviews(normalized);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch /api/patientReview/get for Home:", err);
      });

    getDiagnosticPackages({ pageSize: 10 })
      .then((apiPkgs) => {
        if (!isMounted) return;
        if (Array.isArray(apiPkgs) && apiPkgs.length > 0) {
          const normalized = apiPkgs.map((p, idx) => {
            let rawTitle =
              p.package_name ||
              p.name ||
              p.title ||
              `Health Package ${idx + 1}`;
            if (rawTitle.includes('-')) rawTitle = rawTitle.split('-')[0].trim();
            const priceVal = parseFloat(
              p.package_price || p.price || p.cost || p.amount || 999,
            );
            const oldPriceVal = Math.round(priceVal * 1.25);
            const itemCount =
              Array.isArray(p.subitems) && p.subitems.length > 0
                ? `${p.subitems.length}+ Tests Included`
                : "30+ Tests";

            return {
              id:
                p.rateplan_package_id ||
                p.id ||
                p.package_key ||
                `api-pkg-${idx}`,
              title: rawTitle,
              tests: itemCount,
              price: `₹${priceVal}`,
              oldPrice: `₹${oldPriceVal}`,
              discount: `${Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100)}% OFF`,
              img:
                p.img ||
                p.image ||
                (rawTitle.toLowerCase().includes("diabet")
                  ? "/images/diabetes.png"
                  : rawTitle.toLowerCase().includes("heart")
                    ? "/images/heart-health.png"
                    : rawTitle.toLowerCase().includes("thyroid")
                      ? "/images/thyroid-profile.png"
                      : "/images/full-body-checkup.png"),
              trend:
                p.badge ||
                (idx === 0
                  ? "Most Booked"
                  : idx === 1
                    ? "Popular"
                    : "Doctor Verified"),
            };
          });
          setApiPackages(normalized.slice(0, 4));
        }
      })
      .catch((err) => {
        console.error(
          "Failed to fetch /api/diagnostic/getPackages for Home:",
          err,
        );
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const heroSlides = [
    {
      badge: "15 MIN EMERGENCY RESPONSE",
      badgeIcon: <Clock size={14} strokeWidth={2.4} aria-hidden="true" />,
      badgeColor: "#2dd4bf",
      badgeBorder: "rgba(45, 212, 191, 0.4)",
      badgeBg: "rgba(18, 51, 58, 0.7)",
      title: (
        <>
          24/7 Smart ICU Emergency &<br />
          Mobile Dispatch
        </>
      ),
      subtitle:
        "Rapid emergency ambulance dispatch equipped with mobile life support and live tracking.",
      primaryBtn: "Request Ambulance",
      primaryAction: () => go("/ambulance"),
      bg: "/banner_healthcare_1.png",
    },
    {
      badge: "INDIA'S #1 HEALTHCARE PLATFORM",
      badgeIcon: <ShieldCheck size={14} strokeWidth={2.4} aria-hidden="true" />,
      badgeColor: "#FDBF8B",
      badgeBorder: "rgba(253, 191, 139, 0.4)",
      badgeBg: "rgba(255, 255, 255, 0.1)",
      title: (
        <>
          Consult Top Doctors &<br />
          <span style={{ color: "#FDBF8B" }}>Specialists Online</span>
        </>
      ),
      subtitle:
        "Instant video consultations with verified top doctors across 35+ medical specialties.",
      primaryBtn: "Find a Doctor",
      primaryAction: () => go("/doctors"),
      secondaryBtn: "Book Lab Test",
      secondaryAction: () => go("/labs"),
      bg: "/banner_healthcare_2.png",
    },
    {
      badge: "100% NABL ACCREDITED LABS",
      badgeIcon: <TestTube size={14} strokeWidth={2.4} aria-hidden="true" />,
      badgeColor: "#38bdf8",
      badgeBorder: "rgba(56, 189, 248, 0.4)",
      badgeBg: "rgba(15, 23, 42, 0.6)",
      title: (
        <>
          Accurate Diagnostic Tests &<br />
          <span style={{ color: "#38bdf8" }}>Home Sample Collection</span>
        </>
      ),
      subtitle:
        "Sample collection at your doorstep with guaranteed digital reports within 24 hours.",
      primaryBtn: "Book Lab Package",
      primaryAction: () => go("/labs"),
      bg: "/banner_healthcare_3.png",
    },
  ];

  const [dynamicSlides, setDynamicSlides] = useState(heroSlides);

  useEffect(() => {
    const fetchDynamicBanners = async () => {
      try {
        const res = await getBanners();
        const banners = res?.data || res || [];
        if (banners.length > 0) {
          const newSlides = await Promise.all(banners.map(async (b, i) => {
            const baseSlide = heroSlides[i % heroSlides.length];
            let fullImgUrl = "";
            if (b.img_url) {
              fullImgUrl = await fetchImageBlob(b.img_url, "bannerImages");
              if (!fullImgUrl) {
                fullImgUrl = getImageUrl(b.img_url, "bannerImages");
              }
            }
            return {
              ...baseSlide,
              bg: fullImgUrl || baseSlide.bg,
            };
          }));
          setDynamicSlides(newSlides);
        }
      } catch (e) {
        console.error("Error fetching banners:", e);
      }
    };
    fetchDynamicBanners();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % dynamicSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dynamicSlides.length]);

  // Auto-scroll testimonials
  useEffect(() => {
    if (!reviews || reviews.length === 0) return;

    const interval = setInterval(() => {
      if (reviewsHoverRef.current || reviewsFocusRef.current) return;
      // wait a full interval after the user stops interacting
      if (Date.now() - reviewsLastInteractionRef.current < 4000) return;
      if (reviewsScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          reviewsScrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const scrollAmount = clientWidth / 2;

        if (scrollLeft >= maxScroll - 10) {
          reviewsScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          reviewsScrollRef.current.scrollBy({
            left: scrollAmount,
            behavior: "smooth",
          });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [reviews]);

  const tickerItems = [
    {
      icon: Sparkles,
      text: "Avail flat 20% off on all Full Body Checkups this week!",
    },
    {
      icon: Building2,
      text: "24/7 Emergency Services now active in Bangalore, Mumbai, and Delhi",
    },
    {
      icon: Star,
      text: "Free consultation with our top specialists for ABHA card holders",
    },
  ];

  return (
    <main className="page page-enter home-page" style={{ padding: 0 }}>
      {/* ── Emergency & Ticker ── */}
      <div
        className="home-alert-strip"
        style={{
          background: "linear-gradient(90deg, #0d5c63, #2E666E)",
          color: "white",
        }}
      >
        <div className="container home-alert-row">
          <div className="home-alert-emergency">
            <Siren size={18} strokeWidth={2.3} aria-hidden="true" />
            <span>Medical Emergency?</span>
          </div>
          <button
            onClick={() => setShowAmbulanceModal(true)}
            className="btn home-alert-call"
          >
            <PhoneCall size={17} strokeWidth={2.3} aria-hidden="true" />
            <span>Call Ambulance</span>
          </button>
          <span className="home-alert-divider" aria-hidden="true" />
          <span className="home-alert-updates">Updates</span>
          <div className="ticker-wrap">
            <span className="ticker-content">
              {[...tickerItems, ...tickerItems].map(
                ({ icon: Icon, text }, index) => (
                  <span className="ticker-item" key={`${text}-${index}`}>
                    <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span>{text}</span>
                    <span className="ticker-separator" aria-hidden="true">
                      •
                    </span>
                  </span>
                ),
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Carousel Banner ── */}
      <section
        className="home-hero-section"
        style={{
          position: "relative",
          width: "100%",
          minHeight: "480px",
          overflow: "hidden",
        }}
      >
        {dynamicSlides.map((slide, idx) => (
          <div
            key={`${slide.bg}-${idx}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: idx === currentSlide ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
              zIndex: idx === currentSlide ? 1 : 0,
            }}
          >
            <img
              src={slide.bg}
              alt={`Banner ${idx + 1}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                display: "block",
              }}
            />
            {slide.title && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%)",
                }}
              ></div>
            )}
          </div>
        ))}

        {/* Carousel Navigation Arrows */}
        <button
          className="home-hero-arrow home-hero-arrow-prev"
          onClick={() =>
            setCurrentSlide((prev) =>
              prev === 0 ? dynamicSlides.length - 1 : prev - 1,
            )
          }
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#ffffff",
            color: "#1e293b",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 20,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-50%) scale(1.08)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(-50%) scale(1)")
          }
          aria-label="Previous Slide"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          className="home-hero-arrow home-hero-arrow-next"
          onClick={() =>
            setCurrentSlide((prev) => (prev + 1) % dynamicSlides.length)
          }
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#ffffff",
            color: "#1e293b",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 20,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-50%) scale(1.08)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(-50%) scale(1)")
          }
          aria-label="Next Slide"
        >
          <ChevronRight size={20} />
        </button>

        {/* Overlay Content */}
        <div
          className="container"
          style={{
            position: "relative",
            height: "100%",
            minHeight: "480px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            zIndex: 10,
            padding: "48px 24px",
            pointerEvents: "none",
          }}
        >
          {dynamicSlides.map(
            (slide, idx) =>
              idx === currentSlide && (
                <div
                  key={idx}
                  className="animate-fade-in-up"
                  style={{ maxWidth: "640px", pointerEvents: "auto" }}
                >
                  {slide.badge && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: slide.badgeBg,
                        backdropFilter: "blur(10px)",
                        color: slide.badgeColor,
                        padding: "8px 18px",
                        borderRadius: "99px",
                        fontSize: "12px",
                        fontWeight: "700",
                        marginBottom: "20px",
                        border: `1px solid ${slide.badgeBorder}`,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {slide.badgeIcon}
                      <span>{slide.badge}</span>
                    </span>
                  )}
                  {slide.title && (
                    <h1
                      className="hero-title"
                      style={{
                        fontSize: "42px",
                        fontWeight: "800",
                        color: "white",
                        lineHeight: 1.15,
                        marginBottom: "20px",
                        letterSpacing: "-0.02em",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {slide.title}
                    </h1>
                  )}
                  {slide.subtitle && (
                    <p
                      className="hero-subtext"
                      style={{
                        fontSize: "17px",
                        color: "rgba(255,255,255,0.85)",
                        marginBottom: "32px",
                        lineHeight: 1.6,
                      }}
                    >
                      {slide.subtitle}
                    </p>
                  )}

                  {(slide.primaryBtn || slide.secondaryBtn) && (
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {/* Primary Orange CTA Button */}
                      {slide.primaryBtn && (
                        <button
                          onClick={slide.primaryAction}
                          style={{
                            padding: "14px 28px",
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#ffffff",
                            background:
                              "linear-gradient(135deg, #FF6B00 0%, #F97316 100%)",
                            border: "none",
                            borderRadius: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)",
                            transition: "all 0.3s",
                          }}
                          onMouseEnter={(e) =>
                          (e.currentTarget.style.transform =
                            "translateY(-2px)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "translateY(0)")
                          }
                        >
                          <span>{slide.primaryBtn}</span>{" "}
                          <ArrowRight size={16} />
                        </button>
                      )}

                      {/* Secondary Outlined CTA Button */}
                      {slide.secondaryBtn && (
                        <button
                          onClick={slide.secondaryAction}
                          style={{
                            padding: "14px 28px",
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#ffffff",
                            background:
                              "linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.14))",
                            border: "1.5px solid rgba(255, 255, 255, 0.78)",
                            borderRadius: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            backdropFilter: "blur(18px) saturate(165%)",
                            WebkitBackdropFilter: "blur(18px) saturate(165%)",
                            boxShadow:
                              "0 10px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.38)",
                            textShadow: "0 1px 3px rgba(0, 0, 0, 0.45)",
                            transition: "all 0.3s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.24))";
                            e.currentTarget.style.borderColor = "#ffffff";
                            e.currentTarget.style.boxShadow =
                              "0 12px 32px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.5)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.14))";
                            e.currentTarget.style.borderColor =
                              "rgba(255, 255, 255, 0.78)";
                            e.currentTarget.style.boxShadow =
                              "0 10px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.38)";
                          }}
                        >
                          {slide.secondaryBtn}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ),
          )}
        </div>

        {/* Navigation Dots */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            gap: "8px",
          }}
        >
          {dynamicSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              style={{
                width: idx === currentSlide ? "28px" : "10px",
                height: "10px",
                borderRadius: "5px",
                background:
                  idx === currentSlide ? "white" : "rgba(255, 255, 255, 0.4)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Value Props ── */}
      <section style={{ padding: "20px 0" }}>
        <div className="container">
          <div className="trust-features-panel trust-features-panel--home">
            <div className="trust-features-grid">
              {[
                { icon: <Star size={24} />, title: "4.9/5 Rating", sub: "From 1M+ Users", color: "#D97706", bg: "#FEF3C7" },
                { icon: <ShieldCheck size={24} />, title: "NABH Accredited", sub: "Quality Assured", color: "var(--primary)", bg: "var(--primary-light)" },
                { icon: <PhoneCall size={24} />, title: "24/7 Support", sub: "Always here for you", color: "#2563EB", bg: "#DBEAFE" },
                { icon: <Pill size={24} />, title: "100% Genuine", sub: "Medicines & Tests", color: "var(--accent)", bg: "#FEF0E2" },
              ].map((v, i) => (
                <div
                  key={i}
                  className="trust-feature-item animate-fade-in-up"
                  style={{ "--tf-color": v.color, "--tf-bg": v.bg, animationDelay: `${i * 80}ms` }}
                >
                  <div className="trust-feature-icon" style={{ background: v.bg, color: v.color }}>
                    {v.icon}
                  </div>
                  <div>
                    <h4>{v.title}</h4>
                    <p>{v.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Arvaya Ecosystem ── */}
      <div
        className="bg-mesh-primary"
        style={{ padding: "56px 0", borderBottom: "1px solid var(--border)" }}
      >
        <section className="container" style={{ padding: "0 24px" }}>
          <style>{`
          .ecosystem-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; align-items: stretch; }
          .ecosystem-grid > * { flex: 1; min-width: 250px; max-width: 320px; }
          @media (max-width: 900px) { .ecosystem-grid { justify-content: center; } }
        `}</style>
          <div className="flex flex-col items-center text-center mb-8 w-full">
            <span className="home-how-eyebrow">
              <Sparkles size={14} /> All-in-one
            </span>
            <h2 className="text-h2">
              Your Health{" "}
              <span className="home-how-highlight">Ecosystem</span>
            </h2>
            <p className="text-muted mt-2">
              Manage everything from one place
            </p>
          </div>

          <div className="ecosystem-grid">
            {[
              // {
              //   title: "ABHA Hub",
              //   sub: "Create & link your ABHA ID for seamless health data access",
              //   icon: <CreditCard size={29} strokeWidth={1.8} />,
              //   link: "/abha",
              //   start: "#10add5",
              //   end: "#087eb8",
              //   iconColor: "#087b9c",
              // },
              {
                title: "Care Journey",
                sub: "Track your treatment progress and personalized care plans",
                icon: <Activity size={29} strokeWidth={1.8} />,
                bgIcon: <Activity size={150} strokeWidth={1.2} />,
                badge: "Personalised",
                features: ["Care plans", "Progress tracking"],
                link: "/care-journey",
                start: "#10add5",
                end: "#087eb8",
                iconColor: "#087b9c",
              },
              {
                title: "Arvaya Rewards",
                sub: "Earn points on every booking and redeem exclusive offers",
                icon: <Gift size={29} strokeWidth={1.8} />,
                bgIcon: <Gift size={150} strokeWidth={1.2} />,
                badge: "Earn & Save",
                features: ["Points on bookings", "Exclusive offers"],
                link: "/rewards",
                start: "#aa56f3",
                end: "#7d2be8",
                iconColor: "#7d2be8",
              },
              {
                title: "Digital Wallet",
                sub: "Fast, secure payments with instant refunds guaranteed",
                icon: <Wallet size={29} strokeWidth={1.8} />,
                bgIcon: <Wallet size={150} strokeWidth={1.2} />,
                badge: "Secure",
                features: ["Quick payments", "Instant refunds"],
                link: "/wallet",
                start: "#12bca0",
                end: "#087f74",
                iconColor: "#087b73",
              },
              // {
              //   title: "Health Records",
              //   sub: "Your complete medical history, encrypted and always accessible",
              //   icon: <FileText size={29} strokeWidth={1.8} />,
              //   link: "/records",
              //   start: "#ff9d42",
              //   end: "#ef701b",
              //   iconColor: "#d95f10",
              // },
            ].map((item, idx) => (
              <article
                key={item.title}
                className="ecosystem-card cursor-pointer animate-fade-in-up"
                style={{
                  "--eco-start": item.start,
                  "--eco-end": item.end,
                  "--eco-icon-color": item.iconColor,
                  animationDelay: `${idx * 80}ms`,
                }}
                onClick={() => go(item.link)}
              >
                <span
                  className="ecosystem-orb ecosystem-orb-top"
                  aria-hidden="true"
                />
                <span
                  className="ecosystem-orb ecosystem-orb-bottom"
                  aria-hidden="true"
                />
                <span className="ecosystem-card-bgicon" aria-hidden="true">
                  {item.bgIcon}
                </span>
                <div className="ecosystem-card-top">
                  <div className="ecosystem-card-icon">{item.icon}</div>
                  <span className="ecosystem-card-badge">{item.badge}</span>
                  <div className="ecosystem-card-arrow" aria-hidden="true">
                    <ArrowUpRight size={23} strokeWidth={2.1} />
                  </div>
                </div>
                <div className="ecosystem-card-copy">
                  <h3>{item.title}</h3>
                  <p>{item.sub}</p>
                  <div className="ecosystem-card-features">
                    {item.features.map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                  <span className="ecosystem-card-action">
                    Explore <ArrowRight size={16} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ── How It Works ── */}
      <section className="home-how-section">
        <div className="container home-how-panel">
          <span className="home-how-orb home-how-orb-1" aria-hidden="true" />
          <span className="home-how-orb home-how-orb-2" aria-hidden="true" />

          <div className="home-how-heading text-center flex flex-col items-center">
            <span className="home-how-eyebrow">
              <Sparkles size={14} /> Simple &amp; Quick
            </span>
            <h2 className="text-h2">
              How It <span className="home-how-highlight">Works</span>
            </h2>
            <p className="text-muted mt-2">
              Book a doctor appointment in 3 simple steps
            </p>
          </div>

          <div className="how-it-works-grid">
            {[
              {
                step: "1",
                icon: <Search size={28} />,
                title: "Search",
                desc: "Find specialists by name, specialty, or location",
                chip: "Verified doctors",
                chipIcon: <ShieldCheck size={13} />,
                color: "#f28a28",
                soft: "#fff3e8",
              },
              {
                step: "2",
                icon: <CalendarCheck size={28} />,
                title: "Book",
                desc: "Pick a convenient slot and confirm instantly",
                chip: "Instant confirmation",
                chipIcon: <Clock size={13} />,
                color: "#08a57b",
                soft: "#e8faf4",
              },
              {
                step: "3",
                icon: <Stethoscope size={28} />,
                title: "Consult",
                desc: "Visit the clinic or join a video consultation",
                chip: "In-clinic or online",
                chipIcon: <Smartphone size={13} />,
                color: "#2583d8",
                soft: "#edf6ff",
              },
            ].map((s, i) => (
              <article
                key={s.step}
                className="home-how-card animate-fade-in-up"
                style={{
                  "--step-accent": s.color,
                  "--step-soft": s.soft,
                  animationDelay: `${i * 150}ms`,
                }}
              >
                <span className="home-how-watermark" aria-hidden="true">
                  0{s.step}
                </span>
                <div className="home-how-card-top">
                  <div className="home-how-icon">
                    {s.icon}
                    <span className="home-how-step">{s.step}</span>
                  </div>
                </div>
                <div className="home-how-copy">
                  <span className="home-how-label">Step 0{s.step}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <span className="home-how-chip">
                    {s.chipIcon}
                    {s.chip}
                  </span>
                </div>
                {i < 2 && (
                  <span className="home-how-connector" aria-hidden="true">
                    <span>
                      <ArrowRight size={15} strokeWidth={2.2} />
                    </span>
                  </span>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Consult Top Specialties ── */}
      <section
        className="container home-specialties-section"
        style={{ padding: "56px 24px" }}
      >
        <style>{`
          .specialties-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; }
          @media (max-width: 900px) { .specialties-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 600px) { .specialties-grid { grid-template-columns: repeat(2, 1fr); } }
        `}</style>
        <div className="mb-8 w-full">
          <div className="flex flex-col items-center text-center">
            <span className="home-how-eyebrow">
              <Stethoscope size={14} /> Expert Care
            </span>
            <h2 className="text-h2">
              Consult Top <span className="home-how-highlight">Specialties</span>
            </h2>
            <p className="text-muted mt-2">
              Consult with India's best specialists
            </p>
          </div>
        </div>

        <div className="specialties-grid">
          {[
            {
              name: "Cardiology",
              icon: <Heart size={28} strokeWidth={1.7} />,
              consults: "2.5k+",
              color: "#ff8a1f",
              soft: "#fff5e8",
            },
            {
              name: "Neurology",
              icon: <Brain size={28} strokeWidth={1.7} />,
              consults: "1.8k+",
              color: "#08aa79",
              soft: "#e9faf4",
            },
            {
              name: "Pediatrics",
              icon: <Baby size={28} strokeWidth={1.7} />,
              consults: "3.2k+",
              color: "#2b84ef",
              soft: "#edf5ff",
            },
            {
              name: "Orthopedics",
              icon: <Bone size={28} strokeWidth={1.7} />,
              consults: "1.4k+",
              color: "#8e52ef",
              soft: "#f4efff",
            },
            {
              name: "General Medicine",
              icon: <Activity size={28} strokeWidth={1.7} />,
              consults: "5.1k+",
              color: "#ef4054",
              soft: "#fff0f2",
            },
            {
              name: "Dermatology",
              icon: <Eye size={28} strokeWidth={1.7} />,
              consults: "2.1k+",
              color: "#05a9c4",
              soft: "#eafafd",
            },
          ].map((spec, i) => (
            <div
              key={spec.name}
              className="home-spec-card animate-scale-in"
              style={{
                "--specialty-accent": spec.color,
                "--specialty-soft": spec.soft,
                animationDelay: `${i * 60}ms`,
              }}
              onClick={() => go("/doctors")}
            >
              <div className="home-spec-icon">{spec.icon}</div>
              <b className="home-spec-title">{spec.name}</b>
              <span className="home-spec-meta">
                <span className="home-spec-count">{spec.consults} consults</span>
                <span className="home-spec-cta" aria-hidden="true">
                  Consult now <ArrowRight size={13} strokeWidth={2.4} />
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="home-spec-footer">
          <button className="home-spec-viewall" onClick={() => go("/doctors")}>
            View all specialties <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Featured Lab Packages ── */}
      <section className="home-pkg-section">
        <div className="container">
          <div className="mb-8 w-full">
            <div className="flex flex-col items-center text-center">
              <span className="home-how-eyebrow">
                <TestTube size={14} /> Lab Tests at Home
              </span>
              <h2 className="text-h2">
                Featured Health <span className="home-how-highlight">Packages</span>
              </h2>
              <p className="text-muted mt-2">
                Comprehensive checkups with home sample collection
              </p>
            </div>
          </div>

          <div className="packages-grid">
            {apiPackages.map((pkg, idx) => {
              const openPkg = () =>
                go(
                  `/labs/package-details/${encodeURIComponent(pkg.id || pkg.title)}`,
                  { state: { package: pkg } },
                );
              return (
                <article
                  className="home-pkg-card animate-fade-in-up"
                  key={pkg.id || pkg.title}
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onClick={openPkg}
                >
                  <div className="home-pkg-media">
                    <img src={pkg.img} alt={pkg.title} />
                    <span className="home-pkg-chip">
                      <TestTube size={12} /> Home sample
                    </span>
                  </div>
                  <div className="home-pkg-body">
                    <h3 className="home-pkg-title">{pkg.title}</h3>
                    <span className="home-pkg-tests">
                      <ShieldCheck size={13} /> {pkg.tests}
                    </span>
                    <div className="home-pkg-footer">
                      <div className="home-pkg-price">
                        <small>Starting at</small>
                        <strong>{pkg.price}</strong>
                      </div>
                      <button
                        className="home-pkg-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPkg();
                        }}
                      >
                        View Details <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="home-spec-footer">
            <button className="home-spec-viewall" onClick={() => go("/labs")}>
              View all packages <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="home-reviews-section">
        <div className="container">
          <div className="home-reviews-heading">
            <span className="home-how-eyebrow">
              <Heart size={14} /> Patient Stories
            </span>
            <h2 className="text-h2">
              What Our <span className="home-how-highlight">Patients</span> Say
            </h2>
            <p className="text-muted mt-2">
              Join 1 million+ happy patients across India
            </p>
          </div>

          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setReviewsPause(reviewsHoverRef, true)}
            onMouseLeave={() => setReviewsPause(reviewsHoverRef, false)}
            // only keyboard focus pauses; focus left behind by a mouse click doesn't
            onFocus={(e) => {
              if (e.target.matches(":focus-visible")) {
                setReviewsPause(reviewsFocusRef, true);
              }
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setReviewsPause(reviewsFocusRef, false);
              }
            }}
            onTouchStart={() => (reviewsLastInteractionRef.current = Date.now())}
          >
            <button
              className="review-nav-btn left"
              onClick={() => scrollReviews("left")}
              aria-label="Previous reviews"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="review-nav-btn right"
              onClick={() => scrollReviews("right")}
              aria-label="Next reviews"
            >
              <ChevronRight size={20} />
            </button>

            <div className="testimonials-slider" ref={reviewsScrollRef}>
              {reviews.map((t, i) => (
                <div key={i} className="testimonial-card-wrap">
                  <article
                    tabIndex={0}
                    className="home-review-card animate-fade-in-up"
                    style={{
                      "--review-accent": ["#08a57b", "#2583d8", "#f28a28", "#8e52ef"][i % 4],
                      animationDelay: `${(i % 3) * 100}ms`,
                    }}
                  >
                    <Quote className="home-review-quote" size={64} aria-hidden="true" />
                    <div className="home-review-stars" aria-label={`${t.rating} out of 5 stars`}>
                      {Array(5)
                        .fill(null)
                        .map((_, si) => (
                          <Star
                            key={si}
                            size={16}
                            fill={si < t.rating ? "#FBBF24" : "none"}
                            color={si < t.rating ? "#FBBF24" : "#d6dde0"}
                          />
                        ))}
                    </div>
                    <p className="home-review-text">"{t.text}"</p>
                    <div className="home-review-author">
                      <div className="home-review-avatar">{t.name.charAt(0)}</div>
                      <div>
                        <b>{t.name}</b>
                        <span>{t.role}</span>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── App Download CTA ── */}
      <section style={{ padding: "24px 0 30px" }}>
        <div className="container">
          <div
            className="animate-fade-in-up home-cta-card"
            style={{
              backgroundImage:
                "url('/app-download-background1.png'), linear-gradient(112deg, #064b58 0%, #08727d 48%, #25b4b1 100%)",
              backgroundSize: "calc(100% + 60px) auto",
              backgroundPosition: "100% 40%",
              backgroundRepeat: "no-repeat",
              borderRadius: "30px",
              minHeight: "320px",
              padding: "16px 36px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 24px 42px rgba(30, 103, 112, 0.28)",
              position: "relative",
              overflow: "hidden",
              flexWrap: "nowrap",
              gap: "32px",
            }}
          >
            {/* Decorative glow & arcs */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                right: "26%",
                transform: "translateY(-50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(150,235,235,0.20) 0%, rgba(150,235,235,0.07) 42%, transparent 68%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-40%",
                left: "-5%",
                width: "300px",
                height: "300px",
                background:
                  "radial-gradient(circle, rgba(251,145,63,0.1) 0%, transparent 70%)",
                borderRadius: "50%",
                zIndex: 0,
              }}
            />
            <svg
              viewBox="0 0 400 400"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "420px",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0,
              }}
            >
              <path
                d="M120 -40 C 300 40, 380 200, 300 440"
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1.5"
              />
              <path
                d="M210 -60 C 400 60, 440 240, 360 460"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1.5"
              />
            </svg>

            <div
              className="home-cta-copy"
              style={{ position: "relative", zIndex: 2, maxWidth: "460px" }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.9)",
                  padding: "6px 16px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "18px",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Smartphone size={14} aria-hidden="true" /> Available on iOS &
                Android
              </span>
              <h2
                className="text-h2"
                style={{
                  color: "white",
                  marginBottom: "16px",
                }}
              >
                Get the Arvaya App
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,1)",
                  textShadow: "0 2px 4px rgba(0,0,0,1)",
                  fontSize: "17px",
                  lineHeight: 1.55,
                  marginBottom: "34px",
                }}
              >
                Book appointments, manage health records, order medicines, and
                earn rewards — all from your pocket.
              </p>
              <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
                <button
                  className="btn glare-btn"
                  style={{
                    padding: "6px 22px",
                    background: "#000000",
                    color: "#ffffff",
                    fontWeight: "700",
                    boxShadow: "0 5px 14px rgba(0,0,0,0.24)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                  onClick={() =>
                    window.open(APP_STORE_URL, "_blank", "noopener,noreferrer")
                  }
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "8px",
                      background: "#171717",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.51-3.74 4.25z" />
                    </svg>
                  </span>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700" }}>
                      App Store
                    </span>
                  </span>
                </button>
                <button
                  className="btn glare-btn"
                  style={{
                    padding: "6px 22px",
                    background: "#ffffff",
                    color: "#111111",
                    border: "1px solid rgba(15,23,42,0.12)",
                    boxShadow: "0 5px 14px rgba(0,0,0,0.24)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                  onClick={() =>
                    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer")
                  }
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/google-play-logo.svg"
                      alt=""
                      width="15"
                      height="17"
                      style={{ display: "block" }}
                    />
                  </span>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700" }}>
                      Google Play
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {/* Stats overlay on the supplied background artwork */}
            <div
              className="home-cta-visual"
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: "24px",
                flexWrap: "nowrap",
              }}
            >
              <div
                className="home-cta-stats-row"
                style={{ display: "flex", gap: "7px", flexWrap: "nowrap" }}
              >
                {[
                  {
                    icon: <Download size={18} aria-hidden="true" />,
                    num: "1M+",
                    label: "Downloads",
                  },
                  {
                    icon: <Star size={18} fill="white" aria-hidden="true" />,
                    num: "4.9★",
                    label: "App Rating",
                  },
                  {
                    icon: <Users size={18} aria-hidden="true" />,
                    num: "50K+",
                    label: "Daily Users",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="home-cta-stat-card"
                    style={{
                      width: "90px",
                      padding: "10px 6px 9px",
                      borderRadius: "16px",
                      background: "rgba(121, 237, 231, 0.18)",
                      border: "1px solid rgba(210,255,250,0.32)",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.24)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "rgba(210,255,250,0.2)",
                        border: "1px solid rgba(220,255,252,0.38)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {s.icon}
                    </span>
                    <b
                      style={{
                        display: "block",
                        fontSize: "18px",
                        fontWeight: "800",
                        color: "white",
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.num}
                    </b>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "rgba(239,255,253,0.86)",
                        fontWeight: "600",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded CSS for Home Responsiveness */}
      <style>{`
        .how-it-works-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 768px) {
          .home-hero-section {
            min-height: 420px !important;
          }
          .hero-title {
            font-size: 32px !important;
          }
          .hero-subtext {
            font-size: 15px !important;
          }
          .how-it-works-grid {
            grid-template-columns: 1fr !important;
            gap: 64px !important;
          }
          .home-cta-card {
            padding: 26px 24px !important;
            min-height: 0 !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            background-image:
              linear-gradient(180deg, rgba(5,44,52,0.94) 0%, rgba(5,44,52,0.78) 38%, rgba(5,44,52,0.4) 68%, rgba(5,44,52,0.12) 100%),
              url('/app-download-background1.png'),
              linear-gradient(112deg, #064b58 0%, #08727d 48%, #25b4b1 100%) !important;
            background-size: 100% 100%, 190% auto, 100% 100% !important;
            background-position: center, 78% 100%, center !important;
            background-repeat: no-repeat, no-repeat, no-repeat !important;
          }
          .home-cta-copy {
            width: 100% !important;
            max-width: 100% !important;
          }
          .home-cta-visual {
            gap: 24px !important;
            width: 100% !important;
            margin-top: 8px !important;
          }
          .home-cta-stats-row {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .home-cta-stat-card {
            width: 31% !important;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 26px !important;
          }
          .home-cta-stat-card {
            padding: 9px 4px 8px !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .home-cta-card {
            padding: 16px 28px !important;
          }
          .home-cta-copy {
            max-width: 48% !important;
          }
          .home-cta-visual {
            gap: 14px !important;
          }
          .home-cta-stat-card {
            width: 76px !important;
          }
        }
      `}</style>

      {showAmbulanceModal && (
        <AmbulanceRequestModal onClose={() => setShowAmbulanceModal(false)} />
      )}
    </main>
  );
}
