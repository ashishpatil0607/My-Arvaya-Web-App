import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CalendarDays,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Clock,
  RotateCcw,
  LockKeyhole,
  Siren,
} from "lucide-react";

const LAST_UPDATED = "9 October 2026";
const SUPPORT_EMAIL = "support@arvaya.health";
const GRIEVANCE_EMAIL = "grievance@arvaya.health";
const SUPPORT_PHONE = "+91 1800-123-4567";
const SUPPORT_TEL = "tel:+9118001234567";

/* Each section: id (anchor), title, and body made of paragraphs (strings) or bullet lists (arrays). */
const SECTIONS = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    body: [
      "These Terms & Conditions (\"Terms\") govern your access to and use of the Arvaya website, mobile applications and related services (together, the \"Platform\"), operated by Arvaya Healthcare Ltd. (\"Arvaya\", \"we\", \"us\" or \"our\"), including services offered under the Secure Hospitals brand.",
      "By creating an account, booking a service or otherwise using the Platform, you confirm that you have read, understood and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Platform.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility & Accounts",
    body: [
      [
        "You must be at least 18 years old to register. Minors may use the Platform only through an account managed by a parent or legal guardian.",
        "You agree to provide accurate, current and complete information, including your name, mobile number and date of birth, and to keep it updated.",
        "You are responsible for keeping your login credentials and OTPs confidential and for all activity under your account.",
        "When you add family members to your account, you confirm that you are authorised to share and manage their health information.",
      ],
    ],
  },
  {
    id: "services",
    title: "Our Services",
    body: [
      "Arvaya is a technology platform that connects you with independent, registered healthcare providers. Our services include:",
      [
        "Doctor consultations (in-clinic and online video consultations) with registered medical practitioners.",
        "Lab test and health package bookings, including home sample collection by partner laboratories.",
        "Ambulance booking with live tracking.",
        "ABHA (Ayushman Bharat Health Account) creation and linking, and digital health record storage.",
        "Pharmacy orders, wallet, rewards and referral programmes.",
      ],
      "Doctors, laboratories, pharmacies and ambulance operators listed on the Platform are independent professionals or entities. They are solely responsible for the medical advice, diagnosis, treatment and services they provide.",
    ],
  },
  {
    id: "emergency",
    title: "Not for Medical Emergencies",
    highlight: true,
    body: [
      "The Platform is not a substitute for emergency care. If you are experiencing a medical emergency such as chest pain, difficulty breathing, severe bleeding or loss of consciousness, call 112 or 108 immediately, or go to the nearest hospital.",
      "Online consultations are conducted under the Telemedicine Practice Guidelines, 2020. A doctor may decline to consult online or recommend an in-person visit if, in their professional judgement, your condition requires a physical examination.",
    ],
  },
  {
    id: "appointments",
    title: "Appointments, Cancellations & Refunds",
    body: [
      [
        "Appointment slots are subject to doctor availability. We will notify you if a booking is rescheduled or cancelled by the provider.",
        "You may cancel a doctor appointment free of charge up to 4 hours before the scheduled time. Cancellations within 4 hours, or missed appointments, may not be eligible for a refund.",
        "Lab bookings can be cancelled or rescheduled free of charge until the phlebotomist is assigned for sample collection.",
        "If a provider cancels or fails to attend, you will receive a full refund.",
        "Approved refunds are credited to your original payment method within 5–7 business days, or instantly to your Arvaya Wallet if you choose that option.",
      ],
    ],
  },
  {
    id: "lab-tests",
    title: "Lab Tests & Reports",
    body: [
      "Lab tests are performed by our NABL-accredited partner laboratories. Please follow the preparation instructions shown for each test (for example, fasting requirements). Reports are shared on the Platform and by email once ready; turnaround times are estimates and may vary.",
      "Lab reports should be interpreted by a qualified doctor. Arvaya does not provide diagnosis based on test results.",
    ],
  },
  {
    id: "ambulance",
    title: "Ambulance Services",
    body: [
      "Ambulance services are provided by third-party operators. Estimated arrival times and live location are approximate and depend on traffic, weather and availability. Charges shown at booking may change based on actual distance travelled, waiting time or additional medical support requested.",
    ],
  },
  {
    id: "prescriptions",
    title: "Prescriptions & Pharmacy",
    body: [
      [
        "Prescription medicines are dispensed only against a valid prescription from a registered medical practitioner.",
        "Our partner pharmacies may refuse or modify an order if a prescription is invalid, expired or unclear.",
        "Medicines once delivered cannot be returned unless they are damaged, expired or incorrect at the time of delivery.",
      ],
    ],
  },
  {
    id: "payments",
    title: "Payments, Wallet & Rewards",
    body: [
      [
        "All prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise.",
        "Payments are processed by secure, RBI-authorised payment gateways. Arvaya does not store your full card details.",
        "Wallet balance can be used only for services on the Platform. It is non-transferable and cannot be withdrawn as cash, except for refunded amounts as required by law.",
        "Reward points and referral benefits have no cash value, may carry expiry dates, and may be modified or withdrawn at our discretion. Any misuse or fraudulent referrals will result in forfeiture.",
      ],
    ],
  },
  {
    id: "health-data",
    title: "Health Records & Privacy",
    body: [
      "We treat your health information as sensitive personal data and process it in accordance with the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000, and the Ayushman Bharat Digital Mission (ABDM) guidelines.",
      [
        "Your health records are shared with a provider only with your explicit consent, which you can review and revoke at any time.",
        "ABHA linking is optional. You can delink your ABHA or request account deletion from the Account Deletion page.",
        "We use industry-standard encryption and access controls to protect your data. Please see our Privacy Policy for full details.",
      ],
    ],
  },
  {
    id: "conduct",
    title: "Acceptable Use",
    body: [
      "You agree not to:",
      [
        "Provide false information or impersonate another person.",
        "Upload forged prescriptions or medical documents.",
        "Harass, abuse or threaten doctors, staff or other users.",
        "Copy, scrape, reverse-engineer or interfere with the Platform or its security.",
        "Use the Platform for any unlawful purpose.",
      ],
      "We may suspend or terminate accounts that violate these rules.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual Property",
    body: [
      "All content on the Platform, including the Arvaya and Secure Hospitals names, logos, design, text, graphics and software, is owned by or licensed to Arvaya Healthcare Ltd. and protected by applicable intellectual property laws. You may not use it without our prior written permission.",
    ],
  },
  {
    id: "liability",
    title: "Disclaimers & Limitation of Liability",
    body: [
      "The Platform is provided on an \"as is\" and \"as available\" basis. While we verify the registration of listed providers, we do not guarantee any particular medical outcome.",
      "To the maximum extent permitted by law, Arvaya shall not be liable for any indirect, incidental or consequential damages arising from your use of the Platform or from services delivered by third-party providers. Our total liability for any claim shall not exceed the amount you paid to Arvaya for the specific service giving rise to the claim.",
    ],
  },
  {
    id: "termination",
    title: "Suspension & Termination",
    body: [
      "You may stop using the Platform and request deletion of your account at any time. We may suspend or terminate your access if you breach these Terms or if required by law. Records we are legally required to retain will be kept for the period prescribed by law.",
    ],
  },
  {
    id: "law",
    title: "Governing Law & Disputes",
    body: [
      "These Terms are governed by the laws of India. Any dispute shall first be addressed through our grievance process. If unresolved, the courts at Bengaluru, Karnataka shall have exclusive jurisdiction.",
    ],
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    body: [
      "We may update these Terms from time to time. Material changes will be notified through the Platform or by email. Continued use of the Platform after changes take effect means you accept the revised Terms.",
    ],
  },
  {
    id: "contact",
    title: "Grievance Officer & Contact",
    body: [
      `In accordance with the Information Technology Rules, 2021, you may raise any complaint with our Grievance Officer at ${GRIEVANCE_EMAIL}. We will acknowledge your complaint within 24 hours and aim to resolve it within 15 days.`,
    ],
    contact: true,
  },
];

