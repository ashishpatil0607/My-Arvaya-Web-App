import { useEffect } from "react";

// Locks page scroll while `active` is true.
// Uses a class with !important on <html> instead of inline styles because:
// - <html> has overflow-x: clip (global.css), so body's overflow alone doesn't stop the page scrolling;
// - Razorpay checkout rewrites html/body inline overflow when it closes, which would drop an inline lock.
// A counter keeps the lock until the last open modal releases it.
export default function useScrollLock(active = true) {
  useEffect(() => {
    if (typeof document === "undefined" || !active) return;
    const html = document.documentElement;
    const count = Number(html.dataset.scrollLocks || 0) + 1;
    html.dataset.scrollLocks = String(count);
    html.classList.add("scroll-locked");
    return () => {
      const next = Math.max(0, Number(html.dataset.scrollLocks || 1) - 1);
      if (next === 0) {
        delete html.dataset.scrollLocks;
        html.classList.remove("scroll-locked");
      } else {
        html.dataset.scrollLocks = String(next);
      }
    };
  }, [active]);
}
