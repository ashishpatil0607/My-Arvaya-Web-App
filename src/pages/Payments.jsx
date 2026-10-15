import { useState, useRef } from "react";
import { CreditCard, CheckCircle2, FileText, ChevronRight, Download, Clock } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Payments() {
  const location = useLocation();
  const go = useNavigate();
  const checkoutAmount = location.state?.amount || null;
  const checkoutType = location.state?.type || "General Payment";
  
  const [activeTab, setActiveTab] = useState(checkoutAmount ? "checkout" : "history");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  // Synchronous lock so a fast double-click can't start two payments.
  const payLockRef = useRef(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const mockTransactions = [
    { id: "TXN90812", date: "2023-10-24", amount: 1450, type: "Pharmacy Order", status: "Completed" },
    { id: "TXN90744", date: "2023-10-15", amount: 600, type: "Doctor Consultation", status: "Completed" },
    { id: "TXN90532", date: "2023-09-28", amount: 1200, type: "Lab Package (Heart)", status: "Completed" }
  ];

  const handlePay = () => {
    if (payLockRef.current) return;
    payLockRef.current = true;
    setIsProcessing(true);
    setTimeout(() => {
      payLockRef.current = false;
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        go("/orders"); // Or anywhere else
      }, 2000);
    }, 1500);
  };

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>
      {/* ── Internal Hero ── */}
      <div style={{ background: 'var(--bg-surface)', padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="flex items-center gap-2 text-muted mb-2" style={{ fontSize: '12px', fontWeight: '500' }}>
            <Link to="/" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--primary)'} onMouseOut={e => e.currentTarget.style.color=''}>Home</Link> <ChevronRight size={12} /> <span>Payments & Invoices</span>
          </div>
          <h1 className="text-h2" style={{ fontSize: '24px' }}>Payments & Invoices</h1>
          <p className="text-muted mt-2" style={{ fontSize: '14px' }}>Secure checkout and transaction history.</p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '32px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {checkoutAmount && (
            <button onClick={() => setActiveTab("checkout")} style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px', color: activeTab === "checkout" ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === "checkout" ? '2px solid var(--primary)' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Checkout</button>
          )}
          <button onClick={() => setActiveTab("history")} style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px', color: activeTab === "history" ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === "history" ? '2px solid var(--primary)' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Transaction History</button>
          <button onClick={() => setActiveTab("invoices")} style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px', color: activeTab === "invoices" ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === "invoices" ? '2px solid var(--primary)' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Invoices</button>
        </div>

        {/* Checkout Tab */}
        {activeTab === "checkout" && checkoutAmount && (
          <div className="card-elevated" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
            {isSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle2 size={64} className="text-success" style={{ margin: '0 auto 24px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>Payment Successful!</h2>
                <p style={{ color: 'var(--text-muted)' }}>Your {checkoutType.toLowerCase()} order has been placed.</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>Redirecting to your orders...</p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Paying for {checkoutType}</span>
                  <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--primary-dark)', marginTop: '8px' }}>₹{checkoutAmount}</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: paymentMethod === 'upi' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', background: paymentMethod === 'upi' ? 'var(--primary-light)' : 'var(--bg-surface)', transition: 'all 0.2s' }}>
                    <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>UPI / QR (GPay, PhonePe, Paytm)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: paymentMethod === 'card' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', background: paymentMethod === 'card' ? 'var(--primary-light)' : 'var(--bg-surface)', transition: 'all 0.2s' }}>
                    <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Credit / Debit Card</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: paymentMethod === 'wallet' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', background: paymentMethod === 'wallet' ? 'var(--primary-light)' : 'var(--bg-surface)', transition: 'all 0.2s' }}>
                    <input type="radio" name="payment" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} />
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Arvaya Health Wallet</span>
                  </label>
                </div>

                <button className="btn btn-accent flex items-center justify-center gap-2 payments-pay-btn" style={{ width: '100%', padding: '16px', fontSize: '16px' }} onClick={handlePay} disabled={isProcessing}>
                  {isProcessing ? <span className="pulse-dot" style={{ background: 'white' }}></span> : <CreditCard size={20} />}
                  {isProcessing ? 'Processing Payment...' : `Pay ₹${checkoutAmount} Securely`}
                </button>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="card-elevated" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Transaction ID</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Type</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTransactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='var(--primary-light)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>{tx.id}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)' }}>{tx.date}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)' }}>{tx.type}</td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>₹{tx.amount}</td>
                      <td style={{ padding: '16px', fontSize: '14px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {mockTransactions.map(tx => (
              <div key={`inv-${tx.id}`} className="card-elevated" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-app)', borderRadius: '12px', color: 'var(--primary)' }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>Invoice {tx.id}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.type} • {tx.date}</span>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '8px', color: 'var(--primary)' }} title="Download PDF">
                  <Download size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
      <style>{`
        .payments-pay-btn:disabled { opacity: 0.6; cursor: default; transform: none !important; box-shadow: none !important; }
      `}</style>
    </main>
  );
}