/* Short summary shown above the full terms. Each `to` jumps to the section with the details. */
const KEY_POINTS = [
  { icon: Clock, title: "Free cancellation", text: "Up to 4 hours before a doctor appointment.", to: "appointments" },
  { icon: RotateCcw, title: "Refunds in 5–7 days", text: "Or instantly to your Arvaya Wallet.", to: "appointments" },
  { icon: LockKeyhole, title: "Consent-based sharing", text: "Your records go to a provider only with your consent.", to: "health-data" },
  { icon: Siren, title: "Emergency? Call 112", text: "Arvaya is not a substitute for emergency care.", to: "emergency", danger: true },
];

export default function Terms() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [progress, setProgress] = useState(0);

  /* Highlight the table-of-contents entry for the section currently in view. */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  /* Reading progress bar. */
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    goTo(id);
  };

  const activeIndex = SECTIONS.findIndex((s) => s.id === activeId);

  return (
    <main className="page terms-page animate-fade-in-up">
      <style>{`
        .terms-page {
          background: var(--bg-app);
          font-family: var(--font-sans);
          color: var(--text-main);
          padding-bottom: 72px;
        }

        .terms-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 3px;
          width: 100%;
          transform-origin: 0 50%;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          z-index: 9999;
          pointer-events: none;
        }

        /* ── Hero ── */
        .terms-hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(520px 320px at 92% 10%, rgba(255, 166, 92, 0.38), transparent 65%),
            radial-gradient(700px 360px at 0% 100%, rgba(255, 255, 255, 0.10), transparent 70%),
            linear-gradient(120deg, #0a7f84 0%, #0e9a96 55%, #1fb39e 100%);
          box-shadow: inset 0 10px 18px -12px rgba(0, 0, 0, 0.35);
          color: #fff;
          padding: 32px 0 68px;
        }
        /* Decorative rings */
        .terms-hero::before {
          content: '';
          position: absolute;
          width: 420px;
          height: 420px;
          right: -120px;
          top: -180px;
          border-radius: 50%;
          border: 56px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 90px rgba(255, 255, 255, 0.035);
          pointer-events: none;
        }
        .terms-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(90deg, transparent 35%, #000 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 35%, #000 100%);
          pointer-events: none;
        }
        .terms-hero .container { position: relative; z-index: 1; }
        .terms-crumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 14px;
        }
        .terms-crumbs a { color: #fff; font-weight: 500; text-decoration: none; }
        .terms-crumbs a:hover { text-decoration: underline; }
        .terms-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 16px;
          margin-bottom: 12px;
        }
        .terms-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          background: #fff;
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-hover);
          box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.2);
        }
        .terms-hero h1 {
          font-family: var(--font-display);
          color: #fff;
          font-size: clamp(26px, 3vw, 36px);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        }
        .terms-hero p {
          max-width: 720px;
          margin: 0;
          font-size: 14.5px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.88);
        }
        .terms-updated {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
        }


        /* ── Layout ── */
        .terms-layout {
          display: grid;
          grid-template-columns: 264px minmax(0, 1fr);
          gap: 28px;
          margin-top: -36px;
          position: relative;
          z-index: 1;
        }

        /* ── Table of contents ── */
        .terms-toc {
          position: sticky;
          top: calc(var(--app-header-height, 131px) + 16px);
          align-self: start;
          display: flex;
          flex-direction: column;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          max-height: calc(100vh - var(--app-header-height, 131px) - 32px);
          overflow: hidden;
        }
        .terms-toc-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--border);
        }
        .terms-toc-title {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 0;
        }
        .terms-toc-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          background: var(--primary-light);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .terms-toc-list {
          overflow-y: auto;
          padding: 8px;
          scrollbar-width: thin;
          scrollbar-color: var(--primary-soft) transparent;
        }
        .terms-toc-list::-webkit-scrollbar { width: 6px; }
        .terms-toc-list::-webkit-scrollbar-thumb { background: var(--primary-soft); border-radius: 6px; }
        .terms-toc a {
          position: relative;
          display: flex;
          gap: 10px;
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          line-height: 1.4;
          color: var(--text-muted);
          text-decoration: none;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .terms-toc a span {
          color: var(--primary-soft);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          min-width: 18px;
          transition: color 0.2s ease;
        }
        .terms-toc a:hover { background: var(--bg-app); color: var(--primary); }
        .terms-toc a.active { background: var(--primary-light); color: var(--primary-deep); font-weight: 600; }
        .terms-toc a.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 3px;
          background: var(--accent);
        }
        .terms-toc a.active span { color: var(--accent); }

        /* Mobile "jump to section" picker */
        .terms-jump { display: none; position: relative; }
        .terms-jump select {
          width: 100%;
          appearance: none;
          -webkit-appearance: none;
          padding: 13px 44px 13px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-surface);
          box-shadow: var(--shadow-md);
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
        }
        .terms-jump svg {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        /* ── Content ── */
        .terms-content {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          padding: 36px 44px 40px;
        }

        /* At a glance */
        .terms-glance { margin-bottom: 36px; }
        .terms-glance-title {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 0 0 12px;
        }
        .terms-glance-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .terms-glance-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px;
          border-radius: var(--radius-md);
          background: var(--bg-app);
          border: 1px solid var(--border);
          text-decoration: none;
          transition: border-color 0.2s ease, transform 0.25s var(--ease-out), box-shadow 0.25s ease;
        }
        .terms-glance-card:hover { border-color: var(--primary-soft); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
        .terms-glance-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--primary-light);
          color: var(--primary);
          margin-bottom: 4px;
        }
        .terms-glance-card strong { font-size: 14px; color: var(--text-main); line-height: 1.3; }
        .terms-glance-card small { font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }
        .terms-glance-card.danger { background: #fff7f7; border-color: rgba(220, 38, 38, 0.18); }
        .terms-glance-card.danger:hover { border-color: rgba(220, 38, 38, 0.4); }
        .terms-glance-card.danger .terms-glance-icon { background: var(--danger-bg); color: var(--danger); }

        /* Sections */
        .terms-section { scroll-margin-top: calc(var(--app-header-height, 131px) + 20px); padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid var(--border); }
        .terms-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .terms-section h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--primary-deep);
          margin: 0 0 12px;
        }
        .terms-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: var(--primary-light);
          color: var(--primary);
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .terms-body { padding-left: 42px; max-width: 76ch; }
        .terms-section p,
        .terms-section li { font-size: 15px; line-height: 1.75; color: var(--text-muted); }
        .terms-section p { margin: 0 0 12px; }
        .terms-section p:last-child, .terms-section ul:last-child { margin-bottom: 0; }
        .terms-section ul { margin: 0 0 12px; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .terms-section li { position: relative; padding-left: 22px; }
        .terms-section li::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 11px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
        }

        .terms-section.highlight .terms-callout {
          display: flex;
          gap: 14px;
          padding: 18px 20px;
          border-radius: var(--radius-lg);
          background: var(--danger-bg);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-left: 4px solid var(--danger);
        }
        .terms-section.highlight .terms-callout svg { color: var(--danger); flex-shrink: 0; margin-top: 3px; }
        .terms-section.highlight .terms-callout p { color: #7f1d1d; }
        .terms-section.highlight .terms-num { background: var(--danger-bg); color: var(--danger); }

        .terms-contact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .terms-contact-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 18px;
          border-radius: var(--radius-md);
          background: var(--bg-app);
          border: 1px solid var(--border);
          color: var(--text-main);
          text-decoration: none;
          transition: border-color 0.2s ease, transform 0.25s var(--ease-out);
        }
        .terms-contact-text { display: flex; flex-direction: column; gap: 2px; width: 100%; min-width: 0; }
        .terms-contact-text small {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .terms-contact-text span { font-size: 14px; font-weight: 600; line-height: 1.45; overflow-wrap: break-word; }
        a.terms-contact-card:hover { border-color: var(--accent); transform: translateY(-2px); }
        .terms-contact-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--accent-light);
          color: var(--accent);
          flex-shrink: 0;
        }

        .terms-footer-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 36px;
          padding: 18px 20px;
          border-radius: var(--radius-lg);
          background: var(--primary-light);
          font-size: 14px;
          color: var(--primary-dark);
        }
        .terms-footer-note .note { display: flex; align-items: center; gap: 10px; }
        .terms-footer-note a { color: var(--primary); font-weight: 600; }
        .terms-top-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          background: var(--primary);
          color: #fff;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .terms-top-btn:hover { background: var(--primary-dark); }

        @media (max-width: 1200px) {
          .terms-glance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 992px) {
          @media (max-width: 576px) {
          .terms-hero { padding: 24px 0 52px; }
          .terms-content { padding: 24px 18px; border-radius: var(--radius-lg); }
          .terms-glance-grid { grid-template-columns: 1fr; }
          .terms-glance-card { flex-direction: row; align-items: flex-start; gap: 12px; }
          .terms-glance-icon { margin-bottom: 0; flex-shrink: 0; }
          .terms-section h2 { font-size: 17px; }
          .terms-body { padding-left: 0; }
          .terms-section p, .terms-section li { font-size: 14.5px; }
        }
      `}</style>

      <div className="terms-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

      {/* ── Hero ── */}
      <section className="terms-hero">
        <div className="container">
          <nav className="terms-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>Terms &amp; Conditions</span>
          </nav>
          <div className="terms-meta">
            <span className="terms-eyebrow"><FileText size={14} /> Legal</span>
            <span className="terms-updated"><CalendarDays size={14} /> Last updated: {LAST_UPDATED}</span>
          </div>
          <h1>Terms &amp; Conditions</h1>
          <p>
            Please read these terms carefully before using Arvaya. They explain your rights and
            responsibilities when you book consultations, lab tests, ambulances and other
            healthcare services through our platform.
          </p>
        </div>
      </section>

      <div className="container">
        <div className="terms-layout">

          {/* ── Table of contents (desktop) ── */}
          <nav className="terms-toc" aria-label="Table of contents">
            <div className="terms-toc-head">
              <p className="terms-toc-title">On this page</p>
              <span className="terms-toc-count">{activeIndex + 1} / {SECTIONS.length}</span>
            </div>
            <div className="terms-toc-list">
              {SECTIONS.map(({ id, title }, i) => (
                <a key={id} href={`#${id}`} onClick={scrollTo(id)} className={activeId === id ? "active" : ""}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {title}
                </a>
              ))}
            </div>
          </nav>

          {/* ── Jump to section (mobile) ── */}
          <div className="terms-jump">
            <select aria-label="Jump to section" value={activeId} onChange={(e) => goTo(e.target.value)}>
              {SECTIONS.map(({ id, title }, i) => (
                <option key={id} value={id}>{i + 1}. {title}</option>
              ))}
            </select>
            <ChevronDown size={18} />
          </div>

          {/* ── Content ── */}
          <article className="terms-content">
            <div className="terms-glance">
              <p className="terms-glance-title">At a glance</p>
              <div className="terms-glance-grid">
                {KEY_POINTS.map(({ icon: Icon, title, text, to, danger }) => (
                  <a key={title} href={`#${to}`} onClick={scrollTo(to)} className={`terms-glance-card${danger ? " danger" : ""}`}>
                    <span className="terms-glance-icon"><Icon size={18} /></span>
                    <span>
                      <strong>{title}</strong>
                      <br />
                      <small>{text}</small>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {SECTIONS.map(({ id, title, body, highlight, contact }, i) => {
              const content = body.map((block, j) =>
                Array.isArray(block) ? (
                  <ul key={j}>{block.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p key={j}>{block}</p>
                )
              );
              return (
                <section key={id} id={id} className={`terms-section${highlight ? " highlight" : ""}`}>
                  <h2><span className="terms-num">{i + 1}</span>{title}</h2>
                  <div className="terms-body">
                    {highlight ? (
                      <div className="terms-callout">
                        <AlertTriangle size={20} />
                        <div>{content}</div>
                      </div>
                    ) : content}
                    {contact && (
                      <div className="terms-contact">
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="terms-contact-card">
                          <span className="terms-contact-icon"><Mail size={17} /></span>
                          <span className="terms-contact-text">
                            <small>Email us</small>
                            <span>{SUPPORT_EMAIL}</span>
                          </span>
                        </a>
                        <a href={SUPPORT_TEL} className="terms-contact-card">
                          <span className="terms-contact-icon"><Phone size={17} /></span>
                          <span className="terms-contact-text">
                            <small>Call toll-free</small>
                            <span>{SUPPORT_PHONE}</span>
                          </span>
                        </a>
                        <div className="terms-contact-card">
                          <span className="terms-contact-icon"><MapPin size={17} /></span>
                          <span className="terms-contact-text">
                            <small>Registered office</small>
                            <span>123 Healthcare Ave, Bangalore 560001</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}

            <div className="terms-footer-note">
              <span className="note">
                <ShieldCheck size={18} />
                <span>Questions about your account? Visit our <Link to="/support">Support</Link> page.</span>
              </span>
              <button type="button" className="terms-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                <ArrowUp size={14} /> Back to top
              </button>
            </div>
          </article>

        </div>
      </div>
    </main>
  );
}
