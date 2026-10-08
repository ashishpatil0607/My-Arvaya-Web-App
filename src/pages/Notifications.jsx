import { useState, useEffect } from "react";
import { Bell, Calendar, Activity, CreditCard, Gift, AlertCircle, Info, Trash2, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { getNotifications } from "../services/dataService";

const CATEGORIES = [
  { id: "all", label: "All Notifications", icon: Bell, color: "#0d9488" },
  { id: "appointment", label: "Appointments", icon: Calendar, color: "var(--primary)" },
  { id: "lab", label: "Lab Reports", icon: Activity, color: "var(--success)" },
  { id: "wallet", label: "Wallet & Payments", icon: CreditCard, color: "var(--accent)" },
  { id: "rewards", label: "Rewards", icon: Gift, color: "#eab308" },
  { id: "emergency", label: "Emergency", icon: AlertCircle, color: "var(--danger)" }
];

const TYPE_LABELS = {
  appointment: "Appointment",
  lab: "Lab Report",
  wallet: "Payment",
  rewards: "Rewards",
  emergency: "Emergency",
};

function getNotificationMeta(type, title = "") {
  const t = String(type || "").toLowerCase();
  const titleLower = String(title || "").toLowerCase();
  if (t.includes("appoint") || titleLower.includes("appointment")) return { type: "appointment", icon: Calendar, color: "var(--primary)" };
  if (t.includes("lab") || titleLower.includes("lab")) return { type: "lab", icon: Activity, color: "var(--success)" };
  if (t.includes("wallet") || t.includes("pay") || titleLower.includes("wallet") || titleLower.includes("payment")) return { type: "wallet", icon: CreditCard, color: "var(--accent)" };
  if (t.includes("reward") || titleLower.includes("reward") || titleLower.includes("redeem") || (/\bpoints?\b/i.test(titleLower) && !titleLower.includes("appointment"))) return { type: "rewards", icon: Gift, color: "#eab308" };
  if (t.includes("emerg") || titleLower.includes("emerg") || titleLower.includes("ambulance") || titleLower.includes("booking")) return { type: "emergency", icon: AlertCircle, color: "var(--danger)" };
  return { type: t || "general", icon: Info, color: "var(--text-muted)" };
}

function mapNotificationItem(n) {
  const itemTitle = n.title || n.subject || n.name || "Notification";
  const meta = getNotificationMeta(n.type || n.notification_type || n.category, itemTitle);
  
  let timeStr = n.time || n.created_at || n.created_date || n.created_modified_date || "";
  if (timeStr && !isNaN(Date.parse(timeStr))) {
    timeStr = new Date(timeStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  return {
    id: n.id || n.notification_id || Math.random(),
    type: meta.type,
    title: itemTitle,
    message: n.message || n.description || n.content || n.text || "",
    time: timeStr || "Recently",
    read: Boolean(n.read ?? n.is_read ?? (n.status === "read" || n.status === 1)),
    icon: meta.icon,
    color: meta.color,
    raw: n
  };
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications("all");
  }, []);

  const fetchNotifications = async (catId = filter) => {
    setLoading(true);
    try {
      let payload = {};
      if (catId === "appointment") {
        payload = { filterQuery: "and title like '%Appointment%'" };
      } else if (catId === "lab") {
        payload = { filterQuery: "and title like '%Lab%'" };
      } else if (catId === "wallet") {
        payload = { filterQuery: "and (title like '%Payment%' or title like '%Wallet%')" };
      } else if (catId === "rewards") {
        payload = { filterQuery: "and (title like '%Redeem%' or title like '%Reward%' or title like '%Points%') and title not like '%Appointment%'" };
      } else if (catId === "emergency") {
        payload = { filterQuery: "and (title like '%Ambulance%' or title like '%Booking%' or title like '%Emergency%')" };
      }

      const data = await getNotifications(payload);
      if (Array.isArray(data) && data.length > 0) {
        setNotifications(data.map(mapNotificationItem));
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (catId) => {
    setFilter(catId);
    await fetchNotifications(catId);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "appointment") {
      const titleText = String(n.title || n.raw?.title || "").toLowerCase();
      return titleText.includes("appointment");
    }
    if (filter === "lab") {
      const titleText = String(n.title || n.raw?.title || "").toLowerCase();
      return titleText.includes("lab");
    }
    if (filter === "wallet") {
      const titleText = String(n.title || n.raw?.title || "").toLowerCase();
      return titleText.includes("payment") || titleText.includes("wallet");
    }
    if (filter === "rewards") {
      const titleText = String(n.title || n.raw?.title || "").toLowerCase();
      if (titleText.includes("appointment")) return false;
      return titleText.includes("reward") || titleText.includes("redeem") || /\bpoints?\b/i.test(titleText);
    }
    if (filter === "emergency") {
      const titleText = String(n.title || n.raw?.title || "").toLowerCase();
      return titleText.includes("ambulance") || titleText.includes("booking") || titleText.includes("emergency");
    }
    return n.type === filter;
  });

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>
      
      {/* ── Internal Hero Banner ── */}
      <div className="notif-hero-banner">
        <svg className="notif-hero-wave" viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C150,90 320,10 500,45 L500,0 L0,0 Z" fill="rgba(255, 255, 255, 0.42)" />
        </svg>

        <div className="container">
          <div className="notif-hero-inner">
            <div className="notif-hero-content">
              <nav aria-label="Breadcrumb" className="notif-hero-breadcrumb">
                <Link to="/" className="notif-breadcrumb-link">Home</Link>
                <ChevronRight size={13} className="notif-breadcrumb-sep" />
                <span>Notifications</span>
              </nav>

              <div className="notif-hero-title-row">
                <h1 className="notif-hero-title">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="notif-hero-chip">
                    <span className="notif-hero-chip-dot" /> {unreadCount} new
                  </span>
                )}
              </div>
              <p className="notif-hero-desc">Stay updated with your appointments and health alerts.</p>
            </div>

            <div className="notif-hero-actions">
              <button
                type="button"
                className="notif-mark-read-btn"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                <CheckCircle2 size={15} /> Mark all as read
              </button>

              <div className="notif-hero-graphic" aria-hidden="true">
                <svg className="notif-hero-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Sparkles */}
                  <path d="M107 19C107 23.2 109.8 26 114 26C109.8 26 107 28.8 107 33C107 28.8 104.2 26 100 26C104.2 26 107 23.2 107 19Z" fill="#14b8a6" />
                  <path d="M13 46C13 49.5 15.5 52 19 52C15.5 52 13 54.5 13 58C13 54.5 10.5 52 7 52C10.5 52 13 49.5 13 46Z" fill="#14b8a6" />
                  <circle cx="16" cy="78" r="2" fill="#2dd4bf" />
                  <circle cx="110" cy="48" r="1.5" fill="#2dd4bf" />

                  {/* Bell */}
                  <path d="M60 18C62.8 18 65 20.2 65 23V25.5C78 28 87 39.5 87 53V71L95 82C96.4 84 95 86.5 92.6 86.5H27.4C25 86.5 23.6 84 25 82L33 71V53C33 39.5 42 28 55 25.5V23C55 20.2 57.2 18 60 18Z" fill="#ffffff" stroke="#0d9488" strokeWidth="3.2" strokeLinejoin="round" />
                  <path d="M50 86.5C50 92.5 54.5 97 60 97C65.5 97 70 92.5 70 86.5" stroke="#0d9488" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="M44 52C44 45 48 39.5 54 37.5" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />

                  {/* Badge */}
                  <circle cx="84" cy="32" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '24px', paddingBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }} className="notifications-grid">
          
          {/* Sidebar Filters */}
          <aside className="notifications-sidebar" style={{ position: 'sticky', top: '24px' }}>
            <div className="notif-cat-card">
              <h3 className="notif-cat-heading">Categories</h3>
              <div className="notif-cat-list" role="tablist" aria-label="Notification categories">
                {CATEGORIES.map(cat => {
                  const active = filter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`notif-cat-btn ${active ? "active" : ""}`}
                      style={{ "--cat-color": cat.color }}
                      onClick={() => handleCategoryClick(cat.id)}
                    >
                      <span className="notif-cat-icon"><cat.icon size={16} /></span>
                      <span className="notif-cat-label">{cat.label}</span>
                      {active && !loading && (
                        <span className="notif-cat-count">{filteredNotifications.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Notifications List */}
          <section className="notif-scroll styled-scrollbar">
            {loading ? (
              <div className="notif-list" aria-busy="true" aria-label="Loading notifications">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="notif-card notif-card--skeleton">
                    <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '14px', width: '45%', marginBottom: '10px' }} />
                      <div className="skeleton" style={{ height: '11px', width: '85%', marginBottom: '8px' }} />
                      <div className="skeleton" style={{ height: '11px', width: '60%', marginBottom: '12px' }} />
                      <div className="skeleton" style={{ height: '10px', width: '130px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-art" aria-hidden="true">
                  <span className="notif-empty-ring notif-empty-ring--outer" />
                  <span className="notif-empty-ring notif-empty-ring--inner" />
                  <svg className="notif-empty-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Sparkles */}
                    <path d="M101 22C101 25.6 103.4 28 107 28C103.4 28 101 30.4 101 34C101 30.4 98.6 28 95 28C98.6 28 101 25.6 101 22Z" fill="#14b8a6" />
                    <path d="M19 70C19 72.8 20.9 74.7 23.7 74.7C20.9 74.7 19 76.6 19 79.4C19 76.6 17.1 74.7 14.3 74.7C17.1 74.7 19 72.8 19 70Z" fill="#2dd4bf" />
                    <circle cx="24" cy="36" r="2" fill="#5eead4" />
                    <circle cx="98" cy="84" r="1.6" fill="#5eead4" />

                    {/* Bell */}
                    <path d="M60 24C62.5 24 64.5 26 64.5 28.5V30.5C75.5 32.7 83 42.3 83 53.5V68.5L89.5 77.5C90.7 79.2 89.5 81.5 87.4 81.5H32.6C30.5 81.5 29.3 79.2 30.5 77.5L37 68.5V53.5C37 42.3 44.5 32.7 55.5 30.5V28.5C55.5 26 57.5 24 60 24Z" fill="#ffffff" stroke="#0d9488" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M51.5 81.5C51.5 86.5 55.3 90.5 60 90.5C64.7 90.5 68.5 86.5 68.5 81.5" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
                    <path d="M46.5 52.5C46.5 46.5 50 41.8 55 40" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />

                    {/* Check badge */}
                    <circle cx="81" cy="36" r="11" fill="#0d9488" stroke="#ffffff" strokeWidth="3" />
                    <path d="M76.5 36.2L79.6 39.2L85.5 33" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h3 className="notif-empty-title">You're all caught up!</h3>
                <p className="notif-empty-text">
                  {filter === "all"
                    ? "No notifications right now. We'll let you know when there's an update on your appointments, reports or payments."
                    : `No ${(CATEGORIES.find(c => c.id === filter)?.label || "").toLowerCase()} notifications yet. Check back later or browse all your alerts.`}
                </p>

                {filter !== "all" && (
                  <button type="button" className="notif-empty-btn" onClick={() => handleCategoryClick("all")}>
                    <Bell size={14} /> View all notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="notif-list">
                {filteredNotifications.map(notification => (
                  <article
                    key={notification.id}
                    className={`notif-card ${notification.read ? "" : "notif-card--unread"}`}
                    style={{ "--notif-color": notification.color }}
                  >
                    <div className="notif-card-icon">
                      <notification.icon size={20} />
                    </div>

                    <div className="notif-card-body">
                      <div className="notif-card-head">
                        <h3 className="notif-card-title">{notification.title}</h3>
                        {!notification.read && <span className="notif-unread-dot" aria-label="Unread" />}
                      </div>
                      {notification.message && (
                        <p className="notif-card-message">{notification.message}</p>
                      )}
                      <div className="notif-card-meta">
                        <span><Clock size={12} /> {notification.time}</span>
                        <span className="notif-card-tag">{TYPE_LABELS[notification.type] || "General"}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteNotification(notification.id)}
                      className="notif-delete-btn"
                      title="Delete"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={15} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .notif-hero-banner {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #effaf7 0%, #e3f7f2 50%, #ccf4eb 100%);
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
          padding: 16px 0;
        }
        .notif-hero-wave {
          position: absolute;
          right: 0;
          top: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }
        .notif-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
        }
        .notif-hero-content {
          max-width: 680px;
          min-width: 0;
        }
        .notif-hero-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 4px;
        }
        .notif-breadcrumb-link {
          color: #55738d;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .notif-breadcrumb-link:hover {
          color: #0b2545;
        }
        .notif-breadcrumb-sep {
          color: #7a94a9;
          flex-shrink: 0;
        }
        .notif-hero-title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .notif-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .notif-hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #dc2626;
          font-size: 12.5px;
          font-weight: 700;
        }
        .notif-hero-chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
        }
        .notif-hero-desc {
          font-size: 13.5px;
          color: #55738d;
          margin: 2px 0 0 0;
          line-height: 1.5;
        }
        .notif-hero-actions {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }
        .notif-mark-read-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(13, 148, 136, 0.25);
          color: #0d9488;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .notif-mark-read-btn:not(:disabled):hover {
          background: #ffffff;
          border-color: rgba(13, 148, 136, 0.5);
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.12);
          transform: translateY(-1px);
        }
        .notif-mark-read-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .notif-hero-graphic {
          display: flex;
        }
        .notif-hero-svg {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }
        @media (max-width: 640px) {
          .notif-hero-banner {
            padding: 12px 0;
          }
          .notif-hero-title {
            font-size: 19px;
          }
          .notif-hero-desc {
            font-size: 12.5px;
          }
          .notif-hero-svg {
            width: 52px;
            height: 52px;
          }
          .notif-hero-graphic {
            display: none;
          }
          .notif-mark-read-btn {
            padding: 7px 12px;
            font-size: 12px;
          }
        }
        @media (max-width: 480px) {
          .notif-hero-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
        .notif-scroll {
          min-width: 0;
          max-height: max(360px, calc(100vh - 270px));
          overflow-y: auto;
          padding: 2px 8px 4px 0;
        }
        .notif-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .notif-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 14px 14px 16px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .notif-card:not(.notif-card--skeleton):hover {
          transform: translateY(-2px);
          border-color: rgba(13, 148, 136, 0.35);
          box-shadow: 0 10px 24px rgba(13, 148, 136, 0.08);
        }
        .notif-card--unread {
          background: linear-gradient(90deg, rgba(13, 148, 136, 0.05) 0%, var(--bg-surface, #ffffff) 45%);
        }
        .notif-card--unread::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--notif-color, var(--primary));
        }
        .notif-card-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--notif-color, var(--primary));
          background: color-mix(in srgb, var(--notif-color, var(--primary)) 12%, transparent);
        }
        .notif-card-body {
          flex: 1;
          min-width: 0;
        }
        .notif-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 1px 0 4px;
        }
        .notif-card-title {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notif-card--unread .notif-card-title {
          font-weight: 700;
        }
        .notif-unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
          flex-shrink: 0;
        }
        .notif-card-message {
          font-size: 13.5px;
          color: var(--text-muted);
          margin: 0 0 8px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .notif-card-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px 12px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .notif-card-meta > span:first-child {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .notif-card-tag {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          color: var(--notif-color, var(--primary));
          background: color-mix(in srgb, var(--notif-color, var(--primary)) 10%, transparent);
        }
        .notif-delete-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .notif-card:hover .notif-delete-btn,
        .notif-delete-btn:focus-visible {
          opacity: 1;
        }
        .notif-delete-btn:hover {
          color: #dc2626;
          background: #fee2e2;
        }
        .notif-cat-card {
          padding: 14px 12px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(13, 148, 136, 0.05);
        }
        .notif-cat-heading {
          font-size: 11.5px;
          font-weight: 700;
          color: #7a94a9;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 2px 0 10px;
          padding-left: 8px;
        }
        .notif-cat-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .notif-cat-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 8px 10px 8px 8px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #55738d;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .notif-cat-btn:hover {
          background: var(--bg-app);
          color: #0b2545;
        }
        .notif-cat-btn:focus-visible {
          outline: 2px solid rgba(13, 148, 136, 0.45);
          outline-offset: 1px;
        }
        .notif-cat-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--cat-color);
          background: color-mix(in srgb, var(--cat-color) 11%, transparent);
          transition: background 0.2s ease, color 0.2s ease;
        }
        .notif-cat-label {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-cat-count {
          min-width: 24px;
          padding: 2px 8px;
          border-radius: 999px;
          background: #0d9488;
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 700;
          text-align: center;
        }
        .notif-cat-btn.active {
          background: var(--primary-light);
          color: #0b2545;
          font-weight: 700;
        }
        .notif-cat-btn.active::before {
          content: "";
          position: absolute;
          left: -12px;
          top: 9px;
          bottom: 9px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: #0d9488;
        }
        .notif-cat-btn.active .notif-cat-icon {
          background: var(--cat-color);
          color: #ffffff;
          box-shadow: 0 4px 10px color-mix(in srgb, var(--cat-color) 30%, transparent);
        }
        @media (max-width: 768px) {
          .notif-cat-card {
            padding: 0;
            background: transparent;
            border: none;
            box-shadow: none;
          }
          .notif-cat-heading {
            display: none;
          }
          .notif-cat-list {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
          }
          .notif-cat-btn {
            width: auto;
            max-width: 100%;
            gap: 6px;
            padding: 4px 11px 4px 4px;
            border-radius: 999px;
            background: var(--bg-surface, #ffffff);
            border: 1px solid var(--border);
            font-size: 12.5px;
          }
          .notif-cat-btn.active {
            border-color: rgba(13, 148, 136, 0.35);
          }
          .notif-cat-btn.active::before {
            display: none;
          }
          .notif-cat-icon {
            width: 26px;
            height: 26px;
            border-radius: 50%;
          }
          .notif-cat-icon svg {
            width: 14px;
            height: 14px;
          }
          .notif-cat-label {
            overflow: visible;
          }
          .notif-cat-count {
            min-width: 20px;
            padding: 1px 6px;
            font-size: 11px;
          }
        }
        .notif-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 44px 24px 40px;
          background:
            radial-gradient(circle at 50% 0%, rgba(20, 184, 166, 0.10) 0%, rgba(20, 184, 166, 0) 55%),
            var(--bg-surface, #ffffff);
          border: 1px solid var(--border);
          border-radius: 16px;
          animation: notifEmptyIn 0.35s ease both;
        }
        .notif-empty-art {
          position: relative;
          width: 132px;
          height: 132px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .notif-empty-ring {
          position: absolute;
          border-radius: 50%;
        }
        .notif-empty-ring--outer {
          inset: 0;
          background: rgba(20, 184, 166, 0.07);
          border: 1px dashed rgba(13, 148, 136, 0.22);
        }
        .notif-empty-ring--inner {
          inset: 20px;
          background: rgba(20, 184, 166, 0.12);
        }
        .notif-empty-svg {
          position: relative;
          width: 92px;
          height: 92px;
          filter: drop-shadow(0 8px 16px rgba(13, 148, 136, 0.16));
          animation: notifBellSway 3.2s ease-in-out infinite;
          transform-origin: 50% 22%;
        }
        .notif-empty-title {
          font-size: 17px;
          font-weight: 800;
          color: #0b2545;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }
        .notif-empty-text {
          max-width: 380px;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-muted);
          margin: 0;
        }
        .notif-empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 18px;
          padding: 8px 16px;
          border-radius: 999px;
          background: var(--primary-light);
          border: 1px solid rgba(13, 148, 136, 0.25);
          color: #0d9488;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .notif-empty-btn:hover {
          background: #ffffff;
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.12);
          transform: translateY(-1px);
        }
        @keyframes notifBellSway {
          0%, 100% { transform: rotate(0deg); }
          8% { transform: rotate(8deg); }
          16% { transform: rotate(-6deg); }
          24% { transform: rotate(3deg); }
          32% { transform: rotate(0deg); }
        }
        @keyframes notifEmptyIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .notif-empty, .notif-empty-svg { animation: none; }
        }
        @media (max-width: 426px) {
          .notif-empty { padding: 32px 16px 28px; }
          .notif-empty-art { width: 108px; height: 108px; }
          .notif-empty-ring--inner { inset: 16px; }
          .notif-empty-svg { width: 76px; height: 76px; }
          .notif-empty-title { font-size: 15.5px; }
          .notif-empty-text { font-size: 12.5px; }
        }
        @media (max-width: 768px) {
          .notifications-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 14px !important; }
          .notifications-sidebar { position: relative !important; top: 0 !important; min-width: 0; }
          .notif-scroll { max-height: none; overflow: visible; padding-right: 0; }
        }
        @media (max-width: 426px) {
          .notif-card {
            gap: 12px;
            padding: 14px 10px 12px 14px;
          }
          .notif-card-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }
          .notif-card-icon svg {
            width: 17px;
            height: 17px;
          }
          .notif-card-title {
            font-size: 13.5px;
          }
          .notif-card-message {
            font-size: 12.5px;
          }
          .notif-card-meta {
            font-size: 11px;
          }
          .notif-delete-btn {
            opacity: 1;
            width: 26px;
            height: 26px;
          }
        }
      `}} />
    </main>
  );
}
