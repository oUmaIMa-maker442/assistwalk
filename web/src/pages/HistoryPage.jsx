import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/axiosInstance';
import { logout } from '../utils/auth';
import { useSidebarState } from '../hooks/useSidebarState';

// ─── Helpers ───────────────────────────────────────────────────

const OBSTACLE_META = {
  stairs:           { icon: '🪜', color: '#ef4444', bg: '#fef2f2', label: 'Stairs'           },
  staircase:        { icon: '🪜', color: '#ef4444', bg: '#fef2f2', label: 'Staircase'        },
  doors:            { icon: '🚪', color: '#f97316', bg: '#fff7ed', label: 'Door'             },
  door:             { icon: '🚪', color: '#f97316', bg: '#fff7ed', label: 'Door'             },
  tree:             { icon: '🌳', color: '#16a34a', bg: '#f0fdf4', label: 'Tree'             },
  metallic_barrier: { icon: '🚧', color: '#d97706', bg: '#fffbeb', label: 'Metallic Barrier' },
  barrier:          { icon: '🚧', color: '#d97706', bg: '#fffbeb', label: 'Barrier'          },
  car:              { icon: '🚗', color: '#6366f1', bg: '#eef2ff', label: 'Car'              },
  vehicle:          { icon: '🚗', color: '#6366f1', bg: '#eef2ff', label: 'Vehicle'          },
  uneven_sidewalk:  { icon: '⚠️', color: '#d97706', bg: '#fffbeb', label: 'Uneven Sidewalk' },
  pothole:          { icon: '🕳️', color: '#dc2626', bg: '#fef2f2', label: 'Pothole'         },
};

function obstacleMeta(type) {
  if (!type) return { icon: '🚨', color: '#ef4444', bg: '#fef2f2', label: 'Unknown' };
  const key = type.toLowerCase().replace(/ /g, '_');
  return OBSTACLE_META[key] ?? { icon: '🚨', color: '#6b7280', bg: '#f3f4f6', label: type };
}

function formatDateTime(dateStr) {
  if (!dateStr) return { date: '—', time: '' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function formatLastRefresh(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10)  return 'just now';
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function calcAvgResolutionTime(alerts) {
  const resolved = alerts.filter(a => a.resolvedAt && a.createdAt);
  if (!resolved.length) return '—';
  const avgMs = resolved.reduce((s, a) => s + (new Date(a.resolvedAt) - new Date(a.createdAt)), 0) / resolved.length;
  const mins = Math.floor(avgMs / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address ?? {};
    const street  = a.road ?? a.pedestrian ?? a.path ?? '';
    const city    = a.city ?? a.town ?? a.village ?? a.county ?? '';
    const country = a.country ?? '';
    return [street, city, country].filter(Boolean).join(', ') || null;
  } catch { return null; }
}

const PAGE_SIZE = 8;
const API_BASE = 'http://localhost:8081';
const AV_PALETTE = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2'];

function avColor(id) { return AV_PALETTE[Number(id ?? 0) % AV_PALETTE.length]; }
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}
function alertName(a) {
  const p = a?.userPrenom ?? ''; const n = a?.userNom ?? '';
  return (p + ' ' + n).trim() || '—';
}

// ─── Icons ─────────────────────────────────────────────────────

const IconHome     = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IconBell     = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IconClock    = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>;
const IconClockNav = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>;
const IconUser     = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLogout   = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconHelp     = () => <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconDownload = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconChevD    = () => <svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="4,6 8,10 12,6"/></svg>;
const IconChevL    = () => <svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,4 6,8 10,12"/></svg>;
const IconChevR    = () => <svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6,4 10,8 6,12"/></svg>;
const IconChevFwd  = () => <svg viewBox="0 0 16 16" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="5,3 10,8 5,13"/></svg>;
const IconCalendar = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconPin      = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconFilter   = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;
const IconRefresh  = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
const IconX        = () => <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconMenu     = () => <svg viewBox="0 0 20 20" fill="none" width="17" height="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="5" x2="18" y2="5"/><line x1="2" y1="10" x2="18" y2="10"/><line x1="2" y1="15" x2="18" y2="15"/></svg>;

// KPI card icons (22×22)
const KpiAlert  = () => <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const KpiCheck  = () => <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>;
const KpiUsers  = () => <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const KpiTimer  = () => <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>;

// ─── Sub-components ────────────────────────────────────────────

const COLS = '20% 13% 27% 15% 15% 10%';

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS,
      padding: '14px 24px', borderBottom: '1px solid #f3f4f6', alignItems: 'center',
    }}>
      {[140, 90, 150, 80, 80, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 28 : 12, width: w, borderRadius: 6,
          background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        }}/>
      ))}
    </div>
  );
}

