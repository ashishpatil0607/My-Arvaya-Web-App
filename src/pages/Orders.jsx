import { useState, useEffect, useRef } from "react";
import { Package, Truck, CheckCircle2, ChevronRight, FileText, MapPin, CreditCard, ChevronLeft, Loader2, CalendarCheck, Clock } from "lucide-react";
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

export default function Orders() {
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mobileView, setMobileView] = useState("list");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const allFetchedOrdersRef = useRef([]);

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

  const fetchOrders = async (pageToFetch = 1) => {
    const patientId = getStoredUserId();
    if (!patientId) {
      setLoading(false);
      return;
    }

    if (pageToFetch === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }

    try {
      // Trigger API: /api/lims/laborder/history with pageSize: 10
      const labOrders = await getLabOrderHistory(patientId, {
        pageSize: 10,
        pageIndex: pageToFetch,
        page: pageToFetch
      });

      const mapped = (Array.isArray(labOrders) ? labOrders : []).map(mapOrder);

      if (pageToFetch === 1) {
        allFetchedOrdersRef.current = mapped;
        // Display initial 10 orders
        const initialBatch = mapped.slice(0, 10);
        setAllOrders(initialBatch);
        pageRef.current = 1;

        if (mapped.length > 10) {
          hasMoreRef.current = true;
          setHasMore(true);
        } else if (mapped.length < 10) {
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          hasMoreRef.current = true;
          setHasMore(true);
        }

        if (initialBatch.length > 0) {
          setSelectedOrder(initialBatch[0]);
        }
      } else {
        pageRef.current = pageToFetch;
        const currentDisplayedCount = pageToFetch * 10;
        
        let newBatch = [];
        if (allFetchedOrdersRef.current.length >= currentDisplayedCount) {
          // Client slice fallback if server returned full array on page 1
          newBatch = allFetchedOrdersRef.current.slice(0, currentDisplayedCount);
          setAllOrders(newBatch);
          if (allFetchedOrdersRef.current.length <= currentDisplayedCount) {
            hasMoreRef.current = false;
            setHasMore(false);
          }
        } else if (mapped.length > 0) {
          // Server-side paginated response
          setAllOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const uniqueNew = mapped.filter(o => !existingIds.has(o.id));
            const updated = [...prev, ...uniqueNew];
            allFetchedOrdersRef.current = updated;
            return updated;
          });
          if (mapped.length < 10) {
            hasMoreRef.current = false;
            setHasMore(false);
          }
        } else {
          hasMoreRef.current = false;
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch lab orders:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasMoreRef.current && !loadingMoreRef.current && !loading) {
        fetchOrders(pageRef.current + 1);
      }
    }
  };

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>
      {/* ── Internal Hero ── */}
      <div style={{ background: 'var(--bg-surface)', padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="flex items-center gap-2 text-muted mb-2" style={{ fontSize: '12px', fontWeight: '500' }}>
            <Link to="/" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--primary)'} onMouseOut={e => e.currentTarget.style.color=''}>Home</Link> <ChevronRight size={12} /> <span>My Orders</span>
          </div>
          <h1 className="text-h2" style={{ fontSize: '24px', color: 'var(--text-main)' }}>My Orders</h1>
          <p className="text-muted mt-2" style={{ fontSize: '14px' }}>Track your lab test orders.</p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : allOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No orders found.</div>
        ) : (
          <div 
            className="orders-grid" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
              gap: '24px', 
              alignItems: 'start'
            }}
          >
            {allOrders.map(order => (
              <div 
                key={order.id} 
                className="card hover-glow" 
                style={{ 
                  background: 'var(--bg-app)', 
                  borderRadius: '20px', 
                  padding: '24px', 
                  border: '1px solid var(--border)', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <LabItemIcon item={{ title: order.items }} size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {order.items}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarCheck size={14} /> <span>{order.date}</span>
                        </div>
                        {order.time && (
                          <>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }}></span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={14} /> <span>{order.time}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                  <span style={{ 
                    color: order.status === 'Delivered' || order.status === 'Completed' || order.status === 'Ready' ? '#16a34a' : '#d97706',
                    background: order.status === 'Delivered' || order.status === 'Completed' || order.status === 'Ready' ? '#dcfce7' : '#fef3c7',
                    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700'
                  }}>
                    {order.status}
                  </span>
                  <b style={{ fontSize: '24px', color: 'var(--primary)' }}>₹{order.amount}</b>
                </div>
              </div>
            ))}

            {loadingMore && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '16px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
                <Loader2 size={18} className="animate-spin" /> Loading more orders...
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
