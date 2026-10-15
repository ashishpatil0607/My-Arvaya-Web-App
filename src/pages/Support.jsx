import { Phone, PhoneCall, Mail, Clock, HelpCircle, FileText, ChevronDown, Send, Search, Zap, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function Support() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    { q: "How do I cancel my appointment?", a: "You can cancel your appointment by going to 'My Appointments' and clicking on the 'Cancel' button next to your upcoming appointment. Note that cancellations made within 2 hours of the scheduled time may not be eligible for a full refund." },
    { q: "When will I get my lab reports?", a: "Most routine lab reports are uploaded to your Health Vault within 24 hours of sample collection. Specialized tests may take 48-72 hours." },
    { q: "How does the Arvaya wallet work?", a: "You can add money to your Arvaya wallet using UPI, credit/debit cards, or net banking. Wallet cash can be used for any service on the app, and refunds are instantly credited back to your wallet." },
    { q: "What should I do in an emergency?", a: "Click the red SOS or Ambulance button available on the home page or floating at the bottom of the screen. We dispatch our advanced life-support ambulances with a 15-minute ETA." }
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredFaqs = faqs
    .map((faq, index) => ({ ...faq, originalIndex: index }))
    .filter(faq => !normalizedQuery || `${faq.q} ${faq.a}`.toLowerCase().includes(normalizedQuery));

  return (
    <main className="page support-page animate-fade-in-up">
      <header className="wallet-top-shell">
        <div className="container">
          <div className="wallet-hero-banner">
            <div className="wallet-hero-content">
              <div className="wallet-hero-icon" aria-hidden="true">
                <HelpCircle size={26} />
              </div>

              <div>
                <div className="wallet-hero-pill-tag">
                  <Sparkles size={13} /> Arvaya Care &middot; Help Center
                </div>

                <h1 className="wallet-hero-title">
                  Help &amp; Support, whenever you need it.
                </h1>
                <p className="wallet-hero-subtitle">
                  Get assistance with your appointments, reports, wallet, and services.
                </p>

                <div className="wallet-hero-badges">
                  <span className="wallet-hero-badge">
                    <Zap size={14} color="#fbbf24" /> Quick Assistance
                  </span>
                  <span className="wallet-hero-badge">
                    <Users size={14} color="#67e8f9" /> Multiple Services
                  </span>
                  <span className="wallet-hero-badge">
                    <Clock size={14} color="#fb923c" /> 24/7 Helpline
                  </span>
                </div>
              </div>
            </div>

            <div className="wallet-hero-img-col">
              <div className="wallet-hero-img-wrap" aria-hidden="true">
                <img src="/images/help-support.png" alt="" className="wallet-hero-photo" />
                <div className="wallet-hero-stat-badge">
                  <CheckCircle2 size={14} />
                  <span>Support team online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container support-shell">
        <section className="support-contact-grid" aria-label="Contact Arvaya support">
          <a className="support-contact-card" href="tel:18001234567">
            <PhoneCall className="support-contact-decor" size={130} strokeWidth={1.5} aria-hidden="true" />
            <span className="support-contact-icon"><Phone size={20} /></span>
            <span className="support-contact-copy">
              <small>24/7 Helpline</small>
              <strong>1800-123-4567</strong>
              <span>Call our support team</span>
              <span className="support-contact-badge">
                <span className="support-contact-dot" /> Available 24/7
              </span>
            </span>
            <span className="support-contact-action"><Send size={15} /></span>
          </a>

          <a className="support-contact-card" href="mailto:support@arvaya.com">
            <Mail className="support-contact-decor" size={130} strokeWidth={1.5} aria-hidden="true" />
            <span className="support-contact-icon accent"><Mail size={20} /></span>
            <span className="support-contact-copy">
              <small>Email Support</small>
              <strong>support@arvaya.com</strong>
              <span>We will respond as soon as possible</span>
              <span className="support-contact-badge accent">
                <Clock size={13} /> Usually replies in 2-4 hours
              </span>
            </span>
            <span className="support-contact-action"><Send size={15} /></span>
          </a>
        </section>

        <section className="wallet-panel support-faq-panel">
          <div className="wallet-panel-heading support-panel-heading">
            <div className="wallet-section-title">
              <span className="wallet-section-icon"><FileText size={20} /></span>
              <div>
                <h2>Frequently Asked Questions</h2>
                <p>Quick answers to common support questions</p>
              </div>
            </div>
            <span className="wallet-count-badge">{faqs.length} answers</span>
          </div>

          <div className="support-faq-body">
            <label className="support-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search help topics"
                aria-label="Search frequently asked questions"
              />
            </label>

            {filteredFaqs.length === 0 ? (
              <div className="support-no-results">
                <span className="wallet-empty-icon"><Search size={22} /></span>
                <h3>No matching help topics</h3>
                <p>Try a different word or contact our support team.</p>
              </div>
            ) : (
              <div className="support-faq-list">
                {filteredFaqs.map(faq => {
                  const isOpen = openFaq === faq.originalIndex || normalizedQuery.length > 0;
                  const answerId = `support-answer-${faq.originalIndex}`;
                  return (
                    <article className={`support-faq-item ${isOpen ? "is-open" : ""}`} key={faq.originalIndex}>
                      <button
                        type="button"
                        className="support-faq-question"
                        onClick={() => setOpenFaq(isOpen ? null : faq.originalIndex)}
                        aria-expanded={isOpen}
                        aria-controls={answerId}
                      >
                        <span className="support-question-number">{String(faq.originalIndex + 1).padStart(2, "0")}</span>
                        <strong>{faq.q}</strong>
                        <ChevronDown size={19} />
                      </button>
                      {isOpen && <p className="support-faq-answer" id={answerId}>{faq.a}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