function KpiCard({ title, value, sub, Icon, iconBg, iconColor }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: '1px solid #e5e7eb',
      padding: '13px 16px',
      display: 'flex', alignItems: 'center', gap: 13,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder, minWidth = 140 }) {
  return (
    <div style={{ position: 'relative', minWidth }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          width: '100%', padding: '7px 30px 7px 11px',
          border: '1px solid #e5e7eb', borderRadius: 9,
          background: '#fff',
          color: value ? '#111827' : '#9ca3af',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af', display: 'flex' }}>
        <IconChevD />
      </span>
    </div>
  );
}

function ObstacleBadge({ type }) {
  const m = obstacleMeta(type);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, color: m.color,
      background: m.bg, padding: '4px 9px', borderRadius: 20,
      border: `1px solid ${m.color}22`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }}/>
      {m.label}
    </span>
  );
}

function UserAvatar({ userId, prenom, nom, photoUrl, size = 32 }) {
  const [imgErr, setImgErr] = useState(false);
  const name = ((prenom ?? '') + ' ' + (nom ?? '')).trim() || '?';
  const ini  = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const src  = resolvePhoto(photoUrl);
  const showPhoto = src && !imgErr;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: avColor(userId),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size > 38 ? 14 : 11, flexShrink: 0,
      overflow: 'hidden',
    }}>
      {showPhoto
        ? <img src={src} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : ini}
    </div>
  );
}

