import { X } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Children can portal content (e.g. a confirm button) into this element so it stays
// pinned below the scrolling body, like the Call Ambulance modal footer.
const ModalFooterContext = createContext(null);
export const useModalFooter = () => useContext(ModalFooterContext);

export default function Modal({ isOpen, onClose, title, children, maxWidth = "600px", hideHeader = false }) {
  const [footerEl, setFooterEl] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      return () => { document.body.style.overflow = 'unset'; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        {!hideHeader && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        )}
        <ModalFooterContext.Provider value={footerEl}>
          <div className="modal-body">
            {children}
          </div>
        </ModalFooterContext.Provider>
        <div className="modal-footer-slot" ref={setFooterEl} />
      </div>
    </div>
  );

  if (typeof window === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
