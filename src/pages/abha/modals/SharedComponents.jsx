import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import useScrollLock from "../../../hooks/useScrollLock";

export function Overlay({ children, onClose }) {
  useScrollLock();

  const overlay = (
    <div style={{ position: "fixed", inset: 0, background: "rgba(18, 51, 58, 0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 10000, padding: "16px", overflowY: "auto" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "100%", display: "flex", justifyContent: "center", margin: "auto 0", flexShrink: 0 }}>{children}</div>
    </div>
  );

  return typeof document === "undefined" ? overlay : createPortal(overlay, document.body);
}

export function ModalShell({ title, subtitle, onClose, width = 420, children }) {
  return (
    <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "24px", width: "100%", maxWidth: `${width}px`, position: "relative", boxShadow: "var(--shadow-lg)" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-app)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <X size={18} color="var(--text-muted)" />
      </button>
      <div style={{ marginBottom: "20px", paddingRight: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-main)", margin: "0 0 4px", fontFamily: "var(--font-display)" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function SplitModalShell({ title, subtitle, onClose, width = 850, leftPanel, rightPanel }) {
  return (
    <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: `${width}px`, minHeight: "500px", maxHeight: "90vh", position: "relative", boxShadow: "var(--shadow-xl)", overflow: "hidden", border: "1px solid var(--border)", display: "flex" }}>

      {/* Close Button - absolute top right */}
      <button onClick={onClose} style={{ position: "absolute", top: "24px", right: "24px", background: "var(--bg-app)", border: "1px solid var(--border)", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", zIndex: 10 }} onMouseEnter={e => e.currentTarget.style.background = "var(--border)"} onMouseLeave={e => e.currentTarget.style.background = "var(--bg-app)"}>
        <X size={20} color="var(--text-muted)" />
      </button>

      {/* Left Panel */}
      <div style={{ flex: "0 0 340px", background: "var(--primary-deep)", color: "#fff", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* Decorative background circle */}
        <div style={{ position: "absolute", top: "-50px", left: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "var(--primary)", opacity: 0.2 }} />
        <div style={{ position: "absolute", bottom: "-100px", right: "-50px", width: "300px", height: "300px", borderRadius: "50%", background: "var(--accent)", opacity: 0.1 }} />

        <div style={{ position: "relative", zIndex: 1, padding: "48px 40px", display: "flex", flexDirection: "column", height: "100%" }}>
          {leftPanel}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, padding: "48px", display: "flex", flexDirection: "column", position: "relative", overflowY: "auto" }}>
        <div style={{ marginBottom: "32px", paddingRight: "40px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-main)", margin: "0 0 8px", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{title}</h2>
          {subtitle && <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{subtitle}</p>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {rightPanel}
        </div>
      </div>

    </div>
  );
}
