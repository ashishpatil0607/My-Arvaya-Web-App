import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Heart,
  Hand,
  HeartPulse,
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
  X,
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
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import useScrollLock from "../hooks/useScrollLock";
import { fallbackHealthPackages, normalizeHealthPackage } from "../utils/healthPackages";
import { getNameInitials } from "../utils/formatName";
import AmbulanceRequestModal from "../components/ambulance/AmbulanceRequestModal";
import AmbulanceLoginPrompt from "../components/ambulance/AmbulanceLoginPrompt";
import {
  getBanners,
  getDiagnosticPackages,
  getPatientReviews,
} from "../services/dataService";
import { getImageUrl, fetchImageBlob } from "../services/uploadService";
import { useAuth } from "../context/AuthContext";
import CardsSkeleton from "../components/labs/CardsSkeleton";

// "just now", "5 minutes ago", "1 week ago", ... from a timestamp string;
// anything older than two weeks shows the exact date and time
function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  // older than two weeks: show the exact date and time instead
  if (seconds > 14 * 24 * 3600) {
    return new Date(then).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const units = [
    ["week", 7 * 24 * 3600],
    ["day", 24 * 3600],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [label, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

// Clamps long review text to a few lines; "Read more" opens the full review
function ReviewText({ text, onReadMore }) {
  const textRef = useRef(null);
  const [isLong, setIsLong] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const check = () => setIsLong(el.scrollHeight > el.clientHeight + 1);
    check();
    // re-check whenever the card is laid out / resized (slider, fonts, viewport)
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="home-review-body">
      <p ref={textRef} className="home-review-text clamped">
        "{text}"
      </p>
      {isLong && (
        <button type="button" className="home-review-more" onClick={onReadMore}>
          Read more
        </button>
      )}
    </div>
  );
}

function ReviewModal({ review, accent, onClose }) {
  useScrollLock();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="review-modal-overlay" onClick={onClose}>
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Review by ${review.name}`}
        style={{ "--review-accent": accent }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="review-modal-header">
          <Quote className="review-modal-header-quote" size={110} aria-hidden="true" />
          <button
            type="button"
            className="review-modal-close"
            onClick={onClose}
            aria-label="Close review"
          >
            <X size={18} />
          </button>
          <div className="review-modal-avatar">{getNameInitials(review.name)}</div>
          <div className="review-modal-person">
            <b>{review.name}</b>
            <span>
              <ShieldCheck size={14} /> {review.role}
            </span>
            {review.time && <small className="review-modal-time">{review.time}</small>}
          </div>
        </div>

        <div className="review-modal-body">
          <div className="review-modal-rating">
            <div className="home-review-stars" aria-label={`${review.rating} out of 5 stars`}>
              {Array(5)
                .fill(null)
                .map((_, si) => (
                  <Star
                    key={si}
                    size={20}
                    fill={si < review.rating ? "#FBBF24" : "none"}
                    color={si < review.rating ? "#FBBF24" : "#d6dde0"}
                  />
                ))}
            </div>
            <span className="review-modal-score">{review.rating} / 5</span>
          </div>

          <div className="review-modal-quote">
            <Quote className="review-modal-quote-icon" size={22} aria-hidden="true" />
            <p className="review-modal-text">{review.text}</p>
          </div>

          <button type="button" className="review-modal-done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const REVIEW_ACCENTS = ["#08a57b", "#2583d8", "#f28a28", "#8e52ef"];

export default function Home() {
  const go = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Scroll to a section when arriving with a hash (e.g. /#download-app)
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, location.key]);
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
  // Show each nav button only when there are cards hidden on that side
  const [canScrollReviewsLeft, setCanScrollReviewsLeft] = useState(false);
  const [canScrollReviewsRight, setCanScrollReviewsRight] = useState(false);
  const updateReviewsNav = () => {
    const el = reviewsScrollRef.current;
    if (!el) return;
    setCanScrollReviewsLeft(el.scrollLeft > 5);
    setCanScrollReviewsRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);
  const [openReviewIndex, setOpenReviewIndex] = useState(null);
  const closeReview = useCallback(() => {
    // give the reader a moment before auto-scroll resumes
    reviewsLastInteractionRef.current = Date.now();
    setOpenReviewIndex(null);
  }, []);
  const [showAmbulanceLoginPrompt, setShowAmbulanceLoginPrompt] = useState(false);
  // Guests see the default packages; logged-in users start empty and wait for API data (avoids a flash of default items)
  const [apiPackages, setApiPackages] = useState(() => (user ? [] : fallbackHealthPackages.slice(0, 4)));
  const [loadingPackages, setLoadingPackages] = useState(!!user);
  const [reviews, setReviews] = useState([
    {
      name: "Ananya Reddy",
      role: "Bangalore",
      text: "Booking an appointment was incredibly seamless. The doctor was available the same day and the consultation was thorough. SeCURE Arvaya has become my go-to healthcare platform.",
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

  // Load reviews on mount, and reload whenever the FeedbackModal submits a new one
  useEffect(() => {
    let isMounted = true;
    const loadReviews = () =>
      getPatientReviews({ pageIndex: 0, pageSize: 0 })
        .then((apiReviews) => {
          if (!isMounted) return;
          if (Array.isArray(apiReviews) && apiReviews.length > 0) {
            const normalized = apiReviews.map((r) => ({
              name: r.patient_name || "Patient",
              role: "Verified Patient",
              text: r.review || "",
              rating: r.ratings || 5,
              time: formatTimeAgo(r.created_at),
            }));
            setReviews(normalized);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch /patientReview/get for Home:", err);
        });

    loadReviews();
    window.addEventListener("arvaya_feedback_submitted", loadReviews);
    return () => {
      isMounted = false;
      window.removeEventListener("arvaya_feedback_submitted", loadReviews);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (user) {
      setApiPackages([]);
      setLoadingPackages(true);
    } else {
      setApiPackages(fallbackHealthPackages.slice(0, 4));
      setLoadingPackages(false);
    }

    getDiagnosticPackages({ pageSize: 10 })
      .then((apiPkgs) => {
        if (!isMounted) return;
        if (Array.isArray(apiPkgs) && apiPkgs.length > 0) {
          const normalized = apiPkgs.map(normalizeHealthPackage);
          setApiPackages(normalized.slice(0, 4));
        } else {
          // Not logged in (API 401) or empty → same fallback list as Labs page
          setApiPackages(fallbackHealthPackages.slice(0, 4));
        }
      })
      .catch((err) => {
        console.error(
          "Failed to fetch /diagnostic/getPackages for Home:",
          err,
        );
      })
      .finally(() => {
        if (isMounted) setLoadingPackages(false);
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const heroSlides = [
    {
      badge: "15 MIN EMERGENCY RESPONSE",
      badgeIcon: Clock,
      accent: "#2dd4bf",
      title: "24/7 Smart ICU Emergency &",
      highlight: "Mobile Dispatch",
      subtitle:
        "Rapid emergency ambulance dispatch equipped with mobile life support and live tracking.",
      primaryBtn: "Request Ambulance",
      primaryAction: () => go("/ambulance"),
      bg: "/banner_healthcare_1.png",
    },
    {
      badge: "INDIA'S #1 HEALTHCARE PLATFORM",
      badgeIcon: ShieldCheck,
      accent: "#FDBF8B",
      title: "Consult Top Doctors &",
      highlight: "Specialists Online",
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
      badgeIcon: TestTube,
      accent: "#38bdf8",
      title: "Accurate Diagnostic Tests &",
      highlight: "Home Sample Collection",
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
    // hold the slider in place while a review is open in the modal
    if (openReviewIndex !== null) return;

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
  }, [reviews, openReviewIndex]);

  useEffect(() => {
    updateReviewsNav();
    window.addEventListener("resize", updateReviewsNav);
    return () => window.removeEventListener("resize", updateReviewsNav);
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
            onClick={() => (user ? setShowAmbulanceModal(true) : setShowAmbulanceLoginPrompt(true))}
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

      {/* ── Hero Banner ── */}
      <section className="arv-hero" aria-roledescription="carousel">
        <div className="arv-hero-stage">
          {dynamicSlides.map((slide, idx) => (
            <div
              key={`${slide.bg}-${idx}`}
              className={`arv-hero-bg${idx === currentSlide ? " is-active" : ""}`}
              aria-hidden={idx !== currentSlide}
            >
              <img src={slide.bg} alt="" />
            </div>
          ))}
          <div className="arv-hero-overlay" aria-hidden="true" />

          <button
            className="arv-hero-arrow arv-hero-arrow--prev"
            onClick={() =>
              setCurrentSlide((prev) =>
                prev === 0 ? dynamicSlides.length - 1 : prev - 1,
              )
            }
            aria-label="Previous Slide"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className="arv-hero-arrow arv-hero-arrow--next"
            onClick={() =>
              setCurrentSlide((prev) => (prev + 1) % dynamicSlides.length)
            }
            aria-label="Next Slide"
          >
            <ChevronRight size={22} />
          </button>

          <div className="container arv-hero-inner">
            {dynamicSlides.map(
              (slide, idx) =>
                idx === currentSlide && (
                  <div
                    key={idx}
                    className="arv-hero-copy animate-fade-in-up"
                    style={{ "--slide-accent": slide.accent || "var(--accent)" }}
                  >
                    {slide.badge && (
                      <span className="arv-hero-badge">
                        {slide.badgeIcon && (
                          <slide.badgeIcon size={14} strokeWidth={2.4} aria-hidden="true" />
                        )}
                        {slide.badge}
                      </span>
                    )}
                    <h1 className="arv-hero-title">
                      {slide.title}
                      {slide.highlight && (
                        <span className="arv-hero-highlight">{slide.highlight}</span>
                      )}
                    </h1>
                    <span className="arv-hero-rule" aria-hidden="true" />
                    {slide.subtitle && (
                      <p className="arv-hero-subtext">{slide.subtitle}</p>
                    )}
                    <div className="arv-hero-actions">
                      {slide.primaryBtn && (
                        <button
                          className="arv-hero-btn arv-hero-btn--primary"
                          onClick={slide.primaryAction}
                        >
                          {slide.primaryBtn}
                          <ArrowRight size={17} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                      )}
                      {slide.secondaryBtn && (
                        <button
                          className="arv-hero-btn arv-hero-btn--ghost"
                          onClick={slide.secondaryAction}
                        >
                          {slide.secondaryBtn}
                        </button>
                      )}
                    </div>
                  </div>
                ),
            )}
          </div>

          <div className="arv-hero-dots">
            {dynamicSlides.map((_, idx) => (
              <button
                key={idx}
                className={idx === currentSlide ? "is-active" : ""}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={idx === currentSlide}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section style={{ padding: "calc(var(--home-section-y) / 2) 0" }}>
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
        style={{ padding: "var(--home-section-y) 0", borderBottom: "1px solid var(--border)" }}
      >
        <section className="container" style={{ padding: "0 24px" }}>
          <style>{`
          .ecosystem-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; align-items: stretch; }
          .ecosystem-grid > * { flex: 1; min-width: 250px; max-width: 320px; }
          @media (max-width: 900px) { .ecosystem-grid { justify-content: center; } }
        `}</style>
          <div className="flex flex-col items-center text-center home-section-heading w-full">
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
              {
                title: "SeCURE Arvaya Rewards",
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
        style={{ padding: "var(--home-section-y) 24px" }}
      >
        <style>{`
          .specialties-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; }
          @media (max-width: 900px) { .specialties-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 600px) { .specialties-grid { grid-template-columns: repeat(2, 1fr); } }
        `}</style>
        <div className="home-section-heading w-full">
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
              icon: <HeartPulse size={28} strokeWidth={1.7} />,
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
              icon: <Stethoscope size={28} strokeWidth={1.7} />,
              consults: "5.1k+",
              color: "#ef4054",
              soft: "#fff0f2",
            },
            {
              name: "Dermatology",
              icon: <Hand size={28} strokeWidth={1.7} />,
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
          <div className="home-section-heading w-full">
            <div className="flex flex-col items-center text-center">
              <span className="home-how-eyebrow">
                <ShieldCheck size={14} /> Health Packages
              </span>
              <h2 className="text-h2">
                Featured Health <span className="home-how-highlight">Packages</span>
              </h2>
              <p className="text-muted mt-2">
                Comprehensive checkups with home sample collection
              </p>
            </div>
          </div>

          {loadingPackages && (
            <CardsSkeleton count={4} label="Loading health packages" />
          )}
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
                  </div>
                  <div className="home-pkg-body">
                    <h3 className="home-pkg-title">{pkg.title}</h3>
                    <span className="home-pkg-tests">
                      <ShieldCheck size={13} /> {pkg.tests}
                    </span>
                    <div className="home-pkg-footer">
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
            {canScrollReviewsLeft && (
              <button
                className="review-nav-btn left"
                onClick={() => scrollReviews("left")}
                aria-label="Previous reviews"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {canScrollReviewsRight && (
              <button
                className="review-nav-btn right"
                onClick={() => scrollReviews("right")}
                aria-label="Next reviews"
              >
                <ChevronRight size={20} />
              </button>
            )}

            <div
              className="testimonials-slider"
              ref={reviewsScrollRef}
              onScroll={updateReviewsNav}
            >
              {reviews.map((t, i) => (
                // entry animation lives on the wrapper so its fill-mode
                // transform doesn't override the card's hover transform
                <div
                  key={i}
                  className="testimonial-card-wrap animate-fade-in-up"
                  style={{ animationDelay: `${(i % 3) * 100}ms` }}
                >
                  <article
                    tabIndex={0}
                    className="home-review-card"
                    style={{ "--review-accent": REVIEW_ACCENTS[i % 4] }}
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
                    <ReviewText text={t.text} onReadMore={() => setOpenReviewIndex(i)} />
                    <div className="home-review-author">
                      <div className="home-review-avatar">{getNameInitials(t.name)}</div>
                      <div>
                        <b>{t.name}</b>
                        <span>{t.role}</span>
                        {t.time && <small className="home-review-time">{t.time}</small>}
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {openReviewIndex !== null && reviews[openReviewIndex] && (
        <ReviewModal
          review={reviews[openReviewIndex]}
          accent={REVIEW_ACCENTS[openReviewIndex % 4]}
          onClose={closeReview}
        />
      )}

      {/* ── App Download CTA ── */}
      <section id="download-app" className="arv-app-section">
        <div className="container">
          <div className="arv-app-card animate-fade-in-up">
            <div className="arv-app-overlay" aria-hidden="true" />

            <div className="arv-app-copy">
              <span className="arv-app-badge">
                <Smartphone size={14} aria-hidden="true" />
                Available on iOS &amp; Android
              </span>
              <h2 className="arv-app-title">
                Get the <span>SeCURE Arvaya App</span>
              </h2>
              <p className="arv-app-text">
                Book appointments, manage health records, order medicines, and
                earn rewards — all from your pocket.
              </p>
              <div className="arv-app-stores">
                <button
                  className="arv-store-btn arv-store-btn--apple glare-btn"
                  onClick={() =>
                    window.open(APP_STORE_URL, "_blank", "noopener,noreferrer")
                  }
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.51-3.74 4.25z" />
                  </svg>
                  <span className="arv-store-label">
                    <small>Download on the</small>
                    App Store
                  </span>
                </button>
                <button
                  className="arv-store-btn arv-store-btn--play glare-btn"
                  onClick={() =>
                    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer")
                  }
                >
                  <img src="/google-play-logo.svg" alt="" width="20" height="22" />
                  <span className="arv-store-label">
                    <small>Get it on</small>
                    Google Play
                  </span>
                </button>
              </div>
            </div>

            <ul className="arv-app-stats">
              {[
                { icon: Download, num: "1M+", label: "Downloads" },
                { icon: Star, num: "4.9", label: "App Rating", filled: true },
                { icon: Users, num: "50K+", label: "Daily Users" },
              ].map(({ icon: Icon, num, label, filled }) => (
                <li key={label} className="arv-app-stat">
                  <span className="arv-app-stat-icon">
                    <Icon size={18} strokeWidth={2.2} fill={filled ? "currentColor" : "none"} aria-hidden="true" />
                  </span>
                  <span>
                    <b>{num}</b>
                    <small>{label}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Embedded CSS for Home Responsiveness */}
      <style>{`
        .arv-hero {
          position: relative;
          margin-top: 18px;
        }
        .arv-hero-stage {
          position: relative;
          height: 520px;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: var(--primary-deep, #03494e);
        }
        .arv-hero-bg {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: scale(1.06);
          transition: opacity 1.2s ease-in-out, transform 6s ease-out;
        }
        .arv-hero-bg.is-active {
          opacity: 1;
          transform: scale(1);
        }
        .arv-hero-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: right center;
          display: block;
        }
        .arv-hero-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            radial-gradient(circle at 12% 85%, rgba(8, 120, 125, 0.45), transparent 45%),
            linear-gradient(90deg, rgba(3, 40, 44, 0.95) 0%, rgba(4, 58, 63, 0.82) 38%, rgba(5, 73, 78, 0.35) 70%, rgba(5, 73, 78, 0.08) 100%);
        }
        .arv-hero-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 72px 96px 84px;
        }
        .arv-hero-copy {
          max-width: 640px;
        }
        .arv-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 99px;
          border: 1px solid color-mix(in srgb, var(--slide-accent) 45%, transparent);
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--slide-accent);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .arv-hero-title {
          margin: 0;
          color: #fff;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: clamp(2.2rem, 4vw, 3.25rem);
          line-height: 1.1;
          letter-spacing: -0.025em;
          text-wrap: balance;
          text-shadow: 0 2px 18px rgba(0, 0, 0, 0.25);
        }
        .arv-hero-highlight {
          display: block;
          color: var(--slide-accent);
        }
        .arv-hero-rule {
          display: block;
          width: 72px;
          height: 4px;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--slide-accent), transparent);
          margin: 22px 0 20px;
        }
        .arv-hero-subtext {
          margin: 0 0 32px;
          max-width: 540px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 18px;
          line-height: 1.6;
        }
        .arv-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        .arv-hero-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 30px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.25s, background 0.25s, border-color 0.25s, box-shadow 0.25s;
        }
        .arv-hero-btn:hover {
          transform: translateY(-2px);
        }
        .arv-hero-btn:focus-visible,
        .arv-hero-arrow:focus-visible,
        .arv-hero-dots button:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 3px;
        }
        .arv-hero-btn--primary {
          border: none;
          background: linear-gradient(135deg, #FF6B00 0%, #F97316 100%);
          color: #fff;
          box-shadow: 0 10px 26px rgba(249, 115, 22, 0.38);
        }
        .arv-hero-btn--primary:hover {
          box-shadow: 0 14px 32px rgba(249, 115, 22, 0.5);
        }
        .arv-hero-btn--primary svg {
          transition: transform 0.25s;
        }
        .arv-hero-btn--primary:hover svg {
          transform: translateX(4px);
        }
        .arv-hero-btn--ghost {
          border: 1.5px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .arv-hero-btn--ghost:hover {
          border-color: #fff;
          background: rgba(255, 255, 255, 0.16);
        }
        .arv-hero-arrow {
          position: absolute;
          top: 50%;
          z-index: 3;
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #fff;
          cursor: pointer;
          transform: translateY(-50%);
          transition: background 0.25s, color 0.25s, transform 0.25s;
        }
        .arv-hero-arrow:hover {
          background: #fff;
          color: var(--primary-deep, #03494e);
          transform: translateY(-50%) scale(1.06);
        }
        .arv-hero-arrow--prev {
          left: 24px;
        }
        .arv-hero-arrow--next {
          right: 24px;
        }
        .arv-hero-dots {
          position: absolute;
          left: 50%;
          bottom: 26px;
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          gap: 8px;
        }
        .arv-hero-dots button {
          width: 10px;
          height: 10px;
          padding: 0;
          border: none;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .arv-hero-dots button.is-active {
          width: 30px;
          background: #fff;
        }

        @media (max-width: 768px) {
          .arv-hero {
            margin-top: 12px;
          }
          .arv-hero-stage {
            height: 500px;
            align-items: flex-end;
          }
          .arv-hero-overlay {
            background: linear-gradient(180deg, rgba(3, 40, 44, 0.45) 0%, rgba(4, 58, 63, 0.85) 50%, rgba(3, 40, 44, 0.97) 100%);
          }
          .arv-hero-bg img {
            object-position: 75% center;
          }
          .arv-hero-inner {
            padding: 24px 16px 56px;
          }
          .arv-hero-arrow {
            display: none;
          }
          .arv-hero-badge {
            font-size: 11px;
            padding: 7px 14px;
            margin-bottom: 16px;
          }
          .arv-hero-title {
            font-size: clamp(1.75rem, 7.5vw, 2.25rem);
          }
          .arv-hero-rule {
            margin: 16px 0 14px;
          }
          .arv-hero-subtext {
            font-size: 15px;
            margin-bottom: 24px;
          }
          .arv-hero-btn {
            padding: 13px 20px;
            font-size: 14.5px;
          }
          .arv-hero-dots {
            bottom: 22px;
          }
        }

        @media (max-width: 480px) {
          .arv-hero-actions {
            gap: 10px;
          }
          .arv-hero-btn {
            padding: 12px 16px;
            font-size: 14px;
          }
          .arv-hero-subtext {
            font-size: 14px;
          }
        }

        .arv-app-section {
          padding: var(--home-section-y) 0;
        }
        .arv-app-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          min-height: 340px;
          padding: 44px 48px;
          overflow: hidden;
          border-radius: 28px;
          background-image:
            url('/app-download-background-secure.png'),
            linear-gradient(112deg, #064b58 0%, #08727d 48%, #25b4b1 100%);
          background-size: calc(100% + 60px) auto, cover;
          background-position: 100% 40%, center;
          background-repeat: no-repeat;
          box-shadow: 0 24px 48px rgba(5, 73, 78, 0.22);
        }
        .arv-app-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            radial-gradient(circle at 0% 100%, rgba(255, 131, 41, 0.18), transparent 40%),
            linear-gradient(90deg, rgba(3, 48, 53, 0.92) 0%, rgba(4, 62, 68, 0.72) 34%, rgba(5, 73, 78, 0) 56%);
          pointer-events: none;
        }
        .arv-app-copy,
        .arv-app-stats {
          position: relative;
          z-index: 2;
        }
        .arv-app-copy {
          max-width: 480px;
        }
        .arv-app-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding: 7px 16px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(255, 255, 255, 0.92);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .arv-app-title {
          margin: 0 0 14px;
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(1.9rem, 3.2vw, 2.6rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .arv-app-title span {
          color: var(--accent);
        }
        .arv-app-text {
          margin: 0 0 30px;
          max-width: 430px;
          color: rgba(255, 255, 255, 0.86);
          font-size: 16px;
          line-height: 1.65;
        }
        .arv-app-stores {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .arv-store-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 54px;
          padding: 8px 20px 8px 16px;
          border-radius: 14px;
          cursor: pointer;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .arv-store-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.3);
        }
        .arv-store-btn:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 3px;
        }
        .arv-store-btn--apple {
          color: #fff;
          background: #0b0f10;
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
        }
        .arv-store-btn--play {
          color: #0b0f10;
          background: #fff;
          border: 1px solid #fff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }
        .arv-store-label {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          font-size: 17px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .arv-store-label small {
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.02em;
          opacity: 0.8;
        }
        .arv-app-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .arv-app-stat {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 196px;
          padding: 12px 18px 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(220, 255, 252, 0.3);
          background: rgba(6, 70, 76, 0.38);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
          color: #fff;
          transition: transform 0.25s;
        }
        .arv-app-stat:hover {
          transform: translateX(-4px);
        }
        .arv-app-stat-icon {
          display: grid;
          place-items: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #fff;
          color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .arv-app-stat b {
          display: block;
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          line-height: 1;
        }
        .arv-app-stat small {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .arv-app-card {
            padding: 36px 32px;
          }
          .arv-app-copy {
            max-width: 52%;
          }
          .arv-app-stat {
            min-width: 168px;
          }
        }

        @media (max-width: 768px) {
          .arv-app-card {
            flex-direction: column;
            align-items: stretch;
            gap: 26px;
            min-height: 0;
            padding: 30px 20px 24px;
            border-radius: 24px;
            background-size: 190% auto, cover;
            background-position: 78% 100%, center;
          }
          .arv-app-overlay {
            background: linear-gradient(180deg, rgba(3, 48, 53, 0.94) 0%, rgba(4, 62, 68, 0.8) 45%, rgba(5, 73, 78, 0.35) 75%, rgba(5, 73, 78, 0.2) 100%);
          }
          .arv-app-copy {
            max-width: 100%;
          }
          .arv-app-text {
            font-size: 15px;
            margin-bottom: 24px;
          }
          .arv-store-btn {
            flex: 1 1 150px;
            justify-content: center;
          }
          .arv-app-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .arv-app-stat {
            flex-direction: column;
            gap: 8px;
            min-width: 0;
            padding: 12px 6px;
            text-align: center;
          }
          .arv-app-stat:hover {
            transform: none;
          }
          .arv-app-stat-icon {
            flex-basis: auto;
            width: 34px;
            height: 34px;
            border-radius: 10px;
          }
          .arv-app-stat b {
            font-size: 18px;
          }
          .arv-app-stat small {
            font-size: 11px;
          }
        }

        .how-it-works-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }



      `}</style>

      {showAmbulanceModal && (
        <AmbulanceRequestModal onClose={() => setShowAmbulanceModal(false)} />
      )}
      <AmbulanceLoginPrompt
        isOpen={showAmbulanceLoginPrompt}
        onClose={() => setShowAmbulanceLoginPrompt(false)}
      />
    </main>
  );
}
