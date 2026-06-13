import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

const API_BASE = 'http://localhost:8081';
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];

function avColor(id) { return COLORS[(id || 0) % COLORS.length]; }
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}
function displayName(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return (p + ' ' + n).trim() || u?.email?.split('@')[0] || '—';
}
function initials(u) {
  return displayName(u).split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function alertName(a) {
  const p = a?.userPrenom ?? ''; const n = a?.userNom ?? '';
  return (p + ' ' + n).trim() || '—';
}
function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const today = dt.toDateString() === new Date().toDateString();
  const hm = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return today ? `Today, ${hm}` : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${hm}`;
}
function fmtDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), sec = s % 60;
  return m === 0 ? `${s}s` : `${m}m ${String(sec).padStart(2, '0')}s`;
}
function isToday(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getDate() === n.getDate() && dt.getMonth() === n.getMonth() && dt.getFullYear() === n.getFullYear();
}

const OB_META = {
  stairs:           { label: 'Stairs',       color: '#ef4444', bg: '#fef2f2' },
  staircase:        { label: 'Staircase',     color: '#ef4444', bg: '#fef2f2' },
  door:             { label: 'Door',          color: '#f97316', bg: '#fff7ed' },
  doors:            { label: 'Doors',         color: '#f97316', bg: '#fff7ed' },
  tree:             { label: 'Tree',          color: '#16a34a', bg: '#f0fdf4' },
  barrier:          { label: 'Barrier',       color: '#d97706', bg: '#fffbeb' },
  metallic_barrier: { label: 'Metal Barrier', color: '#d97706', bg: '#fffbeb' },
  car:              { label: 'Car',           color: '#6366f1', bg: '#eef2ff' },
  pothole:          { label: 'Pothole',       color: '#dc2626', bg: '#fef2f2' },
};
function obMeta(t) {
  if (!t) return { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
  return OB_META[t.toLowerCase().replace(/ /g, '_')] ?? { label: t, color: '#6b7280', bg: '#f3f4f6' };
}

// ── Icons ─────────────────────────────────────────────────────
const ic = (d, w = 16, h = 16) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: w, height: h, flexShrink: 0 }}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const IcHome   = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcUsers  = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink   = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar    = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcBell   = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>);
const IcUser   = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcLogout = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 14, 14);
const IcChevD  = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcMenu   = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcCheck  = ic(<polyline points="4,10 8,14 16,6"/>, 13, 13);
const IcSearch = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>);
const IcX      = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>);
const IcPhone  = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.7 10.5a19.79 19.79 0 01-3.07-8.63A2 2 0 012.62 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.91-.91a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.5v2.42z"/></>);
const IcMail   = ic(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>);
const IcPin    = ic(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>);
const IcHeart  = ic(<><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></>);
const IcEye    = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>);
const IcShield = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>);
const IcClock  = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>);
const IcWarn   = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size = 28 }) {
  return (
    <svg style={{ width: size, height: size, animation: 'spin 0.9s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="3.5" />
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, size = 32 }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolvePhoto(user?.photoUrl ?? user?.userPhotoUrl);
  const showPhoto = src && !imgErr;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avColor(user?.id ?? user?.userId),
      flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size > 44 ? 16 : 11,
    }}>
      {showPhoto
        ? <img src={src} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(user ?? {})}
    </div>
  );
}

// ── Profile Dropdown (admin header) ───────────────────────────
function ProfileDropdown({ profile, onClose }) {
  const navigate = useNavigate();
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 230, zIndex: 91, overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={profile} size={38} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName(profile) || 'Administrator'}
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.email || ''}
            </p>
          </div>
        </div>
        <button onClick={() => { onClose(); navigate('/profile'); }}
          style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IcUser /> My Profile
        </button>
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 16px' }} />
        <button onClick={() => { onClose(); logout(); }}
          style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IcLogout /> Logout
        </button>
      </div>
    </>
  );
}

// ── KPI Card (compact horizontal) ─────────────────────────────
function KpiCard({ Icon, label, value, sub, iconColor, iconBg, loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0 }}>
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</p>
        {loading
          ? <div style={{ height: 20, width: 44, background: '#f3f4f6', borderRadius: 5 }} />
          : <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>}
        {sub && !loading && <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Filter Select ─────────────────────────────────────────────
function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      height: 36, padding: '0 28px 0 10px', border: '1px solid #e5e7eb', borderRadius: 8,
      background: '#fff', fontSize: 13, color: value ? '#111827' : '#9ca3af',
      cursor: 'pointer', outline: 'none', appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6,9 12,15 18,9'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: 14,
      fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── User Profile Modal ─────────────────────────────────────────
function UserProfileModal({ userId, alertData, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/v1/admin/users/${userId}/profile`)
      .then(r => { if (!cancelled) setProfile(r.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load profile.'); })
      .finally(() => { if (!cancelled) setLoadingProfile(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const name = profile ? displayName(profile) : alertName(alertData);
  const photo = resolvePhoto(profile?.photoUrl ?? alertData?.userPhotoUrl);

  const ROLE_LABEL = { ADMIN: 'Administrator', COMPANION: 'Companion', VISUAL_IMPAIRED: 'Visually Impaired' };
  const ROLE_COLOR = { ADMIN: '#dc2626', COMPANION: '#2563eb', VISUAL_IMPAIRED: '#7c3aed' };
  const ROLE_BG    = { ADMIN: '#fef2f2', COMPANION: '#eff6ff', VISUAL_IMPAIRED: '#f5f3ff' };
  const roleColor  = ROLE_COLOR[profile?.role] || '#6b7280';
  const roleBg     = ROLE_BG[profile?.role]    || '#f3f4f6';

  const infoRow = (Icon, label, value, iconBg, iconColor) => !value ? null : (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0, marginTop: 1 }}>
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 13, color: '#111827', margin: 0, fontWeight: 500, wordBreak: 'break-word' }}>{value}</p>
      </div>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.15s ease',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        width: 420, maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.4,0.64,1)',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, zIndex: 1,
          width: 28, height: 28, borderRadius: '50%', border: 'none',
          background: '#f1f5f9', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
          <IcX />
        </button>

        {/* Header */}
        <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: avColor(userId), flexShrink: 0, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 22,
              boxShadow: '0 0 0 3px #fff, 0 0 0 5px #e5e7eb',
            }}>
              {photo
                ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials({ prenom: alertData?.userPrenom, nom: alertData?.userNom, ...profile })}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.3px' }}>{name}</p>
              {profile?.email && (
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.email}
                </p>
              )}
              {profile?.role && (
                <span style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 700,
                  color: roleColor, background: roleBg,
                  padding: '2px 9px', borderRadius: 20,
                  border: `1px solid ${roleColor}22`,
                }}>
                  {ROLE_LABEL[profile.role] || profile.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {loadingProfile ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '36px 0' }}>
              <Spinner size={32} />
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Contact</p>
              {infoRow(IcMail,  'Email',     profile?.email,              '#f0f9ff', '#0369a1')}
              {infoRow(IcPhone, 'Phone',     profile?.telephone,          '#f0fdf4', '#16a34a')}
              {infoRow(IcPhone, 'Emergency', profile?.telephoneUrgence,   '#fef2f2', '#dc2626')}

              {(profile?.groupeSanguin || profile?.niveauDeficience) && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>Medical</p>
                  {infoRow(IcHeart, 'Blood Type',        profile?.groupeSanguin,   '#fef2f2', '#dc2626')}
                  {infoRow(IcEye,   'Visual Impairment', profile?.niveauDeficience, '#f5f3ff', '#7c3aed')}
                </>
              )}

              {(alertData?.latitude != null) && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>Last Alert Location</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0, marginTop: 1 }}>
                      <IcPin />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinates</p>
                      <p style={{ fontSize: 13, color: '#111827', margin: '0 0 1px', fontWeight: 600 }}>{alertData.latitude.toFixed(5)}° N</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{alertData.longitude.toFixed(5)}° E</p>
                    </div>
                  </div>
                </>
              )}

              {profile?.adresse && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>Address</p>
                  {infoRow(IcPin, 'Registered Address', profile.adresse, '#f0fdf4', '#16a34a')}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ActiveAlertsPage() {
  const navigate = useNavigate();

  const [allAlerts,  setAllAlerts]  = useState([]);
  const [users,      setUsers]      = useState([]);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [resolving,  setResolving]  = useState(null);
  const [profOpen,   setProfOpen]   = useState(false);
  const [collapsed, toggleSidebar] = useSidebarState();

  const [modalUserId,    setModalUserId]    = useState(null);
  const [modalAlertData, setModalAlertData] = useState(null);

  const [search,          setSearch]          = useState('');
  const [filterObstacle,  setFilterObstacle]  = useState('');
  const [filterStatus,    setFilterStatus]    = useState('ACTIVE');
  const [sortBy,          setSortBy]          = useState('newest');

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/admin/alerts'),
      api.get('/api/v1/admin/users'),
      api.get('/api/v1/users/me'),
    ])
      .then(([ar, ur, pr]) => { setAllAlerts(ar.data); setUsers(ur.data); setProfile(pr.data); })
      .catch(() => toast.error('Failed to load alerts.'))
      .finally(() => setLoading(false));
  }, []);

  const activeAlerts   = useMemo(() => allAlerts.filter(a => a.status === 'ACTIVE'), [allAlerts]);
  const resolvedToday  = useMemo(() => allAlerts.filter(a => a.status === 'RESOLVED' && isToday(a.resolvedAt)).length, [allAlerts]);
  const monitoredUsers = useMemo(() => new Set(allAlerts.map(a => a.userId)).size, [allAlerts]);
  const avgResMs       = useMemo(() => {
    const w = allAlerts.filter(a => a.status === 'RESOLVED' && a.createdAt && a.resolvedAt);
    if (!w.length) return null;
    return w.reduce((s, a) => s + (new Date(a.resolvedAt) - new Date(a.createdAt)), 0) / w.length;
  }, [allAlerts]);

  const userMap = useMemo(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u; });
    return m;
  }, [users]);

  const obstacleOptions = useMemo(() => {
    const set = new Set(allAlerts.map(a => a.obstacleType).filter(Boolean));
    return [...set].map(t => ({ value: t, label: obMeta(t).label }));
  }, [allAlerts]);

  const filtered = useMemo(() => {
    let list = [...allAlerts];
    if (filterStatus)   list = list.filter(a => a.status === filterStatus);
    if (filterObstacle) list = list.filter(a => a.obstacleType === filterObstacle);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const n = alertName(a).toLowerCase();
        const em = (userMap[a.userId]?.email ?? '').toLowerCase();
        const ob = (a.obstacleType ?? '').toLowerCase();
        return n.includes(q) || em.includes(q) || ob.includes(q);
      });
    }
    if (sortBy === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === 'name') list.sort((a, b) => alertName(a).localeCompare(alertName(b)));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [allAlerts, filterStatus, filterObstacle, search, sortBy, userMap]);

  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      const { data: updated } = await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      setAllAlerts(prev => prev.map(a => a.id === alertId
        ? { ...a, ...updated, status: 'RESOLVED', resolvedAt: new Date().toISOString() } : a));
      toast.success('Alert resolved.');
    } catch (err) {
      if (err.response?.status === 409) toast.error('Already resolved.');
      else toast.error('Failed to resolve.');
    } finally { setResolving(null); }
  };

  const openModal = (alert) => {
    setModalUserId(alert.userId);
    setModalAlertData(alert);
  };

  const COLS = '25% 15% 25% 15% 10% 10%';

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'row',
      background: '#f8fafc', overflow: 'hidden',
      fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => toggleSidebar()}
        items={[
          { Icon: IcHome,  label: 'Dashboard',    path: '/admin' },
          { Icon: IcUsers, label: 'Users',         path: '/admin/users' },
          { Icon: IcLink,  label: 'Associations',  path: '/admin/associations' },
          { Icon: IcBell,  label: 'Active Alerts', path: '/admin/alerts', badge: activeAlerts.length || undefined },
          { Icon: IcBar,   label: 'Reports',       path: '/admin/reports' },
          { Icon: IcUser,  label: 'My Profile',    path: '/profile' },
        ]}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Header ── */}
        <header style={{
          height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => toggleSidebar()} style={{
              width: 32, height: 32, borderRadius: 7, border: '1px solid #e5e7eb',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#6b7280',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <IcMenu />
            </button>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => navigate('/admin')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280', fontWeight: 500, padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                Dashboard
              </button>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13, color: '#d1d5db' }} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Active Alerts</span>
            </nav>
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setProfOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: '1px solid #e5e7eb', borderRadius: 9, padding: '5px 10px 5px 6px',
              cursor: 'pointer', background: profOpen ? '#f9fafb' : '#fff',
            }}
              onMouseEnter={e => !profOpen && (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => !profOpen && (e.currentTarget.style.background = '#fff')}>
              <Avatar user={profile} size={24} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName(profile) || 'Admin'}
              </span>
              <span style={{ color: '#9ca3af' }}><IcChevD /></span>
            </button>
            {profOpen && <ProfileDropdown profile={profile} onClose={() => setProfOpen(false)} />}
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>

          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 3px', letterSpacing: '-0.4px' }}>Active Alerts</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Monitor and resolve incoming SOS alerts in real time.</p>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <KpiCard Icon={IcWarn}   label="Active Alerts"    value={activeAlerts.length}         iconColor="#dc2626" iconBg="#fef2f2" loading={loading} sub="Requiring attention" />
            <KpiCard Icon={IcShield} label="Resolved Today"   value={resolvedToday}               iconColor="#16a34a" iconBg="#f0fdf4" loading={loading} />
            <KpiCard Icon={IcUsers}  label="Users Monitored"  value={monitoredUsers}              iconColor="#2563eb" iconBg="#eff6ff" loading={loading} />
            <KpiCard Icon={IcClock}  label="Avg Resolution"   value={fmtDuration(avgResMs)}       iconColor="#d97706" iconBg="#fffbeb" loading={loading} />
          </div>

          {/* Filter bar */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '10px 14px',
            display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'nowrap',
          }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', pointerEvents: 'none' }}>
                <IcSearch />
              </span>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, obstacle…"
                style={{
                  width: '100%', height: 36, paddingLeft: 34, paddingRight: 12,
                  border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13,
                  outline: 'none', color: '#111827', background: '#fff', fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <FilterSelect value={filterObstacle} onChange={setFilterObstacle} placeholder="Obstacle Type" options={obstacleOptions} />
            <FilterSelect value={filterStatus}   onChange={setFilterStatus}   placeholder="All Status"
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'RESOLVED', label: 'Resolved' }]} />
            <FilterSelect value={sortBy}         onChange={setSortBy}         placeholder="Sort"
              options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'name', label: 'By name' }]} />
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '0 20px', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
              {['User', 'Obstacle', 'Location', 'Time', 'Status', 'Action'].map(h => (
                <div key={h} style={{ padding: '10px 8px 10px 0', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {h}
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '52px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <Spinner size={36} /><p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Loading alerts…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                  <IcBell />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>No alerts found</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Try adjusting your filters.</p>
              </div>
            ) : filtered.map((alert, i) => {
              const m = obMeta(alert.obstacleType);
              const isActive = alert.status === 'ACTIVE';
              const email = userMap[alert.userId]?.email ?? '';
              const name = alertName(alert);

              return (
                <div
                  key={alert.id ?? i}
                  onClick={() => openModal(alert)}
                  style={{
                    display: 'grid', gridTemplateColumns: COLS,
                    padding: '0 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* User */}
                  <div style={{ padding: '13px 8px 13px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar user={{ id: alert.userId, prenom: alert.userPrenom, nom: alert.userNom, photoUrl: alert.userPhotoUrl }} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      {email && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>}
                    </div>
                  </div>

                  {/* Obstacle */}
                  <div style={{ padding: '13px 8px 13px 0' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, color: m.color,
                      background: m.bg, padding: '4px 9px', borderRadius: 20,
                      border: `1px solid ${m.color}22`, whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                      {m.label}
                    </span>
                  </div>

                  {/* Location */}
                  <div style={{ padding: '13px 8px 13px 0' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alert.latitude != null ? `${alert.latitude.toFixed(4)}° N` : '—'}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alert.longitude != null ? `${alert.longitude.toFixed(4)}° E` : ''}
                    </p>
                  </div>

                  {/* Time */}
                  <div style={{ padding: '13px 8px 13px 0' }}>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0, fontWeight: 500 }}>{fmtTime(alert.createdAt)}</p>
                    {isActive && <p style={{ fontSize: 11, color: '#ef4444', margin: '1px 0 0', fontWeight: 500 }}>{timeAgo(alert.createdAt)}</p>}
                  </div>

                  {/* Status */}
                  <div style={{ padding: '13px 8px 13px 0' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 28, padding: '0 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                      color:      isActive ? '#dc2626' : '#16a34a',
                      background: isActive ? '#fef2f2' : '#f0fdf4',
                      border:     `1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#dc2626' : '#16a34a', flexShrink: 0 }} />
                      {isActive ? 'Active' : 'Resolved'}
                    </span>
                  </div>

                  {/* Action */}
                  <div style={{ padding: '13px 0' }} onClick={e => e.stopPropagation()}>
                    {isActive ? (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        disabled={resolving === alert.id}
                        style={{
                          width: 100, height: 30, display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center', gap: 5,
                          background: '#fff', color: '#16a34a',
                          border: '1px solid #bbf7d0', borderRadius: 8,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          opacity: resolving === alert.id ? 0.6 : 1,
                          transition: 'background 0.15s, border-color 0.15s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (resolving !== alert.id) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; } }}
                        onMouseLeave={e => { if (resolving !== alert.id) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#bbf7d0'; } }}
                      >
                        <IcCheck />
                        {resolving === alert.id ? '…' : 'Resolve'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Done</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && filtered.length > 0 && (
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0', textAlign: 'right' }}>
              {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </main>
      </div>

      {modalUserId != null && (
        <UserProfileModal
          userId={modalUserId}
          alertData={modalAlertData}
          onClose={() => { setModalUserId(null); setModalAlertData(null); }}
        />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </div>
  );
}
