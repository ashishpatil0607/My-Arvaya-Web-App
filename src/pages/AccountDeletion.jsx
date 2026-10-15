import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, ArrowLeft, Trash2, Mail, Phone, MessageSquare, ShieldAlert, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccountDeletion() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  // Synchronous guard so a fast double-click can't submit the request twice
  const submitLockRef = useRef(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!confirmDelete) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setBusy(true);
    // Simulate an API call
    setTimeout(() => {
      setIsSubmitted(true);
      setBusy(false);
      submitLockRef.current = false;
    }, 1200);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 20px',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-app)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Dynamic Ambient Background Elements */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(46, 102, 110, 0.08) 0%, rgba(46, 102, 110, 0) 70%)',
        borderRadius: '50%', transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
        transition: 'transform 0.2s ease-out', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', right: '10%', width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(251, 145, 63, 0.08) 0%, rgba(251, 145, 63, 0) 70%)',
        borderRadius: '50%', transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)`,
        transition: 'transform 0.2s ease-out', pointerEvents: 'none'
      }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '32px',
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: window.innerWidth > 768 ? 'row' : 'column',
        boxShadow: '0 24px 48px -12px rgba(18, 51, 58, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeIn 0.6s var(--ease-out)'
      }}>
        
        {/* Left Pane - Information & Branding */}
        <div style={{
          flex: '0.8',
          background: 'linear-gradient(145deg, #134e4a 0%, #0f766e 100%)',
          padding: '48px 40px',
          color: '#fff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Decorative overlay */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', marginBottom: '40px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
              <ArrowLeft size={16} /> Back to Arvaya
            </Link>
            
            <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.2', letterSpacing: '-0.02em', marginBottom: '16px' }}>
              We're sorry to see you go.
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', marginBottom: '40px' }}>
              Deleting your account will permanently remove your health records and personal data from our secure servers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { icon: ShieldAlert, title: 'Irreversible Action', desc: 'Once deleted, your data cannot be recovered.' },
                { icon: Trash2, title: 'Loss of Records', desc: 'All past appointments, prescriptions, and lab reports will be erased.' },
                { icon: AlertTriangle, title: 'Rewards Forfeited', desc: 'Any remaining wallet balance or loyalty points will be permanently lost.' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                    <item.icon size={20} color="#fca5a5" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{item.title}</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ position: 'relative', zIndex: 2, marginTop: '48px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            © {new Date().getFullYear()} Arvaya Healthcare Limited
          </div>
        </div>

        {/* Right Pane - Form */}
        <div style={{
          flex: '1.2',
          padding: '48px 40px',
          background: 'rgba(255, 255, 255, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {!isSubmitted ? (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '8px' }}>Confirm Deletion</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Please verify your details to authorize this request.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Input Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="email" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%', padding: '16px 16px 16px 48px', fontSize: '15px', borderRadius: '16px',
                        border: '1.5px solid rgba(18, 51, 58, 0.1)', background: 'rgba(255, 255, 255, 0.8)',
                        outline: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        color: 'var(--text-main)', boxShadow: '0 2px 4px rgba(0,0,0,0.02) inset'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px var(--primary-light)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(18, 51, 58, 0.1)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02) inset'; }}
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="phone" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel" id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%', padding: '16px 16px 16px 48px', fontSize: '15px', borderRadius: '16px',
                        border: '1.5px solid rgba(18, 51, 58, 0.1)', background: 'rgba(255, 255, 255, 0.8)',
                        outline: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        color: 'var(--text-main)', boxShadow: '0 2px 4px rgba(0,0,0,0.02) inset'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px var(--primary-light)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(18, 51, 58, 0.1)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02) inset'; }}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="reason" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Reason (Optional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }}>
                      <MessageSquare size={18} />
                    </div>
                    <textarea
                      id="reason" rows="2" value={reason} onChange={(e) => setReason(e.target.value)}
                      style={{
                        width: '100%', padding: '16px 16px 16px 48px', fontSize: '15px', borderRadius: '16px',
                        border: '1.5px solid rgba(18, 51, 58, 0.1)', background: 'rgba(255, 255, 255, 0.8)',
                        outline: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        color: 'var(--text-main)', resize: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02) inset'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px var(--primary-light)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(18, 51, 58, 0.1)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02) inset'; }}
                      placeholder="Please let us know how we can improve..."
                    ></textarea>
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(220, 38, 38, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
                  <input
                    type="checkbox"
                    id="confirm"
                    checked={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.checked)}
                    style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--danger)', cursor: 'pointer' }}
                  />
                  <label htmlFor="confirm" style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.5', cursor: 'pointer', userSelect: 'none' }}>
                    I understand that deleting my account is <strong style={{ color: 'var(--danger)' }}>permanent and irreversible</strong>. I will lose access to all my data.
                  </label>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button
                    type="submit"
                    disabled={busy || !confirmDelete}
                    style={{
                      width: '100%', background: busy || !confirmDelete ? 'var(--border)' : 'var(--danger)',
                      color: busy || !confirmDelete ? 'var(--text-muted)' : '#fff', border: 'none', padding: '18px',
                      borderRadius: '16px', fontSize: '16px', fontWeight: '700',
                      cursor: busy || !confirmDelete ? 'default' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                      transition: 'all 0.3s var(--ease-spring)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      boxShadow: busy || !confirmDelete ? 'none' : '0 8px 24px rgba(220, 38, 38, 0.3)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={e => { if (!busy && confirmDelete) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(220, 38, 38, 0.4)'; } }}
                    onMouseLeave={e => { if (!busy && confirmDelete) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(220, 38, 38, 0.3)'; } }}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s var(--ease-out)' }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--success), #22c55e)', width: '96px', height: '96px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px', boxShadow: '0 16px 32px rgba(34, 197, 94, 0.3)'
              }}>
                <CheckCircle size={48} color="#fff" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                Request Submitted
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: '1.6' }}>
                Your account deletion request has been securely logged. Our team will verify and process the permanent deletion within 7-14 business days. You will receive a final confirmation via email.
              </p>
              <Link
                to="/"
                style={{
                  color: '#fff', background: 'var(--primary)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  fontSize: '15px', textDecoration: 'none', padding: '16px 32px', borderRadius: '16px', transition: 'all 0.3s var(--ease-spring)',
                  boxShadow: '0 8px 24px rgba(46, 102, 110, 0.25)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(46, 102, 110, 0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(46, 102, 110, 0.25)'; }}
              >
                <ArrowLeft size={18} />
                Return to Homepage
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
