import { CheckCircle, XCircle, Bell, X } from "lucide-react";
import { createPortal } from "react-dom";

const ACCENTS = {
  success: { color: "var(--success, #059669)", tint: "var(--success-light, #d1fae5)", Icon: CheckCircle },
  error: { color: "var(--danger, #dc2626)", tint: "var(--danger-light, #fee2e2)", Icon: XCircle },
  info: { color: "var(--primary, #08787d)", tint: "var(--primary-light, #e5f7f3)", Icon: Bell },
};

// The countdown bar drives auto-close (onAnimationEnd), so pausing it on hover keeps the toast open
const styles = `
.arvaya-toast {
  position: fixed; top: 24px; right: 24px; z-index: 99999999;
  width: 380px; max-width: calc(100vw - 32px);
  display: grid; grid-template-columns: 42px minmax(0, 1fr) 30px; column-gap: 12px; align-items: center;
  padding: 14px 12px 16px 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--toast-tint) 70%, #fff) 0, #fff 76px);
  border-radius: 18px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--toast-accent) 16%, transparent);
  box-shadow: 0 1px 2px rgba(16, 40, 48, 0.05), 0 8px 16px -4px rgba(16, 40, 48, 0.08), 0 24px 48px -12px rgba(16, 40, 48, 0.24);
  animation: arvayaToastIn 0.45s cubic-bezier(0.21, 1.02, 0.73, 1) both;
  font-family: inherit;
}
.arvaya-toast__icon {
  position: relative; flex-shrink: 0;
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: #fff; color: var(--toast-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--toast-accent) 14%, transparent), 0 4px 10px -2px color-mix(in srgb, var(--toast-accent) 25%, transparent);
}
.arvaya-toast--info .arvaya-toast__icon svg { animation: arvayaToastRing 1.2s ease-in-out 0.4s 2; transform-origin: 50% 10%; }
.arvaya-toast--info .arvaya-toast__icon::after {
  content: ""; position: absolute; top: 8px; right: 8px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #ef4444; box-shadow: 0 0 0 2px #fff;
}
.arvaya-toast__content { min-width: 0; overflow-wrap: anywhere; }
.arvaya-toast__meta {
  display: flex; align-items: center; gap: 6px; margin-bottom: 3px;
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em; color: var(--toast-accent);
}
.arvaya-toast__meta span { color: var(--text-muted, #70848b); font-weight: 500; }
.arvaya-toast__title { font-size: 15px; font-weight: 700; line-height: 1.35; color: var(--text-main, #152c36); }
.arvaya-toast__body {
  grid-column: 1 / -1; margin-top: 12px; padding: 10px 12px;
  background: color-mix(in srgb, var(--toast-accent) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--toast-accent) 10%, transparent); border-radius: 12px;
  font-size: 13.5px; line-height: 1.55; color: var(--text-main, #152c36);
  white-space: pre-line; overflow-wrap: anywhere; hyphens: auto;
  text-align: justify; text-align-last: left;
  max-height: min(240px, 40vh); overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--toast-accent) 30%, transparent) transparent;
}
.arvaya-toast__message { font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--text-main, #152c36); }
.arvaya-toast__close {
  align-self: start; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 50%; background: transparent; cursor: pointer;
  color: var(--text-muted, #70848b); transition: background 0.15s, color 0.15s;
}
.arvaya-toast__close:hover { background: #fff; color: var(--toast-accent); box-shadow: 0 1px 4px rgba(16, 40, 48, 0.12); }
.arvaya-toast__progress {
  position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
  background: linear-gradient(90deg, var(--toast-accent), color-mix(in srgb, var(--toast-accent) 55%, #fff));
  transform-origin: left; animation: arvayaToastProgress linear forwards;
}
.arvaya-toast:hover .arvaya-toast__progress,
.arvaya-toast:focus-within .arvaya-toast__progress { animation-play-state: paused; }
@keyframes arvayaToastIn {
  from { opacity: 0; transform: translateX(24px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes arvayaToastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes arvayaToastRing {
  0%, 100% { transform: rotate(0); }
  15% { transform: rotate(14deg); } 30% { transform: rotate(-12deg); }
  45% { transform: rotate(8deg); } 60% { transform: rotate(-5deg); } 75% { transform: rotate(2deg); }
}
@media (max-width: 480px) {
  .arvaya-toast { top: 16px; right: 16px; left: 16px; width: auto; max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .arvaya-toast, .arvaya-toast--info .arvaya-toast__icon svg { animation: none; }
}
`;

export default function Toast({ isOpen, title, message, type = "success", onClose, duration = 3000 }) {
  if (!isOpen) return null;

  const accent = ACCENTS[type] || ACCENTS.info;
  const { Icon } = accent;

  const content = (
    <div
      className={`arvaya-toast arvaya-toast--${type}`}
      role={type === "error" ? "alert" : "status"}
      style={{ "--toast-accent": accent.color, "--toast-tint": accent.tint }}
    >
      <style>{styles}</style>
      <div className="arvaya-toast__icon">
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="arvaya-toast__content">
        {title ? (
          <>
            {type === "info" && (
              <div className="arvaya-toast__meta">
                Arvaya Healthcare <span>· now</span>
              </div>
            )}
            <div className="arvaya-toast__title">{title}</div>
          </>
        ) : (
          <div className="arvaya-toast__message">{message}</div>
        )}
      </div>
      <button className="arvaya-toast__close" onClick={onClose} aria-label="Dismiss notification">
        <X size={16} strokeWidth={2.4} />
      </button>
      {title && message && <div className="arvaya-toast__body">{message}</div>}
      <div
        className="arvaya-toast__progress"
        style={{ animationDuration: `${duration}ms` }}
        onAnimationEnd={onClose}
      />
    </div>
  );

  if (typeof window === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
