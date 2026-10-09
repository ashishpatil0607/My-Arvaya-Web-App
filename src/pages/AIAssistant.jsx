import { Brain, HeartPulse, Activity, ChevronRight, ShieldCheck, FileText, ActivitySquare, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function AIAssistant() {
  const [symptom, setSymptom] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = () => {
    if (!symptom.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        condition: "Viral Infection (Possible)",
        severity: "Mild",
        recommendation: "Rest, hydrate, and consider a virtual consultation with a General Physician. Monitor temperature for the next 24 hours.",
        actionText: "Consult General Physician"
      });
    }, 2000);
  };

  return (
    <main className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>
      {/* ── Internal Hero Banner with Gradient & AI Graphic ── */}
      <div className="ai-hero-banner">
        <svg className="ai-hero-wave" viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C150,90 320,10 500,45 L500,0 L0,0 Z" fill="rgba(255, 255, 255, 0.42)" />
        </svg>

        <div className="container">
          <div className="ai-hero-inner">
            <div className="ai-hero-content">
              <nav aria-label="Breadcrumb" className="ai-hero-breadcrumb">
                <Link to="/" className="ai-breadcrumb-link">Home</Link>
                <ChevronRight size={13} className="ai-breadcrumb-sep" />
                <span className="ai-breadcrumb-current">Arvaya AI</span>
              </nav>

              <h1 className="ai-hero-title">Arvaya AI Intelligence</h1>
              <p className="ai-hero-desc">Predictive health scores and AI-powered symptom checking.</p>
            </div>

            <div className="ai-hero-graphic" aria-hidden="true">
              <svg className="ai-hero-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Sparkles */}
                <path d="M107 19C107 23.2 109.8 26 114 26C109.8 26 107 28.8 107 33C107 28.8 104.2 26 100 26C104.2 26 107 23.2 107 19Z" fill="#14b8a6" />
                <path d="M13 46C13 49.5 15.5 52 19 52C15.5 52 13 54.5 13 58C13 54.5 10.5 52 7 52C10.5 52 13 49.5 13 46Z" fill="#14b8a6" />
                <circle cx="16" cy="74" r="2" fill="#2dd4bf" />
                <circle cx="112" cy="45" r="1.5" fill="#2dd4bf" />

                {/* Chat Bubble */}
                <path
                  d="M38 28H82C88.6 28 94 33.4 94 40V68C94 74.6 88.6 80 82 80H56L42 92V80H38C31.4 80 26 74.6 26 68V40C26 33.4 31.4 28 38 28Z"
                  fill="#ffffff"
                  stroke="#0d9488"
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                />

                {/* Heartbeat Line */}
                <path
                  d="M36 55H48L53 44L60 66L66 50L70 55H84"
                  stroke="#0d9488"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* AI Sparkle Badge */}
                <circle cx="88" cy="86" r="15" fill="#0d9488" />
                <path d="M88 77C88 82.5 90.5 85 96 86C90.5 87 88 89.5 88 95C88 89.5 85.5 87 80 86C85.5 85 88 82.5 88 77Z" fill="#ffffff" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        
        <div className="ai-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '32px' }}>
          
          {/* Left Column: Health Score */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px', alignSelf: 'start' }}>
            <div className="card-elevated" style={{ padding: '32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', background: 'linear-gradient(90deg, #fbbf24, #10b981)' }}></div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>Comprehensive Health Score</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Based on your lab reports, vitals, and activity.</p>
              
              <div style={{ position: 'relative', width: '200px', height: '100px', margin: '0 auto 24px', overflow: 'hidden' }}>
                <div style={{ width: '200px', height: '200px', borderRadius: '50%', border: '16px solid var(--border)', position: 'absolute', top: 0, left: 0, clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}></div>
                <div style={{ width: '200px', height: '200px', borderRadius: '50%', border: '16px solid #10b981', position: 'absolute', top: 0, left: 0, clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)', transform: 'rotate(45deg)' }}></div>
                <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', textAlign: 'center' }}>
                  <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>82</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Good</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}><HeartPulse size={14} color="#ef4444" /> Heart</div>
                  <b style={{ fontSize: '16px', color: 'var(--text-main)' }}>Healthy</b>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}><ActivitySquare size={14} color="#3b82f6" /> Vitals</div>
                  <b style={{ fontSize: '16px', color: 'var(--text-main)' }}>Stable</b>
                </div>
              </div>

              <button className="btn btn-secondary" style={{ width: '100%' }}>View Detailed Analysis</button>
            </div>

            <div className="card-elevated" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--primary)" /> Insights
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ fontSize: '14px', color: 'var(--text-main)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', marginTop: '6px', flexShrink: 0 }}></div>
                  Your Vitamin D levels have improved since your last test.
                </li>
                <li style={{ fontSize: '14px', color: 'var(--text-main)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', marginTop: '6px', flexShrink: 0 }}></div>
                  Slightly elevated cholesterol. Recommend dietary adjustments.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Symptom Checker */}
          <div className="card-elevated" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>AI Symptom Checker</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Describe your symptoms for a quick assessment.</p>
              </div>
            </div>

            <textarea 
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="E.g., I have been experiencing a mild headache and low-grade fever since yesterday morning..."
              style={{ width: '100%', height: '120px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '14px', lineHeight: 1.6, outline: 'none', resize: 'none', marginBottom: '16px' }}
            ></textarea>

            <button 
              className="btn btn-accent flex items-center justify-center gap-2" 
              style={{ padding: '14px', fontSize: '15px' }}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? <span className="pulse-dot" style={{ background: 'white' }}></span> : <Brain size={18} />}
              {analyzing ? 'Analyzing Symptoms...' : 'Analyze Symptoms'}
            </button>

            {result && (
              <div className="animate-fade-in-up" style={{ marginTop: '24px', padding: '24px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertCircle size={18} color="#eab308" />
                  <b style={{ fontSize: '15px', color: 'var(--text-main)' }}>{result.condition}</b>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Severity:</span>
                  <span style={{ padding: '4px 8px', background: '#fef08a', color: '#854d0e', borderRadius: '4px', fontWeight: '600' }}>{result.severity}</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '20px' }}>
                  {result.recommendation}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', fontStyle: 'italic' }}>
                  * This is an AI-generated assessment and does not replace professional medical advice.
                </div>
                <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FileText size={16} /> {result.actionText}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .ai-hero-banner {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #effaf7 0%, #e3f7f2 50%, #ccf4eb 100%);
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
          padding: 16px 0;
        }
        .ai-hero-wave {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }
        .ai-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
        }
        .ai-hero-content {
          max-width: 680px;
        }
        .ai-hero-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 4px;
        }
        .ai-breadcrumb-link {
          color: #55738d;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .ai-breadcrumb-link:hover {
          color: #0b2545;
        }
        .ai-breadcrumb-sep {
          color: #7a94a9;
          flex-shrink: 0;
        }
        .ai-breadcrumb-current {
          color: #55738d;
        }
        .ai-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .ai-hero-desc {
          font-size: 13.5px;
          color: #55738d;
          margin: 2px 0 0 0;
          line-height: 1.5;
        }
        .ai-hero-graphic {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ai-hero-svg {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }
        @media (max-width: 640px) {
          .ai-hero-banner { padding: 12px 0; }
          .ai-hero-title { font-size: 19px; }
          .ai-hero-desc { font-size: 12.5px; }
          .ai-hero-svg { width: 52px; height: 52px; }
        }
        @media (max-width: 440px) {
          .ai-hero-inner { gap: 12px; }
          .ai-hero-graphic { display: none; }
        }
        @media (max-width: 1024px) {
          .ai-grid { grid-template-columns: 1fr !important; }
          .ai-grid > div > .card-elevated { position: relative !important; top: 0 !important; }
        }
      `}} />
    </main>
  );
}
