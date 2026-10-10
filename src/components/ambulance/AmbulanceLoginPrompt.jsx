import { Siren, Phone, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Modal from "../common/Modal";

/**
 * Shown instead of the ambulance request form when the user is not logged in.
 * Keeps 108 one tap away so a logged-out user is never blocked in an emergency.
 */
export default function AmbulanceLoginPrompt({ isOpen, onClose }) {
  const { openLoginModal } = useAuth();
  const location = useLocation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="We're right here for you" maxWidth="440px">
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Siren size={28} color="#dc2626" />
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 16px' }}>
          Please sign in so we know who you are and where to send help.
          It takes less than a minute, and your details stay safe with us.
        </p>
        <div style={{ textAlign: 'left', padding: '12px 14px', marginBottom: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '13px', lineHeight: 1.5 }}>
          <strong>Is someone in danger right now?</strong> Don't wait to sign in.{" "}
          <a href="tel:108" style={{ color: '#dc2626', fontWeight: 700 }}>Call 108</a> for an emergency ambulance.
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="tel:108" className="btn" style={{ background: '#dc2626', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Phone size={15} /> Call 108
          </a>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              onClose();
              openLoginModal(location.pathname);
            }}
          >
            <User size={15} /> Sign in to Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}
