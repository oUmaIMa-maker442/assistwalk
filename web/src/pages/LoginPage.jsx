import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { saveAuth } from '../utils/auth';


// ── Real assets ───────────────────────────────────────────────
import heroIllustration from '../assets/hero-illustration.png';
import logoIcon         from '../assets/logo-icon.png';

// ── SVG Icons ─────────────────────────────────────────────────

const IconEmail = () => (
  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"
       stroke="#9ca3af" strokeWidth="1.6">
    <rect x="2" y="4" width="16" height="13" rx="2"/>
    <polyline points="2,4 10,11 18,4"/>
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"
       stroke="#9ca3af" strokeWidth="1.6">
    <rect x="4" y="9" width="12" height="9" rx="2"/>
    <path d="M7 9V6a3 3 0 0 1 6 0v3"/>
  </svg>
);

const IconEye = ({ open }) => (
  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"
       stroke="currentColor" strokeWidth="1.6">
    {open ? (
      <>
        <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/>
        <circle cx="10" cy="10" r="2.5"/>
      </>
    ) : (
      <>
        <path d="M14.12 14.12A9 9 0 0 1 10 16c-5.5 0-9-6-9-6a16 16 0 0 1 4.38-5"/>
        <path d="M6.5 4.5A9 9 0 0 1 10 4c5.5 0 9 6 9 6a15.7 15.7 0 0 1-1.67 2.68"/>
        <line x1="2" y1="2" x2="18" y2="18"/>
      </>
    )}
  </svg>
);

const IconSignIn = () => (
  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"
       stroke="currentColor" strokeWidth="2">
    <path d="M13 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4"/>
    <polyline points="9 14 13 10 9 6"/>
    <line x1="13" y1="10" x2="3" y2="10"/>
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"
       stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"
       stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const IconShieldCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"
       stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9,12 11,14 15,10"/>
  </svg>
);

// ── Feature row ───────────────────────────────────────────────
function Feature({ Icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{
        width: '44px', height: '44px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(255,255,255,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
      }}>
        <Icon />
      </div>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '13px', margin: 0 }}>
          {title}
        </p>
        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LoginPage() {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPwd,    setShowPwd]    = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      saveAuth(data.token, data.role, data.userId);
      if (data.role === 'ADMIN') {
        navigate('/admin');  // page de gestion des utilisateurs
      } else {
        navigate('/dashboard');     // dashboard accompagnateur
      }
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 16px 11px 44px',
    fontSize: '14px',
    background: '#ffffff',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      background: '#eef2f9',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ══ Body ═══════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 40px',
      }}>
        <div style={{
          maxWidth: '1100px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 460px',
          gap: '48px',
          alignItems: 'center',
          height: '100%',
          maxHeight: '700px',
        }}>

          {/* ═══ LEFT ════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={logoIcon} alt="AssistWalk" style={{
                width: '44px', height: '44px',
                borderRadius: '12px', objectFit: 'cover',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}/>
              <span style={{
                fontSize: '20px', fontWeight: 800,
                color: '#111827', letterSpacing: '-0.5px',
              }}>
                Assist<span style={{ color: '#2563eb' }}>Walk</span>
              </span>
            </div>

            {/* Tagline */}
            <div>
              <h1 style={{
                fontSize: 'clamp(26px, 3vw, 38px)',
                fontWeight: 800, color: '#111827',
                lineHeight: 1.15, margin: '0 0 8px',
                letterSpacing: '-1px',
              }}>
                Assist. Alert.<br />Support.
              </h1>
              <p style={{
                color: '#6b7280', fontSize: '14px',
                lineHeight: 1.6, maxWidth: '380px', margin: 0,
              }}>
                AssistWalk helps companions and administrators monitor
                and support visually impaired users in real time.
              </p>
            </div>

            {/* Hero image */}
            <div style={{
              width: '100%', maxWidth: '460px',
              background: '#eef2f9', borderRadius: '16px',
              overflow: 'hidden', padding: '4px 0 0 0',
            }}>
              <img
                src={heroIllustration}
                alt="Visually impaired user navigating with AssistWalk"
                style={{
                  width: '100%', objectFit: 'contain',
                  maxHeight: '160px', display: 'block',
                  mixBlendMode: 'multiply',
                }}
              />
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Feature Icon={IconUsers} title="Real-time Monitoring"  desc="Track users and receive live alerts." />
              <Feature Icon={IconBell}  title="Instant Alerts"        desc="Get notified about obstacles and SOS requests." />
              <Feature Icon={IconShieldCheck} title="Stay Connected"  desc="Ensure safety and respond when it matters most." />
            </div>
          </div>

          {/* ═══ RIGHT — Card ════════════════════════════════ */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '36px 40px 32px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
          }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{
                fontSize: '26px', fontWeight: 800, color: '#111827',
                margin: '0 0 6px', letterSpacing: '-0.5px',
              }}>
                Welcome Back
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Sign in to your AssistWalk account
              </p>
            </div>

            <form onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '14px',
                    top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', display: 'flex',
                  }}>
                    <IconEmail />
                  </span>
                  <input
                    type="email" value={email} required
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={inputStyle}
                    onFocus={e => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '14px',
                    top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', display: 'flex',
                  }}>
                    <IconLock />
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'} value={password} required
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={e => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                          style={{
                            position: 'absolute', right: '14px',
                            top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none',
                            cursor: 'pointer', color: '#9ca3af',
                            display: 'flex', padding: 0,
                          }}>
                    <IconEye open={showPwd} />
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#374151',
                  userSelect: 'none',
                }}>
                  <div onClick={() => setRememberMe(v => !v)} style={{
                    width: '20px', height: '20px', borderRadius: '6px',
                    border: rememberMe ? '2px solid #2563eb' : '2px solid #d1d5db',
                    background: rememberMe ? '#2563eb' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                  }}>
                    {rememberMe && (
                      <svg viewBox="0 0 12 10" style={{ width: 12, height: 10 }} fill="none">
                        <polyline points="1,5 4.5,9 11,1" stroke="white"
                                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  Remember me
                </label>
                <button type="button" style={{
                  background: 'none', border: 'none',
                  color: '#2563eb', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}>
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '12px', padding: '12px 16px',
                  color: '#dc2626', fontSize: '13px',
                }}>
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              {/* Sign In */}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px',
                background: loading ? '#93c5fd' : '#2563eb',
                color: '#fff', fontWeight: 700, fontSize: '15px',
                border: 'none', borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(37,99,235,0.30)',
                transition: 'background 0.15s, transform 0.1s',
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
                onMouseDown={e  => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e    => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {loading ? (
                  <>
                    <svg style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }}
                         viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor"
                              strokeWidth="4" style={{ opacity: 0.25 }}/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" style={{ opacity: 0.75 }}/>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <><IconSignIn /> Sign In</>
                )}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}/>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}/>
              </div>

              {/* Support */}
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Need help?{' '}
                <a href="#" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  Contact support
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* ══ Footer ═════════════════════════════════════════════ */}
      <footer style={{
        textAlign: 'center', padding: '10px',
        fontSize: '12px', color: '#9ca3af', flexShrink: 0,
      }}>
        © 2024 AssistWalk. All rights reserved.
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}