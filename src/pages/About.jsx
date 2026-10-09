import {
  Fingerprint,
  FileText,
  FlaskConical,
  BellRing,
  Watch,
  Languages,
  ShieldCheck,
  Users,
  Stethoscope,
  Microscope,
  Pill,
  Building2,
  Target,
  Mail,
  ArrowRight,
  HeartPulse,
} from "lucide-react";

const whatOffers = [
  { icon: Fingerprint, title: "ABHA-Integrated Profiles", desc: "Securely store and access health records." },
  { icon: FileText, title: "Health Record Management", desc: "Upload & auto-organize documents." },
  { icon: FlaskConical, title: "Lab Test Booking", desc: "Schedule and track pathology & radiology tests." },
  { icon: BellRing, title: "Reminders & Alerts", desc: "Stay on top of medications & follow-ups." },
  { icon: Watch, title: "Wearable Integration", desc: "Track vitals like heart rate and sleep." },
  { icon: Languages, title: "Multilingual Support", desc: "Use in your preferred language." },
  { icon: ShieldCheck, title: "Secure & Compliant", desc: "Aligned with ABDM and FHIR standards." },
];

const whoCanUse = [
  { icon: Users, title: "Patients & Families", desc: "Manage profiles, history, and reminders." },
  { icon: Stethoscope, title: "Doctors & Nurses", desc: "View records and manage OPD/IPD notes." },
  { icon: Microscope, title: "Lab Technicians", desc: "Handle tests and sample collections." },
  { icon: Pill, title: "Pharmacy & Billing", desc: "Track prescriptions and medications." },
  { icon: Building2, title: "Admins & Hospitals", desc: "Manage workflows and health data sharing." },
];

const highlights = ["ABDM aligned", "FHIR standards", "One smart ecosystem"];

export default function About() {
  return (
    <main className="page about-page animate-fade-in-up">
      <div className="about-container">
        {/* Hero */}
        <section className="about-hero">
          <div className="about-hero-glow" aria-hidden="true" />
          <div className="about-hero-logo">
            <img src="/logo.png" alt="Arvaya Health & Wellness" />
          </div>
          <span className="about-eyebrow">
            <HeartPulse size={14} /> About ARVAYA
          </span>
          <h1 className="about-title">
            Empowering Health. <span>Enhancing Lives.</span>
          </h1>
          <p className="about-lead">
            ARVAYA is a comprehensive digital health platform designed to make
            healthcare more accessible, efficient, and personalized. Whether you
            are a patient, doctor, lab technician, pharmacist, or hospital
            administrator, ARVAYA simplifies your daily healthcare interactions
            through a single, smart ecosystem.
          </p>
          <div className="about-chips">
            {highlights.map((h) => (
              <span key={h} className="about-chip">
                <ShieldCheck size={13} /> {h}
              </span>
            ))}
          </div>
        </section>

        {/* What ARVAYA Offers */}
        <section className="about-section">
          <header className="about-section-head">
            <span className="about-kicker">Features</span>
            <h2>What ARVAYA Offers</h2>
          </header>
          <div className="about-grid">
            {whatOffers.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="about-card">
                <div className="about-card-icon">
                  <Icon size={20} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who Can Use ARVAYA */}
        <section className="about-section">
          <header className="about-section-head">
            <span className="about-kicker">For everyone in care</span>
            <h2>Who Can Use ARVAYA?</h2>
          </header>
          <div className="about-roles">
            {whoCanUse.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="about-role">
                <div className="about-role-icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Vision */}
        <section className="about-vision">
          <div className="about-vision-icon">
            <Target size={24} />
          </div>
          <div>
            <span className="about-kicker about-kicker-light">Our Vision</span>
            <p>
              To build a connected, transparent, and inclusive healthcare
              ecosystem that improves health outcomes for every individual,
              especially in under-served areas.
            </p>
          </div>
        </section>

        {/* Contact & Support */}
        <section className="about-contact">
          <div>
            <h2>Contact & Support</h2>
            <p>Questions, feedback, or need help? Our team is here for you.</p>
          </div>
          <a href="mailto:support@arvayahealth.com" className="about-contact-btn">
            <Mail size={16} />
            support@arvayahealth.com
            <ArrowRight size={16} className="about-contact-arrow" />
          </a>
        </section>
      </div>
    </main>
  );
}
