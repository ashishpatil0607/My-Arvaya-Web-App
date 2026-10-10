import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  CreditCard, 
  Calendar, 
  FileText, 
  UserPlus, 
  Upload, 
  TrendingUp, 
  Inbox, 
  CheckCircle2, 
  Award,
  IndianRupee,
  Loader2,
  Lock,
  Star,
  Mountain,
  Gift,
  FlaskConical,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getLoyaltyConfig, getPatientLoyalty, getLoyaltyHistory, redeemLoyaltyPoints } from "../services/dataService";

function formatModuleName(moduleStr = "") {
  if (!moduleStr) return "General Reward";
  const lower = moduleStr.toLowerCase().trim();
  if (lower === "lab" || lower === "lab_test") return "Lab";
  if (lower === "offline_payment" || lower === "offline_appointment") return "Offline Appointment";
  if (lower === "appointment" || lower === "online_appointment") return "Appointment";
  return moduleStr
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTaskIcon(title = "", type = "") {
  const lower = (title + " " + type).toLowerCase();
  if (lower.includes("offline") || lower.includes("payment") || lower.includes("bill") || lower.includes("pay")) {
    return CalendarClock;
  }
  if (lower.includes("appointment") || lower.includes("booking") || lower.includes("visit") || lower.includes("consult")) {
    return CalendarDays;
  }
  if (lower.includes("lab") || lower.includes("upload") || lower.includes("record") || lower.includes("test")) {
    return FlaskConical;
  }
  if (lower.includes("refer") || lower.includes("friend") || lower.includes("invite")) {
    return UserPlus;
  }
  if (lower.includes("abha") || lower.includes("verify") || lower.includes("id")) {
    return CheckCircle2;
  }
  if (lower.includes("profile") || lower.includes("checkup") || lower.includes("health")) {
    return Award;
  }
  return Sparkles;
}

const defaultEarnTasks = [
  { id: 3, source_module: "lab", moduleName: "Lab", points_per_amount: "50", expiry_days: 180, rateText: "+1 Pt / ₹50", icon: FlaskConical },
  { id: 2, source_module: "offline_payment", moduleName: "Offline Appointment", points_per_amount: "20", expiry_days: 365, rateText: "+1 Pt / ₹20", icon: CalendarDays },
  { id: 1, source_module: "appointment", moduleName: "Online Appointment", points_per_amount: "10", expiry_days: 365, rateText: "+1 Pt / ₹10", icon: CalendarClock }
];

export default function Rewards() {
  const { user, openLoginModal } = useAuth();
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem("arvaya_user") : null;
  const isLoggedIn = !!user || !!storedUser;

  const [points, setPoints] = useState(0);
  const [maxRedeemPoints, setMaxRedeemPoints] = useState(null);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showMoreEarn, setShowMoreEarn] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [earnTasks, setEarnTasks] = useState(defaultEarnTasks);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchRewardsData() {
      setLoadingTasks(true);
      setLoadingPoints(true);
      try {
        const storedUser = localStorage.getItem("arvaya_user");
        let parsedUser = user;
        if (!parsedUser && storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch (e) {
            console.error("Error parsing stored user", e);
          }
        }

        if (!parsedUser) {
          setPoints(0);
          setHistory([]);
          // Fetch loyalty config for earn tasks display
          const configRes = await getLoyaltyConfig({ filterQuery: "is_active:1" }).catch(() => null);
          if (configRes && isMounted) {
            let rawList = Array.isArray(configRes) ? configRes : (configRes?.data || configRes?.list || configRes?.config || configRes?.result || []);
            const activeItems = rawList.filter(item => item.is_active === undefined || item.is_active === null || String(item.is_active) === '1' || item.is_active === true);
            if (activeItems.length > 0) {
              const mappedTasks = activeItems.map((item, idx) => {
                const rawModule = item.source_module || item.module || item.title || item.name || `Module #${idx + 1}`;
                const moduleName = formatModuleName(rawModule);
                const ppa = item.points_per_amount ?? item.amount_per_point ?? item.pts ?? item.points ?? 10;
                const numAmt = parseFloat(ppa);
                const amtStr = !isNaN(numAmt) ? (numAmt % 1 === 0 ? numAmt.toString() : numAmt.toFixed(2)) : String(ppa);
                return {
                  id: item.id || idx + 1,
                  source_module: item.source_module || rawModule,
                  moduleName,
                  points_per_amount: amtStr,
                  expiry_days: item.expiry_days ?? item.expiry ?? null,
                  rateText: `+1 Pt / ₹${amtStr}`,
                  icon: getTaskIcon(moduleName, item.source_module || "")
                };
              });
              setEarnTasks(mappedTasks);
            }
          }
          setLoadingTasks(false);
          setLoadingPoints(false);
          return;
        }

        const patient_id = parsedUser?.id || parsedUser?.user_id || parsedUser?.patient_id || parsedUser?.app_user_id;
        if (!patient_id) {
          setPoints(0);
          setHistory([]);
          setLoadingTasks(false);
          setLoadingPoints(false);
          return;
        }

        const [loyaltyRes, configRes, historyRes] = await Promise.all([
          getPatientLoyalty(patient_id).catch(err => {
            console.error("Failed to fetch patient loyalty:", err);
            return null;
          }),
          getLoyaltyConfig({ filterQuery: "is_active:1" }).catch(err => {
            console.error("Failed to fetch loyalty config:", err);
            return null;
          }),
          getLoyaltyHistory(patient_id).catch(err => {
            console.error("Failed to fetch loyalty history:", err);
            return null;
          })
        ]);

        if (!isMounted) return;

        // Process Patient Loyalty total_amount & max_redeem_points
        if (loyaltyRes) {
          let lData = Array.isArray(loyaltyRes) ? loyaltyRes[0] : loyaltyRes;
          let totalAmt = 0;
          let maxRedeem = null;

          if (typeof lData === 'number' || typeof lData === 'string') {
            totalAmt = parseFloat(lData) || 0;
          } else if (lData && typeof lData === 'object') {
            const val = lData.total_amount ??
                        lData.totalAmount ??
                        lData.total_points ??
                        lData.total ??
                        lData.points ??
                        lData.reward_points ??
                        lData.balance ??
                        lData.wallet_amount ??
                        lData.amount ??
                        (typeof lData.data === 'number' ? lData.data : (lData.data?.total_amount ?? 0));
            totalAmt = parseFloat(val) || 0;

            const maxVal = lData.max_redeem_points ??
                           lData.maxRedeemPoints ??
                           lData.max_points ??
                           lData.max_redeem ??
                           (lData.data?.max_redeem_points ?? null);
            if (maxVal !== null && maxVal !== undefined) {
              maxRedeem = parseFloat(maxVal);
            }
          }

          setPoints(isNaN(totalAmt) ? 0 : totalAmt);
          if (maxRedeem !== null && !isNaN(maxRedeem)) {
            setMaxRedeemPoints(maxRedeem);
          }
        }

        // Process Loyalty History from /api/loyalty/history
        let rawHistoryList = [];
        if (Array.isArray(historyRes)) {
          rawHistoryList = historyRes;
        } else if (typeof historyRes === 'object' && historyRes !== null) {
          rawHistoryList = historyRes.data || historyRes.history || historyRes.list || historyRes.transactions || historyRes.logs || [];
        }

        // Fallback to loyaltyRes embedded history if historyRes is empty
        if (rawHistoryList.length === 0 && loyaltyRes) {
          let lData = Array.isArray(loyaltyRes) ? loyaltyRes[0] : loyaltyRes;
          rawHistoryList = loyaltyRes.history ||
                           loyaltyRes.activities ||
                           loyaltyRes.transactions ||
                           loyaltyRes.logs ||
                           loyaltyRes.list ||
                           (lData && typeof lData === 'object' ? (lData.history || lData.activities || lData.transactions || lData.logs || lData.list) : null) ||
                           (loyaltyRes.data && typeof loyaltyRes.data === 'object' ? (loyaltyRes.data.history || loyaltyRes.data.activities || loyaltyRes.data.transactions || loyaltyRes.data.logs) : null) ||
                           [];
        }

        if (Array.isArray(rawHistoryList) && rawHistoryList.length > 0) {
          const formattedHistory = rawHistoryList.map((h, idx) => {
            let rawTitle = h.title || h.description || h.name || h.action_name || h.event_name || h.remarks || h.source_module || h.module;
            let title = rawTitle ? formatModuleName(rawTitle) : (h.type === 'redeemed' || h.type === 'debit' ? 'Redeemed Points' : 'Earned Points');

            let rawDate = h.created_at || h.date || h.created_date || h.date_time || h.timestamp;
            let date = "Recent";
            if (rawDate) {
              try {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                  date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                } else {
                  date = String(rawDate);
                }
              } catch {
                date = String(rawDate);
              }
            }

            let rawType = String(h.type || h.transaction_type || h.status || "").toLowerCase();
            let isRedeemed = rawType.includes('redeem') || rawType.includes('debit') || String(h.points || h.amount || h.pts || "").startsWith('-');
            let type = isRedeemed ? 'redeemed' : 'earned';

            let ptsVal = h.points ?? h.amount ?? h.pts ?? h.reward_points ?? h.points_earned ?? h.points_redeemed;
            let ptsStr = "";
            if (ptsVal !== undefined && ptsVal !== null) {
              const s = String(ptsVal);
              ptsStr = s.startsWith('+') || s.startsWith('-') ? s : `${type === 'redeemed' ? '-' : '+'}${s}`;
            } else {
              ptsStr = type === 'redeemed' ? '-50' : '+50';
            }

            return {
              id: h.id || h.transaction_id || idx + 1,
              title,
              date,
              points: ptsStr,
              type
            };
          });

          setHistory(formattedHistory);
        }

        // Process Loyalty Config from /api/loyalty/get
        if (configRes) {
          let rawList = [];
          if (Array.isArray(configRes)) {
            rawList = configRes;
          } else if (typeof configRes === 'object' && configRes !== null) {
            rawList = configRes.data || configRes.list || configRes.config || configRes.result || [];
          }

          // Filter only active items (is_active = 1)
          const activeItems = rawList.filter(item => {
            if (item.is_active !== undefined && item.is_active !== null) {
              return String(item.is_active) === '1' || item.is_active === true;
            }
            return true;
          });

          if (activeItems.length > 0) {
            const mappedTasks = activeItems.map((item, idx) => {
              const rawModule = item.source_module || item.module || item.title || item.name || `Module #${idx + 1}`;
              const moduleName = formatModuleName(rawModule);

              const ppa = item.points_per_amount ?? item.amount_per_point ?? item.pts ?? item.points ?? 10;
              const numAmt = parseFloat(ppa);
              const amtStr = !isNaN(numAmt) ? (numAmt % 1 === 0 ? numAmt.toString() : numAmt.toFixed(2)) : String(ppa);
              const rateText = `+1 Pt / ₹${amtStr}`;

              const expiryDays = item.expiry_days ?? item.expiry ?? null;

              return {
                id: item.id || idx + 1,
                source_module: item.source_module || rawModule,
                moduleName,
                points_per_amount: amtStr,
                expiry_days: expiryDays,
                rateText,
                icon: getTaskIcon(moduleName, item.source_module || "")
              };
            });

            setEarnTasks(mappedTasks);
          }
        }
      } catch (err) {
        console.error("Failed to fetch rewards data:", err);
      } finally {
        if (isMounted) {
          setLoadingTasks(false);
          setLoadingPoints(false);
        }
      }
    }

    fetchRewardsData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayedEarnTasks = showMoreEarn 
    ? earnTasks 
    : earnTasks.slice(0, 5);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleRedeemTabClick = async () => {
    if (isRedeeming) return;

    const storedUser = localStorage.getItem("arvaya_user");
    let parsedUser = user;
    if (!parsedUser && storedUser) {
      try {
        parsedUser = JSON.parse(storedUser);
      } catch (e) {
        console.error("Error parsing stored user", e);
      }
    }
    const patient_id = parsedUser?.id || parsedUser?.user_id || parsedUser?.patient_id || parsedUser?.app_user_id || 20546;
    const points_to_redeem = maxRedeemPoints || 30;

    setIsRedeeming(true);
    try {
      const res = await redeemLoyaltyPoints(patient_id, points_to_redeem);

      setPoints(prev => Math.max(0, prev - points_to_redeem));
      const newTx = {
        id: Date.now(),
        title: `Redeemed ${points_to_redeem} Loyalty Points`,
        date: "Just now",
        points: `-${points_to_redeem}`,
        type: "redeemed"
      };
      setHistory(prev => [newTx, ...prev]);
      showToast(`Successfully redeemed ${points_to_redeem} points!`);

      // Refresh loyalty info after redemption
      try {
        const freshLoyalty = await getPatientLoyalty(patient_id);
        if (freshLoyalty) {
          let lData = Array.isArray(freshLoyalty) ? freshLoyalty[0] : freshLoyalty;
          if (lData && typeof lData === 'object') {
            const val = lData.total_amount ?? lData.totalAmount ?? lData.total_points ?? lData.points ?? lData.balance;
            if (val !== undefined && val !== null) {
              const parsedVal = parseFloat(val);
              if (!isNaN(parsedVal)) setPoints(parsedVal);
            }
          }
        }
      } catch (e) {
        console.error("Error refreshing loyalty data:", e);
      }

    } catch (err) {
      console.error("Redemption failed:", err);
      showToast(err.message || "Failed to redeem points. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleEarnTaskClick = (task) => {
    const name = task.moduleName || task.title || "Module";
    const amt = task.points_per_amount;
    showToast(`Earn 1 Pt for every ${amt ? `₹${amt}` : 'eligible spend'} on ${name}`);
  };

  const redeemThreshold = maxRedeemPoints || 30;
  const canRedeem = isLoggedIn && points >= redeemThreshold;

  return (
    <main className="page rewards-page">
      {toastMessage && typeof document !== "undefined" && createPortal(
        <div className="wallet-toast" role="status">
          <Sparkles size={16} />
          {toastMessage}
        </div>,
        document.body
      )}

      <header className="wallet-top-shell">
        <div className="container">
          <div className="wallet-hero-banner">
            <div className="wallet-hero-content">
              <div className="wallet-hero-icon" aria-hidden="true">
                <Award size={26} />
              </div>

              <div>
                <div className="wallet-hero-pill-tag">
                  <Sparkles size={13} /> Arvaya Rewards &middot; Loyalty Points
                </div>

                <h1 className="wallet-hero-title">
                  Earn points on every visit & redeem rewards with ease.
                </h1>
                <p className="wallet-hero-subtitle">
                  Collect loyalty points on appointments and lab tests, then use them on your next booking.
                </p>

                <div className="wallet-hero-badges">
                  <span className="wallet-hero-badge">
                    <Star size={14} color="#fbbf24" /> Earn Rewards
                  </span>
                  <span className="wallet-hero-badge">
                    <Mountain size={14} color="#2dd4bf" /> Health Milestones
                  </span>
                  <span className="wallet-hero-badge">
                    <Gift size={14} color="#60a5fa" /> Special Benefits
                  </span>
                </div>
              </div>
            </div>

            <div className="wallet-hero-img-col">
              <div className="wallet-hero-img-wrap" aria-hidden="true">
                <img src="/images/rewards-loyalty.png" alt="" className="wallet-hero-photo" />
                {isLoggedIn && (
                  <div className="wallet-hero-stat-badge">
                    <CheckCircle2 size={14} />
                    <span>{loadingPoints ? "Loading points…" : `${points.toLocaleString()} pts available`}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container rewards-shell">
        <div className={`rewards-layout${isLoggedIn ? "" : " is-guest"}`}>
          <section className="rewards-primary-column">
            {!isLoggedIn ? (
            <section className="wallet-panel wallet-guest-panel">
              <div className="wallet-guest">
                <div className="wallet-guest-copy">
                  <span className="wallet-guest-eyebrow"><Sparkles size={13} /> Members only</span>
                  <h3>Every visit can earn you something back</h3>
                  <p>Sign in to see your loyalty points, track your activity and redeem points on your next booking.</p>

                  <ul className="wallet-guest-list">
                    <li>
                      <span className="wallet-guest-list-icon gift"><Award size={16} /></span>
                      <span><strong>Loyalty points</strong><small>Earn on every booking</small></span>
                    </li>
                    <li>
                      <span className="wallet-guest-list-icon"><FileText size={16} /></span>
                      <span><strong>Points history</strong><small>Every point, tracked</small></span>
                    </li>
                    <li>
                      <span className="wallet-guest-list-icon ticket"><Gift size={16} /></span>
                      <span><strong>Redeem rewards</strong><small>On eligible services</small></span>
                    </li>
                  </ul>

                  <div className="wallet-guest-actions">
                    <button type="button" className="wallet-guest-btn" onClick={() => openLoginModal && openLoginModal("/rewards")}>
                      Log In / Sign Up <ArrowRight size={16} />
                    </button>
                    <span className="wallet-guest-note"><ShieldCheck size={14} /> Takes less than a minute</span>
                  </div>
                </div>

                <div className="wallet-guest-visual" aria-hidden="true">
                  <div className="wallet-guest-card">
                    <div className="wallet-guest-card-top">
                      <span>Arvaya Rewards</span>
                      <Star size={16} />
                    </div>
                    <small>Loyalty points</small>
                    <strong>• • • • pts</strong>
                    <div className="wallet-guest-card-bars">
                      <span /><span />
                    </div>
                    <span className="wallet-guest-coin c1">₹</span>
                    <span className="wallet-guest-coin c2">₹</span>
                  </div>
                  <span className="wallet-guest-lock"><Lock size={20} /></span>
                  <img src="/images/rewards.png" alt="" className="wallet-guest-gift" />
                </div>
              </div>
            </section>
            ) : (
            <article className="rewards-balance-card new-rewards-card">
              <span className="rewards-card-sheen" aria-hidden="true" />
              <div className="rewards-balance-left">
                <span className="wallet-eyebrow">Available loyalty points</span>
                <div className="rewards-balance-row">
                  <div className="rewards-points-value" aria-label={`${points} available points`}>
                    {loadingPoints ? <Loader2 size={32} className="animate-spin" /> : points.toLocaleString()}
                    {!loadingPoints && <small>points</small>}
                  </div>
                </div>
                <p className="rewards-balance-sub">Start using our services to earn points and unlock rewards.</p>
              </div>

              <div className="rewards-balance-right">
                <div className="rewards-gift-container">
                  <img src="/images/rewards.png" alt="" className="rewards-gift-img" />
                </div>
                <div className="rewards-balance-action">
                  {canRedeem ? (
                    <button type="button" onClick={handleRedeemTabClick} disabled={isRedeeming}>
                      {isRedeeming ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      {isRedeeming ? "Redeeming" : `Redeem ${redeemThreshold} points`}
                    </button>
                  ) : (
                    <span className="rewards-redeem-badge"><TrendingUp size={15} /> {redeemThreshold} points to redeem</span>
                  )}
                  <small>Points can be applied to eligible services.</small>
                </div>
              </div>
            </article>
            )}

            <section className="wallet-panel rewards-earn-panel">
              <div className="wallet-panel-heading">
                <div className="wallet-section-title">
                  <span className="wallet-section-icon"><TrendingUp size={20} /></span>
                  <div>
                    <h2>Earn Points</h2>
                    <p>Active earning rules for healthcare services</p>
                  </div>
                </div>
                {!loadingTasks && <span className="wallet-count-badge">{earnTasks.length} ways</span>}
              </div>

              {loadingTasks ? (
                <div className="rewards-loading"><Loader2 size={25} className="animate-spin" /></div>
              ) : earnTasks.length === 0 ? (
                <div className="wallet-empty-state compact">
                  <span className="wallet-empty-icon"><Inbox size={22} /></span>
                  <h3>No earning rules available</h3>
                  <p>New opportunities will appear here.</p>
                </div>
              ) : (
                <div className="rewards-task-list">
                  {displayedEarnTasks.map((task, index) => {
                    const IconComp = task.icon || Sparkles;
                    const numAmt = parseFloat(task.points_per_amount || 0);
                    
                    let colorClass = "is-blue";
                    if (index % 3 === 1 || IconComp === CalendarDays) colorClass = "is-orange";
                    if (index % 3 === 2 || IconComp === CalendarClock) colorClass = "is-purple";

                    return (
                      <button type="button" key={task.id} className="rewards-task-card" onClick={() => handleEarnTaskClick(task)}>
                        <span className={`rewards-task-icon ${colorClass}`}><IconComp size={22} strokeWidth={2.5} /></span>
                        <span className="rewards-task-copy">
                          <strong>{task.moduleName || task.title}</strong>
                          <small>{task.expiry_days ? `Valid for ${task.expiry_days} days` : "Active earning rule"}</small>
                        </span>
                        <span className="rewards-task-rate">
                          {task.rateText || `+1 Pt / ₹${numAmt || task.points_per_amount}`}
                        </span>
                        <ChevronRight size={17} className="rewards-task-arrow" />
                      </button>
                    );
                  })}
                  {earnTasks.length > 5 && (
                    <button type="button" className="rewards-show-more" onClick={() => setShowMoreEarn(!showMoreEarn)}>
                      {showMoreEarn ? <>Show less <ChevronRight size={14} className="is-up" /></> : <>Show {earnTasks.length - 5} more <ChevronDown size={14} /></>}
                    </button>
                  )}
                </div>
              )}
            </section>
          </section>

          {isLoggedIn && (
          <aside className="wallet-panel rewards-history-panel">
            <div className="wallet-panel-heading">
              <div className="wallet-section-title">
                <span className="wallet-section-icon accent"><FileText size={20} /></span>
                <div>
                  <h2>Recent History</h2>
                  <p>Your points activity</p>
                </div>
              </div>
              <span className="wallet-count-badge">{history.length} activities</span>
            </div>

            {history.length === 0 ? (
              <div className="wallet-empty-state compact rewards-history-empty">
                <span className="wallet-empty-icon"><Inbox size={22} /></span>
                <h3>No activity yet</h3>
                <p>Your earned and redeemed points will appear here.</p>
              </div>
            ) : (
              <div className="rewards-history-list custom-scroller">
                {history.map(item => (
                  <article className="rewards-history-item" key={item.id}>
                    <span className={`rewards-history-icon ${item.type}`}>
                      {item.type === "earned" ? <TrendingUp size={18} /> : <CreditCard size={18} />}
                    </span>
                    <span className="rewards-history-copy">
                      <strong>{item.title}</strong>
                      <small>{item.date}</small>
                    </span>
                    <span className={`rewards-history-points ${item.type}`}>
                      <strong>{item.points} pts</strong>
                      <small>{item.type === "earned" ? "Earned" : "Redeemed"}</small>
                    </span>
                  </article>
                ))}
              </div>
            )}
          </aside>
          )}
        </div>
      </div>
    </main>
  );
}