// ── VI User Modal ─────────────────────────────────────────────
function ViUserModal({ userId, alertData, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loadingP, setLoadingP] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/v1/users/${userId}/profile`)
      .then(({ data }) => { if (!cancelled) setProfile(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingP(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const photo = resolvePhoto(profile?.photoUrl ?? alertData?.userPhotoUrl);
  const fullName = (() => {
    const p = profile?.prenom ?? alertData?.userPrenom ?? '';
    const n = profile?.nom    ?? alertData?.userNom    ?? '';
    return (p + ' ' + n).trim() || profile?.email?.split('@')[0] || '—';
  })();
  const ini = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const IcXs   = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  const IcMail = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
  const IcTel  = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
  const IcDrop = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>;
  const IcEyeS = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

  const infoRow = (icon, label, value, color, iconBg, action = null) => !value ? null : (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #f8fafc' }}>
      <div style={{ width:30, height:30, borderRadius:8, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', margin:'0 0 1px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
        <p style={{ fontSize:13, color:'#111827', margin:0, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</p>
      </div>
      {action}
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:5000,
        background:'rgba(15,23,42,0.5)',
        backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
        animation:'fadeIn 0.15s ease',
      }}/>
      <div style={{
        position:'fixed', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        zIndex:5001,
        background:'#fff', borderRadius:20,
        boxShadow:'0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        width:420, maxWidth:'calc(100vw - 32px)',
        maxHeight:'calc(100vh - 48px)', overflowY:'auto',
        animation:'modalIn 0.22s cubic-bezier(0.34,1.4,0.64,1)',
        fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:14, right:14, zIndex:1,
          width:28, height:28, borderRadius:'50%', border:'none',
          background:'#f1f5f9', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b',
          transition:'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background='#f1f5f9'}>
          {IcXs}
        </button>

        {/* Header */}
        <div style={{ padding:'24px 24px 18px', borderBottom:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{
              width:64, height:64, borderRadius:'50%', flexShrink:0,
              background: photo ? 'transparent' : avColor(userId),
              overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:800, fontSize:22,
              boxShadow:'0 0 0 3px #fff, 0 0 0 5px #e5e7eb',
            }}>
              {photo
                ? <img src={photo} alt={fullName} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.currentTarget.style.display='none';}}/>
                : ini}
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:17, fontWeight:800, color:'#111827', margin:'0 0 4px', letterSpacing:'-0.3px' }}>{fullName}</p>
              {profile?.email && (
                <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 7px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.email}</p>
              )}
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:20, padding:'2px 9px' }}>
                Visually impaired
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px 24px' }}>
          {loadingP ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'36px 0' }}>
              <svg style={{ width:32, height:32, animation:'spin 0.9s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="3.5"/>
                <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 8px' }}>Contact</p>
              {infoRow(IcMail,'Email',profile?.email,'#0369a1','#f0f9ff',
                profile?.email ? <a href={`mailto:${profile.email}`} style={{ fontSize:11, fontWeight:600, color:'#2563eb', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, padding:'2px 8px', textDecoration:'none', flexShrink:0 }}>Send</a> : null
              )}
              {infoRow(IcTel,'Phone',profile?.telephone,'#16a34a','#f0fdf4',
                profile?.telephone ? <a href={`tel:${profile.telephone}`} style={{ fontSize:11, fontWeight:600, color:'#16a34a', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'2px 8px', textDecoration:'none', flexShrink:0 }}>Call</a> : null
              )}
              {(profile?.telephoneUrgence || profile?.groupeSanguin || profile?.niveauDeficience) && (
                <>
                  <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 8px' }}>Medical</p>
                  {infoRow(IcTel,'Emergency contact',profile?.telephoneUrgence,'#dc2626','#fef2f2',
                    profile?.telephoneUrgence ? <a href={`tel:${profile.telephoneUrgence}`} style={{ fontSize:11, fontWeight:600, color:'#dc2626', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, padding:'2px 8px', textDecoration:'none', flexShrink:0 }}>Call</a> : null
                  )}
                  {infoRow(IcDrop,'Blood type',profile?.groupeSanguin,'#dc2626','#fef2f2')}
                  {infoRow(IcEyeS,'Visual impairment',profile?.niveauDeficience,'#7c3aed','#f5f3ff')}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    RESOLVED: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Resolved', dot: '#22c55e' },
    ACTIVE:   { bg: '#fef2f2', color: '#ef4444', border: '#fecaca', label: 'Active',   dot: '#ef4444' },
    PENDING:  { bg: '#fff7ed', color: '#d97706', border: '#fed7aa', label: 'Pending',  dot: '#f97316' },
  };
  const c = cfg[status] ?? cfg.ACTIVE;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 28, padding: '0 10px',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }}/>
      {c.label}
    </span>
  );
}

function Spinner() {
  return (
    <svg style={{ width: 28, height: 28, animation: 'spin 0.9s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3"/>
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─── Main ──────────────────────────────────────────────────────

export default function HistoryPage() {
  const navigate = useNavigate();

  const [allAlerts,        setAllAlerts]        = useState([]);
  const [addresses,        setAddresses]        = useState({});
  const [profile,          setProfile]          = useState(null);
  const [activeCount,      setActiveCount]      = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();
  const [lastRefresh,      setLastRefresh]      = useState(null);
  const [, forceRefreshLabel] = useState(0);

  const [filterObs,    setFilterObs]    = useState('');
  const [filterUser,   setFilterUser]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortKey,      setSortKey]      = useState('newest');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [page,         setPage]         = useState(0);
  const [viDrawer,     setViDrawer]     = useState(null);
  const [modalAlertData, setModalAlertData] = useState(null);

  const hasFilters = filterObs || filterUser || filterStatus || dateFrom || dateTo;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/v1/alerts/history');
        setAllAlerts(data);
        setActiveCount(data.filter(a => a.status === 'ACTIVE').length);
        setLastRefresh(Date.now());
        data.forEach(geocodeAlert);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
      try {
        const { data } = await api.get('/api/v1/users/me');
        setProfile(data);
      } catch { /* optional */ }
    })();
  }, []);

  // Keep the "last update" label live
  useEffect(() => {
    const id = setInterval(() => forceRefreshLabel(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const geocodeAlert = async (alert) => {
    if (!alert.latitude || !alert.longitude) return;
    const addr = await reverseGeocode(alert.latitude, alert.longitude);
    if (addr) setAddresses(prev => ({ ...prev, [String(alert.id)]: addr }));
  };

  const obstacleOptions = useMemo(() => {
    const types = [...new Set(allAlerts.map(a => a.obstacleType).filter(Boolean))];
    return types.map(t => ({ value: t, label: obstacleMeta(t).label }));
  }, [allAlerts]);

  const userOptions = useMemo(() => {
    const seen = new Map();
    allAlerts.forEach(a => { if (!seen.has(a.userId)) seen.set(a.userId, alertName(a)); });
    return [...seen.entries()].map(([id, name]) => ({ value: String(id), label: name || `User ${id}` }));
  }, [allAlerts]);

  const filtered = useMemo(() => {
    let list = [...allAlerts];
    if (filterObs)    list = list.filter(a => a.obstacleType === filterObs);
    if (filterUser)   list = list.filter(a => String(a.userId) === filterUser);
    if (filterStatus) list = list.filter(a => a.status === filterStatus);
    if (dateFrom)     list = list.filter(a => new Date(a.createdAt) >= new Date(dateFrom));
    if (dateTo)       list = list.filter(a => new Date(a.createdAt) <= new Date(dateTo + 'T23:59:59'));
    list.sort((a, b) => sortKey === 'newest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [allAlerts, filterObs, filterUser, filterStatus, dateFrom, dateTo, sortKey]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData    = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [filterObs, filterUser, filterStatus, dateFrom, dateTo, sortKey]);

  // Stats
  const resolvedCount  = allAlerts.filter(a => a.status === 'RESOLVED').length;
  const monitoredUsers = new Set(allAlerts.map(a => a.userId)).size;
  const avgResTime     = calcAvgResolutionTime(allAlerts);
  const resolutionRate = allAlerts.length ? Math.round(resolvedCount / allAlerts.length * 100) : 0;

  // Profile
  const firstName   = profile?.prenom ?? profile?.firstName ?? '';
  const lastName    = profile?.nom    ?? profile?.lastName  ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Companion';
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'C';
  const photoSrc    = profile?.photoUrl
    ? (profile.photoUrl.startsWith('http') ? profile.photoUrl : `http://localhost:8081${profile.photoUrl}`)
    : null;
  const [imgErr, setImgErr] = useState(false);
  const hasPhoto = photoSrc && !imgErr;

  const exportCSV = () => {
    const headers = ['ID','User','Obstacle','Location','Detected At','Resolved At','Status'];
    const rows = filtered.map(a => [
      a.id, alertName(a),
      obstacleMeta(a.obstacleType).label,
      addresses[String(a.id)] ?? `${a.latitude},${a.longitude}`,
      new Date(a.createdAt).toLocaleString('en-US'),
      a.resolvedAt ? new Date(a.resolvedAt).toLocaleString('en-US') : '—',
      a.status,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href = url; el.download = 'assistwalk-history.csv'; el.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilterObs(''); setFilterUser(''); setFilterStatus('');
    setDateFrom(''); setDateTo('');
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'row',
      background: '#f8fafc', overflow: 'hidden',
      fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => toggleSidebar()}
        items={[
          { Icon: IconHome,     label: 'Dashboard',  path: '/dashboard' },
          { Icon: IconBell,     label: 'Alerts',     path: '/map', badge: activeCount },
          { Icon: IconClockNav, label: 'History',    path: '/history' },
          { Icon: IconUser,     label: 'My Profile', path: '/profile' },
        ]}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── HEADER ── */}
        <header style={{
          height: 60, background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, zIndex: 20,
          boxShadow: '0 1px 0 #f0f0f0',
        }}>
          {/* Left: toggle + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => toggleSidebar()}
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: '1px solid #e5e7eb', background: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#6b7280', flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
            >
              <IconMenu />
            </button>

            <nav style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, color: '#9ca3af', fontSize: 13, fontWeight: 500,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
              >
                Dashboard
              </button>
              <span style={{ color: '#d1d5db', display: 'flex', alignItems: 'center' }}><IconChevFwd /></span>
              <span style={{ color: '#111827', fontSize: 13, fontWeight: 600 }}>History</span>
            </nav>
          </div>

          {/* Right: profile dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '5px 8px', borderRadius: 10,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
                boxShadow: '0 0 0 2px #fff, 0 0 0 3px #bfdbfe',
                overflow: 'hidden',
              }}>
                {hasPhoto
                  ? <img src={photoSrc} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : initials}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{displayName}</span>
              <span style={{ color: '#9ca3af', display: 'flex' }}><IconChevD /></span>
            </button>

            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
                  minWidth: 214, zIndex: 50, overflow: 'hidden',
                }}>
                  {/* User info */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: '#2563eb',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14, overflow: 'hidden',
                      }}>
                        {hasPhoto
                          ? <img src={photoSrc} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                          : initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{displayName}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile?.email ?? ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Menu items */}
                  <div style={{ padding: '4px' }}>
                    <button onClick={() => { setProfileOpen(false); navigate('/profile'); }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'none', color: '#374151', fontSize: 13, fontWeight: 500, textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ color: '#64748b', display: 'flex' }}><IconUser /></span>
                      My Profile
                    </button>
                    <div style={{ height: 1, background: '#f1f5f9', margin: '2px 8px' }}/>
                    <button onClick={logout} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'none', color: '#ef4444', fontSize: 13, fontWeight: 500,
                      textAlign: 'left', marginBottom: 2,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ color: '#ef4444', display: 'flex' }}><IconLogout /></span>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* Page title */}
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', marginBottom: 28,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 800, color: '#111827',
                  margin: 0, letterSpacing: '-0.6px', lineHeight: 1.15,
                }}>
                  History
                </h1>
                {!loading && (
                  <span style={{
                    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  }}>
                    {filtered.length}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 5px' }}>
                Track all detected obstacles and resolved alerts.
              </p>
              <p style={{
                fontSize: 12, color: '#9ca3af', margin: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <IconClock /> Last update: {formatLastRefresh(lastRefresh)}
              </p>
            </div>

            <button
              onClick={exportCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <IconDownload /> Export History
            </button>
          </div>

          {/* ── KPI Cards ── */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <KpiCard
              title="Total Alerts"
              value={loading ? '—' : allAlerts.length}
              sub="All time records"
              Icon={KpiAlert}
              iconBg="#eff6ff"
              iconColor="#2563eb"
            />
            <KpiCard
              title="Resolved Alerts"
              value={loading ? '—' : resolvedCount}
              sub={loading ? '' : `${resolutionRate}% resolution rate`}
              Icon={KpiCheck}
              iconBg="#f0fdf4"
              iconColor="#16a34a"
            />
            <KpiCard
              title="Monitored Users"
              value={loading ? '—' : monitoredUsers}
              sub="Unique individuals"
              Icon={KpiUsers}
              iconBg="#faf5ff"
              iconColor="#7c3aed"
            />
            <KpiCard
              title="Avg Resolution"
              value={loading ? '—' : avgResTime}
              sub="Across resolved alerts"
              Icon={KpiTimer}
              iconBg="#fff7ed"
              iconColor="#d97706"
            />
          </div>

          {/* ── Filters bar ── */}
          <div style={{
            background: '#fff', borderRadius: 14,
            border: '1px solid #f0f0f0',
            padding: '10px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <span style={{ color: '#9ca3af', display: 'flex', flexShrink: 0 }}><IconFilter /></span>

            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', display: 'flex' }}>
                  <IconCalendar />
                </span>
                <input
                  type="date" value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{
                    padding: '7px 10px 7px 26px',
                    border: '1px solid #e5e7eb', borderRadius: 9,
                    fontSize: 13, color: dateFrom ? '#111827' : '#9ca3af',
                    outline: 'none', cursor: 'pointer', background: '#fff',
                  }}
                />
              </div>
              <span style={{ color: '#d1d5db', fontSize: 11 }}>→</span>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', display: 'flex' }}>
                  <IconCalendar />
                </span>
                <input
                  type="date" value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{
                    padding: '7px 10px 7px 26px',
                    border: '1px solid #e5e7eb', borderRadius: 9,
                    fontSize: 13, color: dateTo ? '#111827' : '#9ca3af',
                    outline: 'none', cursor: 'pointer', background: '#fff',
                  }}
                />
              </div>
            </div>

            <div style={{ width: 1, height: 22, background: '#f0f0f0', flexShrink: 0 }}/>

            <FilterSelect
              value={filterObs} onChange={setFilterObs}
              options={obstacleOptions} placeholder="Obstacle Type" minWidth={155}
            />
            <FilterSelect
              value={filterUser} onChange={setFilterUser}
              options={userOptions} placeholder="All Users" minWidth={130}
            />
            <FilterSelect
              value={filterStatus} onChange={setFilterStatus}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'RESOLVED', label: 'Resolved' }]}
              placeholder="All Status" minWidth={130}
            />

            {/* Sort */}
            <div style={{ position: 'relative', minWidth: 145 }}>
              <select
                value={sortKey} onChange={e => setSortKey(e.target.value)}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  width: '100%', padding: '7px 30px 7px 11px',
                  border: '1px solid #e5e7eb', borderRadius: 9,
                  background: '#fff', color: '#374151',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af', display: 'flex' }}>
                <IconChevD />
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, padding: '7px 12px',
                    cursor: 'pointer', fontSize: 12, color: '#ef4444', fontWeight: 600,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                >
                  <IconX /> Reset
                </button>
              )}
            </div>
          </div>

          {/* ── Table ── */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #f0f0f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden', marginBottom: 16,
          }}>
            {/* Sticky header */}
            <div style={{
              display: 'grid', gridTemplateColumns: COLS,
              background: '#fafafa', borderBottom: '1px solid #f1f5f9',
              padding: '10px 24px',
            }}>
              {['User','Obstacle','Location','Detected At','Resolved At','Status'].map(h => (
                <span key={h} style={{
                  fontSize: 11, fontWeight: 700, color: '#9ca3af',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : pageData.length === 0 ? (
              /* Empty state */
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '72px 32px', gap: 0,
              }}>
                <div style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, boxShadow: '0 4px 20px rgba(37,99,235,0.12)',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" width="42" height="42" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </div>
                <p style={{ fontWeight: 800, fontSize: 17, color: '#111827', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                  No History Available
                </p>
                <p style={{
                  color: '#9ca3af', fontSize: 14, margin: '0 0 24px',
                  maxWidth: 360, lineHeight: 1.65, textAlign: 'center',
                }}>
                  No alerts have been recorded yet. Historical activity will appear here once alerts are detected and processed.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#2563eb', color: '#fff', border: 'none',
                      borderRadius: 9, padding: '10px 20px',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(37,99,235,0.28)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                  >
                    View Dashboard
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#fff', color: '#374151',
                      border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 20px',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <IconRefresh /> Refresh
                  </button>
                </div>
              </div>
            ) : (
              pageData.map((alert, idx) => {
                const addr  = addresses[String(alert.id)];
                const parts = addr ? addr.split(',') : [];
                const line1 = parts[0]?.trim() || (alert.latitude != null ? `${alert.latitude.toFixed(4)}° N` : '—');
                const line2 = parts.length > 1 ? parts.slice(1).join(',').trim() : (alert.longitude != null ? `${alert.longitude.toFixed(4)}° E` : '');
                const det   = formatDateTime(alert.createdAt);
                const res   = formatDateTime(alert.resolvedAt);
                const name  = alertName(alert);

                return (
                  <div
                    key={alert.id}
                    onClick={() => { setViDrawer(alert.userId); setModalAlertData(alert); }}
                    style={{
                      display: 'grid', gridTemplateColumns: COLS,
                      padding: '0 24px',
                      borderBottom: idx < pageData.length - 1 ? '1px solid #f8fafc' : 'none',
                      alignItems: 'center',
                      background: '#fff', cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    {/* User */}
                    <div style={{ padding: '13px 8px 13px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <UserAvatar userId={alert.userId} prenom={alert.userPrenom} nom={alert.userNom} photoUrl={alert.userPhotoUrl} size={32}/>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </p>
                      </div>
                    </div>

                    {/* Obstacle */}
                    <div style={{ padding: '13px 8px 13px 0' }}>
                      <ObstacleBadge type={alert.obstacleType} />
                    </div>

                    {/* Location */}
                    <div style={{ padding: '13px 8px 13px 0', minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: 12, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line1}</p>
                      {line2 && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line2}</p>}
                    </div>

                    {/* Detected At */}
                    <div style={{ padding: '13px 8px 13px 0' }}>
                      <p style={{ fontSize: 12, color: '#374151', fontWeight: 500, margin: 0 }}>{det.date}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{det.time}</p>
                    </div>

                    {/* Resolved At */}
                    <div style={{ padding: '13px 8px 13px 0' }}>
                      {alert.resolvedAt ? (
                        <>
                          <p style={{ fontSize: 12, color: '#374151', fontWeight: 500, margin: 0 }}>{res.date}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{res.time}</p>
                        </>
                      ) : (
                        <p style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic', margin: 0 }}>—</p>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ padding: '13px 0' }}>
                      <StatusBadge status={alert.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Pagination ── */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 20,
            }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} records
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: currentPage === 0 ? 0.38 : 1, color: '#374151',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (currentPage !== 0) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <IconChevL />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum = i;
                  if (totalPages > 7) {
                    if (currentPage < 4) pageNum = i;
                    else if (currentPage > totalPages - 5) pageNum = totalPages - 7 + i;
                    else pageNum = currentPage - 3 + i;
                  }
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        border: isActive ? 'none' : '1px solid #e5e7eb',
                        background: isActive ? '#2563eb' : '#fff',
                        color: isActive ? '#fff' : '#374151',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 13,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff'; }}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                    cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: currentPage >= totalPages - 1 ? 0.38 : 1, color: '#374151',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (currentPage < totalPages - 1) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <IconChevR />
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {viDrawer && (
        <ViUserModal
          userId={viDrawer}
          alertData={modalAlertData}
          onClose={() => { setViDrawer(null); setModalAlertData(null); }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
import { useSidebarState } from '../hooks/useSidebarState';
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
