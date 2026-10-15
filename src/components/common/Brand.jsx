import { Link } from "react-router-dom";

export default function Brand() {
  return (
    <Link className="brand" to="/" style={{ display: "flex", alignItems: "center" }}>
      <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <img src="/secure-hospitals-logo.png" alt="Secure Hospitals – Arvaya Healthcare Ltd." style={{ height: "36px", objectFit: 'contain' }} />
      </div>
    </Link>
  );
}
