import { MapPin, Phone, Mail, HeartPulse, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/* Inline social SVGs (lucide-react doesn't ship brand icons) */
const SocialIcon = ({ d, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" {...props}><path d={d} /></svg>);
const fbPath = "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z";
const xPath = "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z";
const igPath = "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z";
const liPath = "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z";

const SUPPORT_PHONE = "+91 1800-123-4567";
const SUPPORT_TEL = "tel:+9118001234567";
const SUPPORT_EMAIL = "support@arvaya.health";

export default function Footer() {
  return (
    <footer className="main-footer">
      <style>{`
        .main-footer {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(600px 320px at 0% 0%, rgba(46, 102, 110, 0.55), transparent 70%),
            radial-gradient(520px 280px at 100% 100%, rgba(251, 145, 63, 0.12), transparent 70%),
            var(--primary-deep);
          color: rgba(255, 255, 255, 0.72);
          padding-top: 40px;
          font-family: var(--font-sans);
        }
        .main-footer::before {
          content: '';
          position: absolute;
          inset: 0 0 auto 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary));
        }
        .main-footer > .container { position: relative; z-index: 1; }

        /* ── Help strip ── */
        .footer-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          padding: 18px 24px;
          margin-bottom: 40px;
          border-radius: var(--radius-xl);
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .footer-cta-text { display: flex; align-items: center; gap: 16px; }
        .footer-cta-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 20px -6px rgba(251, 145, 63, 0.6);
        }
        .footer-cta h3 {
          margin: 0 0 4px;
          color: #fff;
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 700;
        }
        .footer-cta p { margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.65); }
        .footer-cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .footer-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 20px;
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.25s var(--ease-out), background 0.2s ease, box-shadow 0.25s ease;
        }
        .footer-cta-btn.primary { background: var(--accent); color: #fff; }
        .footer-cta-btn.primary:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 10px 22px -8px rgba(251, 145, 63, 0.7);
        }
        .footer-cta-btn.ghost { color: #fff; border: 1px solid rgba(255, 255, 255, 0.25); }
        .footer-cta-btn.ghost:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-2px); }

        /* ── Main grid ── */
        .footer-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr 1.3fr;
          gap: 32px;
          margin-bottom: 32px;
        }
        .footer-col { display: flex; flex-direction: column; gap: 14px; }
        .footer-logo-chip {
          display: inline-flex;
          width: fit-content;
          padding: 8px 14px;
          background: #fff;
          border-radius: var(--radius-md);
          box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.4);
          transition: transform 0.3s var(--ease-out);
        }
        .footer-logo-chip:hover { transform: translateY(-2px); }
        .footer-logo { height: 34px; display: block; }
        .footer-desc {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
          max-width: 340px;
        }
        .footer-socials { display: flex; gap: 8px; }
        .social-btn {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.8);
          transition: all 0.25s var(--ease-out);
        }
        .social-btn:hover {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
          transform: translateY(-3px);
          box-shadow: 0 8px 18px -6px rgba(251, 145, 63, 0.6);
        }
        .footer-title {
          color: #fff;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0;
          position: relative;
          padding-bottom: 10px;
        }
        .footer-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 28px;
          height: 3px;
          background: var(--accent);
          border-radius: 3px;
        }
        .footer-links { display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
        .footer-link,
        .bottom-link {
          text-decoration: none;
          width: fit-content;
          /* Negative margin keeps the text aligned while the hover highlight gets padding. */
          padding: 4px 10px;
          margin: -4px -10px;
          border-radius: 8px;
          transition: background 0.25s ease;
        }
        .footer-link { color: rgba(255, 255, 255, 0.68); }
        /* Hover: a soft translucent highlight fades in behind the link, same as the header nav. */
        .footer-link:hover,
        .bottom-link:hover { background: rgba(255, 255, 255, 0.08); }

        .footer-contact-list { display: flex; flex-direction: column; gap: 8px; }
        .footer-contact-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          line-height: 1.45;
        }
        /* Clickable rows (phone, email) get the same soft hover highlight as the links. */
        a.footer-contact-item {
          width: fit-content;
          padding: 6px 12px 6px 6px;
          margin: -6px -12px -6px -6px;
          border-radius: 12px;
          transition: background 0.25s ease;
        }
        a.footer-contact-item:hover { background: rgba(255, 255, 255, 0.08); }
        .footer-contact-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.07);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .main-footer a:focus { outline: none; box-shadow: none; }
        .main-footer a:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
          border-radius: 6px;
        }

        /* ── Bottom bar ── */
        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .footer-copy { font-size: 13px; color: rgba(255, 255, 255, 0.55); margin: 0; }
        .bottom-links { display: flex; gap: 24px; font-size: 13px; }
        .bottom-link { color: rgba(255, 255, 255, 0.55); }

        @media (max-width: 992px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
        }
        @media (max-width: 576px) {
          .footer-cta { padding: 20px; }
          .footer-grid { grid-template-columns: 1fr; gap: 24px; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
          .bottom-links { flex-wrap: wrap; gap: 12px 20px; }
        }
      `}</style>
      <div className="container">

        {/* ── Help strip ── */}
        <div className="footer-cta">
          <div className="footer-cta-text">
            <div className="footer-cta-icon"><HeartPulse size={24} /></div>
            <div>
              <h3>Need help with your care?</h3>
              <p>Book a consultation or talk to our support team.</p>
            </div>
          </div>
          <div className="footer-cta-actions">
            <a href={SUPPORT_TEL} className="footer-cta-btn ghost">
              <Phone size={16} /> Call us
            </a>
            <Link to="/doctors" className="footer-cta-btn primary">
              Book a consultation <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* ── Top Area: Brand & Links ── */}
        <div className="footer-grid">

          {/* Column 1: Brand */}
          <div className="footer-col">
            <Link to="/" className="footer-logo-chip" aria-label="Arvaya home">
              <img src="/logo.png" alt="Arvaya" className="footer-logo" />
            </Link>
            <p className="footer-desc">
              India's most trusted healthcare platform. Connecting you with top doctors, diagnostic centers, and pharmacies across the country.
            </p>

            {/* Social Icons */}
            <div className="footer-socials">
              {[
                ["Facebook", fbPath],
                ["X (Twitter)", xPath],
                ["Instagram", igPath],
                ["LinkedIn", liPath]
              ].map(([label, d]) => (
                <a key={label} href="#" className="social-btn" aria-label={label}>
                  <SocialIcon d={d} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Healthcare Services */}
          <div className="footer-col">
            <h3 className="footer-title">Healthcare Services</h3>
            <div className="footer-links">
              {[
                ["Consult Doctors", "/doctors"],
                ["Lab Tests", "/labs"],
                // ["ABHA Hub", "/abha"],
                ["Ambulance", "/ambulance"]
              ].map(([label, path]) => (
                <Link key={label} to={path} className="footer-link">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Patient Center */}
          <div className="footer-col">
            <h3 className="footer-title">Patient Center</h3>
            <div className="footer-links">
              {[
                ["Home", "/"],
                ["Wallet", "/wallet"],
                ["Rewards", "/rewards"]
              ].map(([label, path]) => (
                <Link key={label} to={path} className="footer-link">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Contact */}
          <div className="footer-col">
            <h3 className="footer-title">Contact Us</h3>
            <div className="footer-contact-list">
              <div className="footer-contact-item">
                <span className="footer-contact-icon"><MapPin size={16} /></span>
                <span>123 Healthcare Ave, Bangalore, 560001</span>
              </div>
              <a href={SUPPORT_TEL} className="footer-contact-item">
                <span className="footer-contact-icon"><Phone size={16} /></span>
                <span>{SUPPORT_PHONE}</span>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="footer-contact-item">
                <span className="footer-contact-icon"><Mail size={16} /></span>
                <span>{SUPPORT_EMAIL}</span>
              </a>
            </div>
          </div>

        </div>

        {/* ── Bottom Area: Copyright ── */}
        <div className="footer-bottom">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Arvaya Healthcare. All rights reserved.
          </p>
          <div className="bottom-links">
            {["Terms & Conditions", "Privacy Policy", "Refund Policy"].map(label => (
              <Link key={label} to="/" className="bottom-link">{label}</Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
