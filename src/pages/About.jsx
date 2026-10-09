import {
  Users,
  CalendarCheck,
  FileText,
  FlaskConical,
  CreditCard,
  Wallet,
  BellRing,
  Watch,
  Bot,
  Gift,
  HeartHandshake,
  Target,
  Mail,
  ArrowRight,
  HeartPulse,
  Sparkles,
} from "lucide-react";

const whatOffers = [
  { icon: Users, title: "Patient & Family Profile Management", desc: "Securely manage patient profiles and link family members for convenient healthcare access." },
  { icon: CalendarCheck, title: "Online Appointment Booking", desc: "Select hospital locations and book appointments with ease." },
  { icon: FileText, title: "Previous Health Records", desc: "Access and manage available medical records, reports, and health documents in one convenient place." },
  { icon: FlaskConical, title: "Lab Test Booking", desc: "Explore and book laboratory tests through a simplified digital process." },
  { icon: CreditCard, title: "Secure Payments", desc: "Make payments conveniently through integrated payment gateways." },
  { icon: Wallet, title: "Digital Wallet & Rewards", desc: "Enjoy wallet services, loyalty points, rewards, and cashback benefits." },
  { icon: BellRing, title: "Smart Notifications & Reminders", desc: "Receive appointment updates, important notifications, and timely healthcare reminders." },
  { icon: Watch, title: "Wearable Integration", desc: "Connect compatible wearable devices to track health metrics such as heart rate, sleep, and other available wellness indicators." },
  { icon: Bot, title: "SecureAnt AI Chat", desc: "Get AI-powered assistance to help navigate healthcare services and find relevant health information through an intelligent chat experience." },
  { icon: Gift, title: "Refer a Friend", desc: "Share ARVAYA with friends and family to help them discover a more convenient healthcare experience." },
];

const highlights = ["Connected", "Convenient", "Personalized"];

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
          <p className="about-tagline">
            ARVAYA is your digital gateway to connected, convenient, and
            personalized healthcare.
          </p>
          <p className="about-lead">
            ARVAYA is a patient-centric digital health platform designed to
            simplify healthcare access and enhance the overall patient
            experience. By bringing essential healthcare services together in
            one place, ARVAYA enables individuals and families to manage health
            profiles, book hospital appointments, access previous health
            records, and stay connected with healthcare services through a
            seamless digital experience.
          </p>
          <div className="about-chips">
            {highlights.map((h) => (
              <span key={h} className="about-chip">
                <Sparkles size={13} /> {h}
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

        {/* Our Commitment */}
        <section className="about-commitment">
          <div className="about-commitment-icon">
            <HeartHandshake size={24} />
          </div>
          <div>
            <span className="about-kicker">Our Commitment</span>
            <p>
              At ARVAYA, we believe healthcare should be accessible, convenient,
              and centered around people. We combine digital innovation with
              patient-focused services to simplify everyday healthcare
              interactions, improve engagement, and help individuals stay
              informed about their health journey.
            </p>
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
              To build a connected, inclusive, and patient-centric healthcare
              ecosystem that brings patients, families, and healthcare
              providers closer through smart, secure, and accessible digital
              solutions.
            </p>
          </div>
        </section>

        <p className="about-closing">
          ARVAYA — <span>Bringing Healthcare Closer to You.</span>
        </p>

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
