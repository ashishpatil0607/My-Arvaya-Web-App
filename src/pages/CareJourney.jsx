import { ChevronLeft, Building2, AlertTriangle, Activity, ChevronRight, CalendarCheck, Loader2, FileSearch, IdCard, Stethoscope, Headset, RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Antworkapi } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";

export default function CareJourney() {
  const navigate = useNavigate();
  const { user, openLoginModal } = useAuth();
  // UHID entered at login is stored as external_id
  const uhid = String(user?.external_id || user?.uhid || "").trim();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  // { kind: "not_found" | "no_uhid" | "failed", message? }
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      openLoginModal("/care-journey");
      return;
    }
    if (!uhid) {
      setLoading(false);
      setError({ kind: "no_uhid" });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    Antworkapi.get(`/api/PatientDashboard/${encodeURIComponent(uhid)}`)
      .then(res => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("API Error:", err);
        if (err.code === 404 || err.code === 400) {
          setError({ kind: "not_found" });
        } else {
          setError({ kind: "failed", message: err.message });
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, uhid, reloadKey]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const openDoc = (doc) => {
    setActiveDoc(doc);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--text-main)' }}>Log in to view your Care Journey</h2>
          <button onClick={() => openLoginModal("/care-journey")} className="btn hover-glow" style={{ marginTop: '16px' }}>Log In</button>
        </div>
      </main>
    );
  }

  if (error) {
    const variants = {
      not_found: {
        icon: <FileSearch size={38} strokeWidth={1.8} />,
        tone: 'var(--primary)',
        tint: 'var(--primary-light)',
        title: 'No care records yet',
        text: "We couldn't find any treatment history linked to your UHID. Your reports, prescriptions and discharge summaries will appear here once your hospital visits are synced.",
        primary: { label: 'Book a Consultation', icon: <Stethoscope size={18} />, onClick: () => navigate('/doctors') },
      },
      no_uhid: {
        icon: <IdCard size={38} strokeWidth={1.8} />,
        tone: 'var(--accent)',
        tint: '#fff3e8',
        title: 'Link your hospital UHID',
        text: 'Your Care Journey is built from your hospital records. Log in again and enter the UHID printed on your hospital card or receipt to see them here.',
        primary: { label: 'Contact Support', icon: <Headset size={18} />, onClick: () => navigate('/support') },
      },
      failed: {
        icon: <AlertTriangle size={38} strokeWidth={1.8} />,
        tone: 'var(--danger)',
        tint: '#fdeded',
        title: "We couldn't load your records",
        text: error.message || 'Something went wrong while fetching your Care Journey. Please check your connection and try again.',
        primary: { label: 'Try Again', icon: <RefreshCw size={18} />, onClick: () => setReloadKey(k => k + 1) },
      },
    };
    const v = variants[error.kind] || variants.failed;

    return (
      <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)', padding: '24px 16px' }}>
        <div className="animate-fade-in-up" style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: '480px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '28px', boxShadow: 'var(--shadow-lg)', padding: '44px 32px 32px', textAlign: 'center' }}>
          {/* soft top glow */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '-90px', left: '50%', transform: 'translateX(-50%)', width: '320px', height: '180px', borderRadius: '50%', background: v.tint, filter: 'blur(10px)', opacity: 0.9 }} />

          <div style={{ position: 'relative' }}>
            <div style={{ width: '96px', height: '96px', margin: '0 auto 24px', borderRadius: '50%', background: v.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 10px color-mix(in srgb, ${v.tint} 45%, transparent)` }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--bg-surface)', color: v.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                {v.icon}
              </div>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 10px', lineHeight: 1.25 }}>{v.title}</h2>

            {uhid && error.kind !== 'no_uhid' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--primary-dark)', background: 'var(--bg-app)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: '999px', marginBottom: '16px', letterSpacing: '0.03em' }}>
                <IdCard size={14} /> UHID · {uhid}
              </span>
            )}

            <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: '380px' }}>{v.text}</p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={v.primary.onClick} className="btn btn-primary hover-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '14px', fontWeight: '700' }}>
                {v.primary.icon} {v.primary.label}
              </button>
              <button onClick={() => navigate('/')} className="btn btn-secondary hover-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '14px', fontWeight: '700' }}>
                <Home size={18} /> Back to Home
              </button>
            </div>

            {error.kind === 'not_found' && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '24px 0 0' }}>
                Think this is a mistake?{' '}
                <button onClick={() => navigate('/support')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Contact support</button>
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  const { patientInfo, stats, timeline } = data || {};

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)', minHeight: '100vh', position: 'relative' }}>
      {/* HEADER HERO */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '24px 0' }}>
        <div className="container">
          <button onClick={() => navigate(-1)} className="hover-glow" style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '6px 12px', fontSize: '13px', fontWeight: '700', borderRadius: '8px' }}>
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            {/* PATIENT INFO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', flexShrink: 0, border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                {patientInfo?.name ? patientInfo.name.substring(0,2).toUpperCase() : 'PT'}
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0', textTransform: 'uppercase', lineHeight: 1.2 }}>{patientInfo?.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  <span>{patientInfo?.age} yrs</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }}></span>
                  <span style={{ textTransform: 'capitalize' }}>{patientInfo?.gender}</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }}></span>
                  <span style={{ color: 'var(--text-main)', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>UHID: {patientInfo?.uhid}</span>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: '#eef4fd', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '160px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '10px', color: '#1565c0', boxShadow: '0 2px 8px rgba(21,101,192,0.1)' }}>
                  <Building2 size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#1565c0', lineHeight: 1 }}>{patientInfo?.totalVisits || 0}</div>
                  <div style={{ fontSize: '12px', color: '#1565c0', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Visits</div>
                </div>
              </div>
              
              <div style={{ background: '#fdeded', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '160px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '10px', color: '#c62828', boxShadow: '0 2px 8px rgba(198,40,40,0.1)' }}>
                  <AlertTriangle size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#c62828', lineHeight: 1 }}>{stats?.criticalCases || 0}</div>
                  <div style={{ fontSize: '12px', color: '#c62828', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Records</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '48px 0 100px', display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '48px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: VISITS */}
        <aside style={{ position: 'sticky', top: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Visits</h3>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 14px', borderRadius: '20px' }}>{patientInfo?.totalVisits || 0} Total</span>
          </div>

          {(patientInfo?.visits || []).map((visit, index) => (
            <div key={visit.visitId || index} className="card hover-glow" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarCheck size={28} strokeWidth={2} />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                    {new Date(visit.dateOfAdmission).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </h4>
                  <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0 0 20px 0', fontWeight: '600' }}>Admission ID: {visit.visitId}</p>
                  {index === 0 && (
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1565c0', background: '#eef4fd', padding: '8px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} /> Latest Visit
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </aside>

        {/* RIGHT COLUMN: CARE JOURNEY TIMELINE */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Care Journey Documents</h3>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2e7d32', background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px' }}>{stats?.totalRecords || 0} Documents</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {(timeline || []).map((doc, idx) => {
              const docDate = doc.documentdate ? new Date(doc.documentdate) : null;
              
              return (
                <div key={doc.id || idx} style={{ display: 'flex', gap: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '64px', flexShrink: 0 }}>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
                      {docDate ? docDate.getDate() : '-'}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-muted)', margin: '6px 0 20px', textAlign: 'center' }}>
                      {docDate ? docDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '\n') : 'Undated'}
                    </div>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: doc.severity ? '#c62828' : '#ed6c02', marginBottom: '12px', boxShadow: `0 0 0 6px ${doc.severity ? '#ffebee' : '#fff3e0'}` }}></div>
                    {idx < timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border)' }}></div>}
                  </div>
                  
                  <div className="card hover-glow" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px', flex: 1, marginBottom: idx < timeline.length - 1 ? '40px' : '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#1b5e20', background: '#e8f5e9', padding: '8px 16px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{doc.documenttype}</span>
                      <button onClick={() => openDoc(doc)} className="btn hover-glow" style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: '#ed6c02', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '10px 16px', borderRadius: '12px' }}>
                        View Document <ChevronRight size={18} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                      {doc.department && (
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{doc.department}</div>
                        </div>
                      )}
                      {doc.doctorname && (
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doctor</div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{doc.doctorname}</div>
                        </div>
                      )}
                    </div>
                    
                    {doc.doc_summary && (
                      <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontWeight: '500' }}>
                          {doc.doc_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </section>
      </div>

      {/* Modal */}
      {isModalOpen && activeDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="animate-fade-in-up" style={{ background: '#ffffff', width: '100%', maxWidth: '850px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '95vh', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1a1a1a', padding: '4px' }}>
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#1a1a1a' }}>Report Details</h2>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#2a7c88', fontSize: '14px', fontWeight: '500' }}>Report Date :</span>
                  <span style={{ color: '#333333', fontSize: '14px', fontWeight: '400' }}>{activeDoc.documentdate_display || activeDoc.documentdate || 'Undated'}</span>
                </div>
                {activeDoc.department && (
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#2a7c88', fontSize: '14px', fontWeight: '500' }}>Department :</span>
                    <span style={{ color: '#333333', fontSize: '14px', fontWeight: '400' }}>{activeDoc.department}</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#2a7c88', fontSize: '14px', fontWeight: '500' }}>Document Type :</span>
                  <span style={{ color: '#333333', fontSize: '14px', fontWeight: '400', textTransform: 'uppercase' }}>{activeDoc.documenttype}</span>
                </div>
                {activeDoc.doctorname && (
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#2a7c88', fontSize: '14px', fontWeight: '500' }}>Doctor Name :</span>
                    <span style={{ color: '#333333', fontSize: '14px', fontWeight: '400' }}>{activeDoc.doctorname}</span>
                  </div>
                )}
              </div>

              {/* Report Document Placeholder (Just generic info for now) */}
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', background: '#fcfcfc', minHeight: '400px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#444', textTransform: 'uppercase' }}>{activeDoc.documenttype}</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#111', lineHeight: 1, textAlign: 'right' }}>SeCURE<br/><span style={{ fontSize: '10px', fontWeight: '600' }}>HOSPITALS</span></div>
                  </div>
                  <hr style={{ borderTop: '2px solid #333', margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                    <span>Patient: {activeDoc.patientname}</span>
                    <span>Pages: {activeDoc.startpagenumber}</span>
                  </div>
                  {activeDoc.filepath && (
                    <div style={{ marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                      <p>Document source available at:</p>
                      <code style={{ fontSize: '11px', background: '#eee', padding: '8px', borderRadius: '6px', display: 'block', wordBreak: 'break-all', marginTop: '8px' }}>
                        {activeDoc.filepath}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
