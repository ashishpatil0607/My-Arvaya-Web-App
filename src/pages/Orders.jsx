import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft, CalendarCheck, Clock, FlaskConical, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { getLabOrderHistory } from "../services/dataService";
import LabItemIcon from "../components/labs/LabItemIcon";

function getStoredUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("arvaya_user"));
    return user?.id || user?.user_id || user?.app_user_id || null;
  } catch {
    return null;
  }
}

const PAGE_SIZE = 9;

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) pages.push("...");
  for (let p = from; p <= to; p++) pages.push(p);
  if (to < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

function getStatusTone(status) {
  const s = String(status).toLowerCase();
  if (/(fail|cancel|reject|refund)/.test(s)) return "danger";
  if (/(paid|success|complete|deliver|ready|report)/.test(s)) return "success";
  return "pending";
}

function formatStatus(status) {
  const s = String(status).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const mapOrder = (order, index) => {
    const rawId = order.order_id || order.lab_order_id || order.id || `LAB-${Date.now()}-${index}`;
    const rawDate = order.order_date || order.created_at || order.created_on || order.date || order.orderDate || "Recent";
    const rawStatus = order.order_status || order.status || "Processing";
    const rawItems = order.test_names || order.tests || order.items || order.test_category_name || "Lab Test";
    const rawAmount = order.amount || order.total_amount || order.total || order.amount_paid || 0;
    const rawLab = order.lab_name || order.center_name || order.lab || order.hospital_name || "Arvaya Lab";
    const rawPatient = order.patient_name || order.patient || "";

    let statusTracking = 1;
    const s = String(rawStatus).toLowerCase();
    if (s.includes("deliver") || s.includes("complete") || s.includes("ready") || s.includes("report")) statusTracking = 3;
    else if (s.includes("process") || s.includes("collect") || s.includes("confirm")) statusTracking = 2;

    const parsedDate = (() => {
      if (rawDate && rawDate !== "Recent") {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) return d;
      }
      return null;
    })();

    const formattedDate = parsedDate
      ? parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : (typeof rawDate === "string" ? rawDate : "Recent");
    const formattedTime = parsedDate
      ? parsedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : "";

    return {
      id: String(rawId),
      date: formattedDate,
      time: formattedTime,
      status: String(rawStatus),
      items: typeof rawItems === "string" ? rawItems : Array.isArray(rawItems) ? rawItems.join(", ") : String(rawItems),
      amount: typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount) || 0,
      type: "Lab",
      tracking: statusTracking,
      address: rawLab,
      patientName: rawPatient,
      raw: order
    };
  };

  const fetchOrders = async (page) => {
    const patientId = getStoredUserId();
    if (!patientId) {
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const labOrders = await getLabOrderHistory(patientId, {
        pageSize: PAGE_SIZE,
        pageIndex: page,
        page
      });
      if (requestId !== requestIdRef.current) return;

      const list = Array.isArray(labOrders) ? labOrders : [];
      setOrders(list.slice(0, PAGE_SIZE).map(mapOrder));
      setTotalCount(Number(list.total) || list.length);
      setTotalPages(Math.max(1, Number(list.totalPages) || 1));
    } catch (err) {
      console.error("Failed to fetch lab orders:", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>
      {/* ── Internal Hero Banner ── */}
      <div className="orders-hero-banner">
        <svg className="orders-hero-wave" viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C150,90 320,10 500,45 L500,0 L0,0 Z" fill="rgba(255, 255, 255, 0.42)" />
        </svg>

        <div className="container">
          <div className="orders-hero-inner">
            <div className="orders-hero-content">
              <nav aria-label="Breadcrumb" className="orders-hero-breadcrumb">
                <Link to="/" className="orders-breadcrumb-link">Home</Link>
                <ChevronRight size={13} className="orders-breadcrumb-sep" />
                <span>My Orders</span>
              </nav>

              <div className="orders-hero-title-row">
                <h1 className="orders-hero-title">My Orders</h1>
                {totalCount > 0 && (
                  <span className="orders-hero-chip">
                    <FlaskConical size={13} /> {totalCount} {totalCount === 1 ? "order" : "orders"}
                  </span>
                )}
              </div>
              <p className="orders-hero-desc">Track your lab test orders, status and payments in one place.</p>
            </div>

            <div className="orders-hero-graphic" aria-hidden="true">
              <svg className="orders-hero-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Sparkles */}
                <path d="M107 19C107 23.2 109.8 26 114 26C109.8 26 107 28.8 107 33C107 28.8 104.2 26 100 26C104.2 26 107 23.2 107 19Z" fill="#14b8a6" />
                <path d="M13 46C13 49.5 15.5 52 19 52C15.5 52 13 54.5 13 58C13 54.5 10.5 52 7 52C10.5 52 13 49.5 13 46Z" fill="#14b8a6" />
                <circle cx="16" cy="74" r="2" fill="#2dd4bf" />
                <circle cx="112" cy="45" r="1.5" fill="#2dd4bf" />

                {/* Clipboard */}
                <rect x="24" y="24" width="62" height="76" rx="11" fill="#ffffff" stroke="#0d9488" strokeWidth="3.2" />
                <rect x="40" y="17" width="30" height="14" rx="5" fill="#ccfbf1" stroke="#0d9488" strokeWidth="3" />
                <path d="M36 48H58" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
                <path d="M36 60H66" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
                <path d="M36 72H54" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />

                {/* Test tube */}
                <g transform="rotate(18 86 72)">
                  <rect x="78" y="46" width="16" height="50" rx="8" fill="#ffffff" stroke="#0d9488" strokeWidth="3" />
                  <path d="M80.5 72H91.5V88C91.5 91 89 93.5 86 93.5C83 93.5 80.5 91 80.5 88V72Z" fill="#2dd4bf" />
                  <path d="M75 46H97" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '24px', paddingBottom: '28px' }}>
        {loading ? (
          <div className="orders-grid" aria-busy="true" aria-label="Loading orders">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <div key={i} className="order-card order-card--skeleton">
                <div className="order-card-top">
                  <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '14px', width: '70%', marginBottom: '10px' }} />
                    <div className="skeleton" style={{ height: '11px', width: '55%' }} />
                  </div>
                  <div className="skeleton" style={{ height: '22px', width: '56px', borderRadius: '999px' }} />
                </div>
                <div className="order-card-footer">
                  <div className="skeleton" style={{ height: '12px', width: '90px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '60px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <section className="orders-empty">
            <span className="orders-empty-blob orders-empty-blob--a" aria-hidden="true" />
            <span className="orders-empty-blob orders-empty-blob--b" aria-hidden="true" />

            <div className="orders-empty-art" aria-hidden="true">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 12C100 16.2 102.8 19 107 19C102.8 19 100 21.8 100 26C100 21.8 97.2 19 93 19C97.2 19 100 16.2 100 12Z" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="16" cy="88" r="2.5" fill="#ffffff" fillOpacity="0.6" />

                <rect x="26" y="22" width="56" height="74" rx="11" fill="#ffffff" />
                <rect x="40" y="15" width="28" height="13" rx="5" fill="#99f6e4" stroke="#ffffff" strokeWidth="3" />
                <circle cx="40" cy="48" r="3.5" fill="#5eead4" />
                <path d="M49 48H70" stroke="#ccfbf1" strokeWidth="4" strokeLinecap="round" />
                <circle cx="40" cy="62" r="3.5" fill="#5eead4" />
                <path d="M49 62H66" stroke="#ccfbf1" strokeWidth="4" strokeLinecap="round" />
                <circle cx="40" cy="76" r="3.5" fill="#5eead4" />
                <path d="M49 76H62" stroke="#ccfbf1" strokeWidth="4" strokeLinecap="round" />

                <g transform="rotate(20 90 74)">
                  <rect x="82" y="50" width="16" height="46" rx="8" fill="#ffffff" />
                  <path d="M85 74H95V88C95 90.8 92.8 93 90 93C87.2 93 85 90.8 85 88V74Z" fill="#14b8a6" />
                  <path d="M78 50H102" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
                </g>
              </svg>
            </div>

            <div className="orders-empty-body">
              <span className="orders-empty-eyebrow">Get started</span>
              <h2 className="orders-empty-title">No orders yet</h2>
              <p className="orders-empty-desc">Book your first lab test or health package. Your orders, status and reports will show up here.</p>

              <div className="orders-empty-actions">
                <Link to="/labs/all-tests" className="orders-empty-btn orders-empty-btn--primary">
                  <FlaskConical size={15} /> Book a Lab Test <ChevronRight size={15} />
                </Link>
                <Link to="/labs/all-packages" className="orders-empty-btn orders-empty-btn--ghost">
                  <Package size={15} /> View Packages
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="orders-grid">
            {orders.map(order => {
              const tone = getStatusTone(order.status);
              return (
                <article key={order.id} className="order-card">
                  <div className="order-card-top">
                    <div className="order-card-icon">
                      <LabItemIcon item={{ title: order.items }} size={22} />
                    </div>
                    <div className="order-card-info">
                      <h2 className="order-card-title" title={order.items}>{order.items}</h2>
                      <div className="order-card-meta">
                        <span><CalendarCheck size={13} /> {order.date}</span>
                        {order.time && <span><Clock size={13} /> {order.time}</span>}
                      </div>
                    </div>
                    <span className={`order-status order-status--${tone}`}>
                      <span className="order-status-dot" />
                      {formatStatus(order.status)}
                    </span>
                  </div>

                  <div className="order-card-footer">
                    <span className="order-card-label">Total amount</span>
                    <span className="order-card-amount">₹{order.amount.toLocaleString('en-IN')}</span>
                  </div>
                </article>
              );
            })}

          </div>
        )}

        {totalCount > 0 && (
          <div className="specialty-pagination-bar" style={{ marginTop: '16px', paddingTop: 0, borderTop: 'none' }}>
            <span className="pagination-info-text">
              Showing <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(currentPage * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong> {totalCount === 1 ? "order" : "orders"}
            </span>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={loading || currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <div className="pagination-pages-list">
                  {getPageRange(currentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="pagination-info-text" aria-hidden="true">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`pagination-num-btn ${currentPage === p ? "active" : ""}`}
                        onClick={() => goToPage(p)}
                        disabled={loading}
                        aria-label={`Page ${p}`}
                        aria-current={currentPage === p ? "page" : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={loading || currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .order-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .order-card:not(.order-card--skeleton):hover {
          transform: translateY(-2px);
          border-color: rgba(13, 148, 136, 0.35);
          box-shadow: 0 10px 24px rgba(13, 148, 136, 0.08);
        }
        .order-card-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 16px 14px;
        }
        .order-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .order-card-info {
          flex: 1;
          min-width: 0;
        }
        .order-card-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-main);
          margin: 2px 0 6px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .order-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .order-card-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .order-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .order-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .order-status--success {
          color: #15803d;
          background: #dcfce7;
        }
        .order-status--pending {
          color: #b45309;
          background: #fef3c7;
        }
        .order-status--danger {
          color: #b91c1c;
          background: #fee2e2;
        }
        .order-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding: 10px 16px;
          background: rgba(13, 148, 136, 0.04);
          border-top: 1px solid var(--border);
        }
        .order-card-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .order-card-amount {
          font-size: 18px;
          font-weight: 800;
          color: var(--primary);
          flex-shrink: 0;
        }
        @media (max-width: 400px) {
          .orders-grid {
            grid-template-columns: 1fr;
          }
        }
        .orders-empty {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 28px;
          max-width: 760px;
          margin: 12px auto 0;
          padding: 24px 28px;
          background: linear-gradient(120deg, #ffffff 0%, #f0fdfa 55%, #ccfbf1 100%);
          border: 1px solid rgba(13, 148, 136, 0.16);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(13, 148, 136, 0.08);
        }
        .orders-empty-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .orders-empty-blob--a {
          width: 220px;
          height: 220px;
          right: -70px;
          top: -90px;
          background: radial-gradient(circle, rgba(45, 212, 191, 0.28), transparent 70%);
        }
        .orders-empty-blob--b {
          width: 140px;
          height: 140px;
          right: 120px;
          bottom: -80px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.16), transparent 70%);
        }
        .orders-empty-art {
          position: relative;
          flex-shrink: 0;
          width: 124px;
          height: 124px;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #2dd4bf 0%, #0d9488 100%);
          box-shadow: 0 14px 28px rgba(13, 148, 136, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          transform: rotate(-4deg);
        }
        .orders-empty-art svg {
          width: 96px;
          height: 96px;
          transform: rotate(4deg);
          animation: orders-empty-float 3.6s ease-in-out infinite;
          filter: drop-shadow(0 6px 10px rgba(4, 80, 74, 0.25));
        }
        @keyframes orders-empty-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orders-empty-art svg { animation: none; }
        }
        .orders-empty-body {
          position: relative;
          min-width: 0;
        }
        .orders-empty-eyebrow {
          display: inline-block;
          padding: 3px 10px;
          margin-bottom: 8px;
          border-radius: 999px;
          background: rgba(13, 148, 136, 0.1);
          color: var(--primary, #0d9488);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .orders-empty-title {
          font-size: 21px;
          font-weight: 800;
          color: var(--text-main, #0b2545);
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }
        .orders-empty-desc {
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-muted);
          margin: 0 0 16px;
          max-width: 440px;
        }
        .orders-empty-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .orders-empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .orders-empty-btn--primary {
          background: var(--primary, #0d9488);
          color: #ffffff;
          box-shadow: 0 6px 14px rgba(13, 148, 136, 0.25);
        }
        .orders-empty-btn--primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(13, 148, 136, 0.3);
        }
        .orders-empty-btn--ghost {
          background: #ffffff;
          color: var(--primary, #0d9488);
          border: 1px solid rgba(13, 148, 136, 0.25);
        }
        .orders-empty-btn--ghost:hover {
          transform: translateY(-1px);
          background: #f0fdfa;
        }
        @media (max-width: 600px) {
          .orders-empty {
            flex-direction: column;
            text-align: center;
            gap: 18px;
            padding: 24px 18px;
          }
          .orders-empty-art {
            width: 104px;
            height: 104px;
          }
          .orders-empty-art svg {
            width: 80px;
            height: 80px;
          }
          .orders-empty-desc {
            margin-left: auto;
            margin-right: auto;
          }
          .orders-empty-actions {
            justify-content: center;
          }
        }
        .orders-hero-banner {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #effaf7 0%, #e3f7f2 50%, #ccf4eb 100%);
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
          padding: 16px 0;
        }
        .orders-hero-wave {
          position: absolute;
          right: 0;
          top: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }
        .orders-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
        }
        .orders-hero-content {
          max-width: 680px;
        }
        .orders-hero-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 4px;
        }
        .orders-breadcrumb-link {
          color: #55738d;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .orders-breadcrumb-link:hover {
          color: #0b2545;
        }
        .orders-breadcrumb-sep {
          color: #7a94a9;
          flex-shrink: 0;
        }
        .orders-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .orders-hero-desc {
          font-size: 13.5px;
          color: #55738d;
          margin: 2px 0 0 0;
          line-height: 1.5;
        }
        .orders-hero-title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .orders-hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(13, 148, 136, 0.2);
          color: #0d9488;
          font-size: 12.5px;
          font-weight: 700;
        }
        .orders-hero-graphic {
          flex-shrink: 0;
          display: flex;
        }
        .orders-hero-svg {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }
        @media (max-width: 640px) {
          .orders-hero-banner {
            padding: 12px 0;
          }
          .orders-hero-title {
            font-size: 19px;
          }
          .orders-hero-desc {
            font-size: 12.5px;
          }
          .orders-hero-svg {
            width: 52px;
            height: 52px;
          }
        }
        @media (max-width: 440px) {
          .orders-hero-inner {
            gap: 12px;
          }
          .orders-hero-graphic {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
