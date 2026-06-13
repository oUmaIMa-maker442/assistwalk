/**
 * MapPage.jsx — AssistWalk Active Alerts
 * Premium SaaS redesign — Inter, stats cards, professional table
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosInstance';
import { useWebSocket } from '../hooks/useWebSocket';
import { logout } from '../utils/auth';
import Sidebar from '../components/Sidebar';
import { useSidebarState } from '../hooks/useSidebarState';

// ─── Obstacle meta ─────────────────────────────────────────────
const OBSTACLE_META = {
  stairs:           { color:'#ef4444', bg:'#fef2f2', label:'Stairs'           },
  staircase:        { color:'#ef4444', bg:'#fef2f2', label:'Staircase'        },
  doors:            { color:'#f97316', bg:'#fff7ed', label:'Doors'            },
  door:             { color:'#f97316', bg:'#fff7ed', label:'Door'             },
  tree:             { color:'#16a34a', bg:'#f0fdf4', label:'Tree'             },
  metallic_barrier: { color:'#d97706', bg:'#fffbeb', label:'Metallic Barrier' },
  barrier:          { color:'#d97706', bg:'#fffbeb', label:'Barrier'          },
  car:              { color:'#6366f1', bg:'#eef2ff', label:'Car'              },
  vehicle:          { color:'#6366f1', bg:'#eef2ff', label:'Vehicle'          },
};
function obstacleMeta(type) {
  if (!type) return { color:'#ef4444', bg:'#fef2f2', label:'Unknown' };
  const key = type.toLowerCase().replace(/ /g, '_');
  return OBSTACLE_META[key] ?? { color:'#6b7280', bg:'#f3f4f6', label:type };
}

// ─── Helpers ──────────────────────────────────────────────────
function isToday(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getDate()===n.getDate() && dt.getMonth()===n.getMonth() && dt.getFullYear()===n.getFullYear();
}
function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function formatDateTime(dateStr) {
  if (!dateStr) return ['—', ''];
  const d = new Date(dateStr);
  return [
    d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
    d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
  ];
}
function fmtDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}
function lastRefreshLabel(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 30)  return 'Updated just now';
  if (s < 60)  return `Updated ${s}s ago`;
  const m = Math.floor(s / 60);
  return `Updated ${m} minute${m > 1 ? 's' : ''} ago`;
}

// ─── Reverse geocode (Nominatim) ───────────────────────────────
async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language':'en' } }
    );
    const d = await r.json();
    const a = d.address ?? {};
    const street  = a.road ?? a.pedestrian ?? a.path ?? '';
    const city    = a.city ?? a.town ?? a.village ?? a.county ?? '';
    const country = a.country ?? '';
    return [street, city, country].filter(Boolean).join(', ') || 'Unknown location';
  } catch { return null; }
}

// ─── Alert name helper ─────────────────────────────────────────
const API_BASE = 'http://localhost:8081';
function alertName(a) {
  const p = a?.userPrenom ?? ''; const n = a?.userNom ?? '';
  return (p + ' ' + n).trim() || '—';
}
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}

// ─── SVG icon factory ──────────────────────────────────────────
const ic = (d, w=20, h=20) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width:w, height:h, flexShrink:0 }}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcHome    = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcBell    = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>);
const IcMap     = ic(<><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></>);
const IcHistory = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>);
const IcAlert   = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 24, 24);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>, 24, 24);
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, 24, 24);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 24, 24);
const IcUser    = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>, 16, 16);
const IcUserNav = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcHelp    = ic(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 16, 16);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 16, 16);
const IcChevD   = ic(<polyline points="6,9 12,15 18,9"/>, 16, 16);
const IcChevL   = ic(<polyline points="15,18 9,12 15,6"/>, 14, 14);
const IcChevR   = ic(<polyline points="9,18 15,12 9,6"/>, 14, 14);
const IcCheck   = ic(<polyline points="4,10 8,14 16,6"/>, 13, 13);
const IcSearch  = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, 15, 15);
const IcFilter  = ic(<><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></>, 14, 14);
const IcPin     = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, 13, 13);
const IcCal     = ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, 13, 13);
const IcDl      = ic(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>, 15, 15);
const IcArrow   = ic(<><line x1="3" y1="10" x2="17" y2="10"/><polyline points="12,5 17,10 12,15"/></>, 14, 14);
const IcRefresh = ic(<><polyline points="23,4 23,11 16,11"/><polyline points="1,20 1,13 8,13"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 11M1 13l4.64 5.36A9 9 0 0020.49 15"/></>, 14, 14);
const IcInfo    = ic(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>, 16, 16);

// ─── Spinner ──────────────────────────────────────────────────
function Spinner({ size=28 }) {
  return (
    <svg style={{ width:size, height:size, animation:'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4"/>
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
const AV_COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return AV_COLORS[(id ?? 0) % AV_COLORS.length]; }

function Avatar({ userId, prenom, nom, photoUrl, size=36 }) {
  const [imgErr, setImgErr] = useState(false);
  const name = ((prenom ?? '') + ' ' + (nom ?? '')).trim() || '?';
  const ini  = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const src  = resolvePhoto(photoUrl);
  const showPhoto = src && !imgErr;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:avColor(userId),
      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700, fontSize:size > 38 ? 14 : 12, overflow:'hidden',
    }}>
      {showPhoto
        ? <img src={src} alt="" onError={() => setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : ini}
    </div>
  );
}

function ProfileAvatar({ user, size=32 }) {
  return (
    <Avatar userId={user?.id} prenom={user?.prenom} nom={user?.nom} photoUrl={user?.photoUrl} size={size}/>
  );
}

// ─── VI User Profile Modal ─────────────────────────────────────
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

  const photo    = resolvePhoto(profile?.photoUrl ?? alertData?.userPhotoUrl);
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
  const IcPinS = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;

  const infoRow = (icon, label, value, color, iconBg, action=null) => !value ? null : (
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
        position:'fixed', inset:0, zIndex:4999,
        background:'rgba(15,23,42,0.5)',
        backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
        animation:'fadeIn 0.15s ease',
      }}/>
      <div style={{
        position:'fixed', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        zIndex:5000,
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

              {alertData?.latitude != null && (
                <>
                  <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 8px' }}>Last Alert Location</p>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 0' }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb', flexShrink:0, marginTop:1 }}>
                      {IcPinS}
                    </div>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Coordinates</p>
                      <p style={{ fontSize:13, color:'#111827', margin:'0 0 1px', fontWeight:600 }}>{alertData.latitude.toFixed(5)}° N</p>
                      <p style={{ fontSize:12, color:'#6b7280', margin:0 }}>{alertData.longitude?.toFixed(5)}° E</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────
function ObstacleBadge({ type }) {
  const m = obstacleMeta(type);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      fontSize:11, fontWeight:600, color:m.color,
      background:m.bg, padding:'4px 9px', borderRadius:20,
      border:`1px solid ${m.color}22`, whiteSpace:'nowrap',
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:m.color, flexShrink:0 }}/>
      {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    ACTIVE:   { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Active'   },
    RESOLVED: { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', dot:'#22c55e', label:'Resolved' },
    PENDING:  { bg:'#fffbeb', color:'#d97706', border:'#fde68a', dot:'#f59e0b', label:'Pending'  },
  };
  const s = cfg[status] ?? cfg.ACTIVE;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      height:28, padding:'0 10px',
      background:s.bg, color:s.color,
      border:`1px solid ${s.border}`,
      borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap',
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>
      {s.label}
    </span>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position:'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance:'none', WebkitAppearance:'none',
          padding:'7px 30px 7px 11px',
          border:'1px solid #e2e8f0', borderRadius:8,
          background:'#fff', color: value ? '#0f172a' : '#94a3b8',
          fontSize:13, fontWeight:500, cursor:'pointer', outline:'none',
          whiteSpace:'nowrap',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{
        position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
        pointerEvents:'none', color:'#94a3b8', display:'flex',
      }}>
        <IcChevD/>
      </span>
    </div>
  );
}

function StatCard({ Icon, iconColor, bgIcon, label, value, sub, loading }) {
  return (
    <div style={{
      background:'#fff', borderRadius:12, border:'1px solid #e5e7eb',
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)', padding:'13px 16px',
      display:'flex', alignItems:'center', gap:13, flex:1,
    }}>
      <div style={{
        width:36, height:36, borderRadius:9, background:bgIcon,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:iconColor, flexShrink:0,
      }}>
        <Icon/>
      </div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:10, color:'#9ca3af', fontWeight:700, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{label}</p>
        {loading
          ? <div style={{ height:20, width:44, background:'#f3f4f6', borderRadius:5 }}/>
          : <p style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0, lineHeight:1, letterSpacing:'-0.5px' }}>{value}</p>
        }
        {sub && !loading && <p style={{ fontSize:10, color:'#9ca3af', margin:'1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { value:'ACTIVE',   label:'Active'   },
  { value:'RESOLVED', label:'Resolved' },
  { value:'ALL',      label:'All'      },
];

// ─────────────────────────────────────────────────────────────
export default function ActiveAlertsPage() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────
  const [allAlerts,        setAllAlerts]        = useState([]);
  const [addresses,        setAddresses]        = useState({});
  const [profile,          setProfile]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [connected,        setConnected]        = useState(false);
  const [resolving,        setResolving]        = useState(null);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [lastRefresh,      setLastRefresh]      = useState(null);
  const [sessionResolved,  setSessionResolved]  = useState(0);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();
  const [modalUserId,      setModalUserId]      = useState(null);
  const [modalAlertData,   setModalAlertData]   = useState(null);

  // ── Filters ───────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [filterObs,    setFilterObs]    = useState('');
  const [filterUser,   setFilterUser]   = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [sortKey,      setSortKey]      = useState('newest');
  const [page,         setPage]         = useState(0);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: alerts } = await api.get('/api/v1/alerts/history');
        setAllAlerts(alerts);
        setLastRefresh(Date.now());
        alerts.forEach(a => geocodeAlert(a));
      } catch {
        toast.error('Failed to load alerts.');
      } finally {
        setLoading(false);
      }
      try {
        const { data } = await api.get('/api/v1/users/me');
        setProfile(data);
      } catch {}
    })();
  }, []);

  const geocodeAlert = useCallback(async (alert) => {
    if (!alert.latitude || !alert.longitude) return;
    const key = String(alert.id);
    setAddresses(prev => {
      if (prev[key]) return prev;
      reverseGeocode(alert.latitude, alert.longitude).then(addr => {
        if (addr) setAddresses(p => ({ ...p, [key]: addr }));
      });
      return prev;
    });
  }, []);

  // ── WebSocket ─────────────────────────────────────────────
  const handleNewAlert = useCallback((notif) => {
    const newAlert = {
      id:notif.alertId, userId:notif.userId,
      latitude:notif.latitude, longitude:notif.longitude,
      obstacleType:notif.obstacleType, status:'ACTIVE',
      createdAt:notif.createdAt ?? new Date().toISOString(),
    };
    setAllAlerts(prev => prev.find(a => a.id === notif.alertId) ? prev : [newAlert, ...prev]);
    geocodeAlert(newAlert);
    setLastRefresh(Date.now());
    const m = obstacleMeta(notif.obstacleType);
    toast.custom(() => (
      <div style={{
        background:'#dc2626', color:'#fff', padding:'12px 18px', borderRadius:14,
        boxShadow:'0 8px 24px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          <IcAlert/>
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:14, margin:0 }}>New SOS Alert!</p>
          <p style={{ fontSize:12, opacity:0.85, margin:0 }}>{m.label} — SOS alert</p>
        </div>
      </div>
    ), { duration:6000 });
  }, [geocodeAlert]);

  useWebSocket(handleNewAlert, setConnected);

  // ── Resolve ───────────────────────────────────────────────
  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      setAllAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, status:'RESOLVED', resolvedAt:new Date().toISOString() } : a
      ));
      setSessionResolved(c => c + 1);
      toast.success('Alert resolved successfully.');
    } catch (err) {
      if (err.response?.status === 409) toast.error('Already resolved.');
      else toast.error('Failed to resolve alert.');
    } finally { setResolving(null); }
  };

  // ── Export CSV ────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['User','Obstacle','Location','Status','Detected At'],
      ...filtered.map(a => [
        alertName(a),
        obstacleMeta(a.obstacleType).label,
        addresses[String(a.id)] ?? `${a.latitude?.toFixed(4)}, ${a.longitude?.toFixed(4)}`,
        a.status,
        a.createdAt,
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived stats ─────────────────────────────────────────
  const activeAlerts   = allAlerts.filter(a => a.status === 'ACTIVE');
  const resolvedAlerts = allAlerts.filter(a => a.status === 'RESOLVED');
  const resolvedToday  = resolvedAlerts.filter(a => isToday(a.resolvedAt)).length + sessionResolved;
  const uniqueUsers    = new Set(allAlerts.map(a => a.userId)).size;
  const resolvedTimed  = resolvedAlerts.filter(a => a.resolvedAt && a.createdAt);
  const avgResolutionMs = resolvedTimed.length > 0
    ? resolvedTimed.reduce((s,a) => s + (new Date(a.resolvedAt) - new Date(a.createdAt)), 0) / resolvedTimed.length
    : null;

  // ── Filter options ────────────────────────────────────────
  const obstacleOptions = useMemo(() => {
    const types = [...new Set(allAlerts.map(a => a.obstacleType).filter(Boolean))];
    return types.map(t => ({ value:t, label:obstacleMeta(t).label }));
  }, [allAlerts]);

  const userOptions = useMemo(() => {
    const seen = new Map();
    allAlerts.forEach(a => { if (!seen.has(a.userId)) seen.set(a.userId, alertName(a)); });
    return [...seen.entries()].map(([id, name]) => ({
      value: String(id),
      label: name || `User ${id}`,
    }));
  }, [allAlerts]);

  // ── Filtered + sorted + paginated list ────────────────────
  const filtered = useMemo(() => {
    let list = filterStatus === 'ALL'
      ? [...allAlerts]
      : allAlerts.filter(a => a.status === filterStatus);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        alertName(a).toLowerCase().includes(q) ||
        (a.obstacleType ?? '').toLowerCase().includes(q) ||
        (addresses[String(a.id)] ?? '').toLowerCase().includes(q)
      );
    }
    if (filterObs)  list = list.filter(a => a.obstacleType === filterObs);
    if (filterUser) list = list.filter(a => String(a.userId) === filterUser);

    list.sort((a,b) => sortKey === 'newest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [allAlerts, filterStatus, search, filterObs, filterUser, sortKey, addresses]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData    = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [search, filterObs, filterUser, filterStatus, sortKey]);

  // ── Profile ───────────────────────────────────────────────
  const pFirst = profile?.prenom ?? profile?.firstName ?? '';
  const pLast  = profile?.nom    ?? profile?.lastName  ?? '';
  const displayName = (pFirst+' '+pLast).trim() || profile?.email?.split('@')[0] || 'Companion';

  const hasFilters = !!(search || filterObs || filterUser || filterStatus !== 'ACTIVE');

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{
      height:'100vh', display:'flex', flexDirection:'row',
      background:'#f8fafc', overflow:'hidden',
      fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>

      {/* ══ SIDEBAR ════════════════════════════════════════════ */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => toggleSidebar()}
        items={[
          { Icon:IcHome,    label:'Dashboard',  path:'/dashboard' },
          { Icon:IcBell,    label:'Alerts',     path:'/map', badge:activeAlerts.length },
          { Icon:IcHistory, label:'History',    path:'/history' },
          { Icon:IcUserNav, label:'My Profile', path:'/profile' },
        ]}
      />

      {/* ══ CONTENT COLUMN ═════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <header style={{
          height:56, background:'#fff', borderBottom:'1px solid #f1f5f9',
          padding:'0 20px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)', zIndex:20,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={() => toggleSidebar()}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:34, height:34, borderRadius:8,
                background:'none', border:'none', cursor:'pointer',
                color:'#64748b', transition:'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#0f172a'; }}
              onMouseLeave={e => { e.currentTarget.style.background='none';     e.currentTarget.style.color='#64748b'; }}
            >
              <svg viewBox="0 0 24 24" fill="none" style={{ width:18, height:18 }}
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ width:1, height:20, background:'#e2e8f0' }}/>
            <span style={{ fontSize:15, fontWeight:700, color:'#0f172a', letterSpacing:'-0.3px' }}>
              Active Alerts
            </span>
          </div>

          {/* Profile dropdown */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'none', border:'1px solid transparent', cursor:'pointer',
                padding:'5px 8px 5px 5px', borderRadius:10,
                transition:'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#f8fafc';    e.currentTarget.style.borderColor='#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background='none';        e.currentTarget.style.borderColor='transparent'; }}
            >
              <ProfileAvatar user={profile} size={32}/>
              <span style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{displayName}</span>
              <span style={{ color:'#94a3b8', display:'flex' }}><IcChevD/></span>
            </button>

            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)}
                     style={{ position:'fixed', inset:0, zIndex:40 }}/>
                <div style={{
                  position:'absolute', right:0, top:'calc(100% + 8px)',
                  background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
                  boxShadow:'0 8px 30px rgba(0,0,0,0.10)', minWidth:214,
                  zIndex:50, overflow:'hidden',
                }}>
                  <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <ProfileAvatar user={profile} size={40}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:14, color:'#0f172a', margin:0 }}>{displayName}</p>
                        <p style={{ fontSize:12, color:'#94a3b8', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {profile?.email ?? ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:'6px' }}>
                    {[
                      { label:'My Profile',      icon:<IcUser/>, action:() => { setProfileOpen(false); navigate('/profile'); } },
                      { label:'Contact Support', icon:<IcHelp/>, action:() => setProfileOpen(false) },
                    ].map(item => (
                      <button key={item.label} onClick={item.action} style={{
                        width:'100%', display:'flex', alignItems:'center', gap:9,
                        padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer',
                        background:'none', color:'#374151', fontSize:13, fontWeight:500,
                        textAlign:'left', transition:'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                        <span style={{ color:'#64748b', display:'flex' }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                    <div style={{ height:1, background:'#f1f5f9', margin:'4px 2px' }}/>
                    <button onClick={logout} style={{
                      width:'100%', display:'flex', alignItems:'center', gap:9,
                      padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer',
                      background:'none', color:'#ef4444', fontSize:13, fontWeight:500,
                      textAlign:'left', transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                      <span style={{ color:'#ef4444', display:'flex' }}><IcLogout/></span>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── MAIN ───────────────────────────────────────────── */}
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* Page header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.5px' }}>
                  Active Alerts
                </h1>
                {!loading && (
                  <span style={{
                    background: activeAlerts.length > 0 ? '#fef2f2' : '#f0fdf4',
                    color:      activeAlerts.length > 0 ? '#dc2626' : '#16a34a',
                    border:`1px solid ${activeAlerts.length > 0 ? '#fecaca' : '#bbf7d0'}`,
                    fontSize:13, fontWeight:700, padding:'2px 10px', borderRadius:20,
                  }}>
                    {activeAlerts.length}
                  </span>
                )}
              </div>
              <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
                Real-time obstacle alerts from monitored users.
              </p>
            </div>

            {/* Right: refresh label + export */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <button
                onClick={exportCSV}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', borderRadius:10,
                  border:'1px solid #e2e8f0', background:'#fff',
                  color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.05)', transition:'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}
              >
                <IcDl/> Export Alerts
              </button>
            </div>
          </div>

          {/* ── STAT CARDS ───────────────────────────────────── */}
          <div style={{ display:'flex', gap:14, marginBottom:20 }}>
            <StatCard Icon={IcAlert}  iconColor="#ef4444" bgIcon="#fef2f2"
              label="Active Alerts"       value={activeAlerts.length}         loading={loading}/>
            <StatCard Icon={IcShield} iconColor="#16a34a" bgIcon="#f0fdf4"
              label="Resolved Today"      value={resolvedToday}               loading={loading}/>
            <StatCard Icon={IcUsers}  iconColor="#2563eb" bgIcon="#eff6ff"
              label="Users Monitored"     value={uniqueUsers}                  loading={loading}/>
            <StatCard Icon={IcClock}  iconColor="#d97706" bgIcon="#fffbeb"
              label="Avg Resolution"      value={fmtDuration(avgResolutionMs)} loading={loading}/>
          </div>

          {/* ── FILTER BAR ───────────────────────────────────── */}
          <div style={{
            background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
            padding:'10px 14px', marginBottom:16,
            display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* Search */}
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#94a3b8', display:'flex' }}>
                <IcSearch/>
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search alerts..."
                style={{
                  width:'100%', padding:'7px 12px 7px 33px',
                  border:'1px solid #e2e8f0', borderRadius:8,
                  fontSize:13, color:'#0f172a', outline:'none',
                  background:'#f8fafc', boxSizing:'border-box', transition:'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor='#2563eb'}
                onBlur={e  => e.target.style.borderColor='#e2e8f0'}
              />
            </div>

            <Select value={filterObs}    onChange={setFilterObs}    options={obstacleOptions} placeholder="Obstacle Type"/>
            <Select value={filterUser}   onChange={setFilterUser}   options={userOptions}     placeholder="User"/>
            <Select value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS}  placeholder="Status"/>

            {/* Sort */}
            <div style={{ position:'relative' }}>
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value)}
                style={{
                  appearance:'none', WebkitAppearance:'none',
                  padding:'7px 30px 7px 11px',
                  border:'1px solid #e2e8f0', borderRadius:8,
                  background:'#fff', color:'#0f172a',
                  fontSize:13, fontWeight:500, cursor:'pointer', outline:'none',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#94a3b8', display:'flex' }}>
                <IcFilter/>
              </span>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterObs(''); setFilterUser(''); setFilterStatus('ACTIVE'); }}
                style={{
                  background:'none', border:'1px solid #e2e8f0', borderRadius:8,
                  padding:'7px 12px', cursor:'pointer', fontSize:12, color:'#64748b',
                  fontWeight:600, transition:'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background='none'}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── TABLE ────────────────────────────────────────── */}
          <div style={{
            background:'#fff', borderRadius:16, border:'1px solid #e2e8f0',
            boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
            overflow:'hidden', marginBottom:16,
          }}>
            {/* Sticky header row */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'25% 15% 25% 15% 10% 10%',
              background:'#fafafa', borderBottom:'1px solid #f1f5f9',
              padding:'9px 20px',
            }}>
              {['User','Obstacle','Location','Time','Status','Action'].map(h => (
                <span key={h} style={{
                  fontSize:10, fontWeight:700, color:'#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.08em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Body */}
            {loading ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0', flexDirection:'column', gap:14 }}>
                <Spinner size={40}/>
                <p style={{ color:'#94a3b8', fontSize:14, margin:0, fontWeight:500 }}>Loading alerts…</p>
              </div>

            ) : pageData.length === 0 ? (
              /* ── EMPTY STATE ─────────────────────────────── */
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'64px 24px', gap:20 }}>
                {/* Illustration */}
                <div style={{ position:'relative', width:88, height:88 }}>
                  <div style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    background:'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
                    border:'2px solid #bbf7d0',
                  }}/>
                  <div style={{
                    position:'absolute', inset:12, borderRadius:'50%',
                    background:'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width:32, height:32 }}
                         stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9,12 11,14 15,10"/>
                    </svg>
                  </div>
                  <div style={{ position:'absolute', top:4,  right:4, width:12, height:12, borderRadius:'50%', background:'#86efac' }}/>
                  <div style={{ position:'absolute', bottom:6, left:2, width:8,  height:8,  borderRadius:'50%', background:'#4ade80' }}/>
                </div>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontWeight:800, fontSize:18, color:'#0f172a', margin:'0 0 8px', letterSpacing:'-0.3px' }}>
                    {hasFilters ? 'No alerts match your filters' : 'No Active Alerts'}
                  </p>
                  <p style={{ fontSize:14, color:'#64748b', margin:'0 0 22px', lineHeight:1.6 }}>
                    {hasFilters
                      ? 'Try adjusting your search or filter criteria.'
                      : 'All monitored users are currently safe.'}
                  </p>
                  <button
                    onClick={() => navigate('/history')}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      padding:'9px 20px', borderRadius:10,
                      background:'#2563eb', color:'#fff',
                      border:'none', cursor:'pointer',
                      fontSize:13, fontWeight:600,
                      boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background='#2563eb'}
                  >
                    View History <IcArrow/>
                  </button>
                </div>
              </div>

            ) : pageData.map((alert, idx) => {
              const addr = addresses[String(alert.id)];
              const addrParts = addr ? addr.split(',') : null;
              const addrLine1 = addrParts ? addrParts[0].trim() : (alert.latitude != null ? `${alert.latitude.toFixed(4)}° N` : '—');
              const addrLine2 = addrParts && addrParts.length > 1 ? addrParts.slice(1).join(',').trim() : (alert.longitude != null ? `${alert.longitude.toFixed(4)}° E` : '');
              const [dateStr, timeStr] = formatDateTime(alert.createdAt);
              const name = alertName(alert);

              return (
                <div
                  key={alert.id}
                  onClick={() => { setModalUserId(alert.userId); setModalAlertData(alert); }}
                  style={{
                    display:'grid',
                    gridTemplateColumns:'25% 15% 25% 15% 10% 10%',
                    padding:'0 20px',
                    borderBottom: idx < pageData.length - 1 ? '1px solid #f8fafc' : 'none',
                    alignItems:'center',
                    background:'#fff',
                    cursor:'pointer',
                    transition:'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}
                >
                  {/* User */}
                  <div style={{ padding:'13px 8px 13px 0', display:'flex', alignItems:'center', gap:10 }}>
                    <Avatar userId={alert.userId} prenom={alert.userPrenom} nom={alert.userNom} photoUrl={alert.userPhotoUrl} size={32}/>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontWeight:600, fontSize:13, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {name}
                      </p>
                    </div>
                  </div>

                  {/* Obstacle */}
                  <div style={{ padding:'13px 8px 13px 0' }}>
                    <ObstacleBadge type={alert.obstacleType}/>
                  </div>

                  {/* Location */}
                  <div style={{ padding:'13px 8px 13px 0', minWidth:0 }}>
                    <p style={{ fontWeight:500, fontSize:12, color:'#374151', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {addrLine1}
                    </p>
                    {addrLine2 && (
                      <p style={{ fontSize:11, color:'#9ca3af', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {addrLine2}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ padding:'13px 8px 13px 0' }}>
                    <p style={{ fontSize:12, color:'#374151', fontWeight:500, margin:0 }}>{dateStr}</p>
                    <p style={{ fontSize:11, color:'#ef4444', margin:'1px 0 0', fontWeight:500 }}>
                      {timeStr} · {timeAgo(alert.createdAt)}
                    </p>
                  </div>

                  {/* Status */}
                  <div style={{ padding:'13px 8px 13px 0' }}>
                    <StatusBadge status={alert.status}/>
                  </div>

                  {/* Action */}
                  <div style={{ padding:'13px 0' }} onClick={e => e.stopPropagation()}>
                    {alert.status === 'ACTIVE' ? (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        disabled={resolving === alert.id}
                        style={{
                          width:100, height:30, display:'inline-flex', alignItems:'center',
                          justifyContent:'center', gap:5,
                          background:'#fff', color:'#16a34a',
                          border:'1px solid #bbf7d0', borderRadius:8,
                          fontSize:12, fontWeight:600,
                          cursor: resolving === alert.id ? 'not-allowed' : 'pointer',
                          opacity: resolving === alert.id ? 0.6 : 1,
                          transition:'background 0.15s, border-color 0.15s', whiteSpace:'nowrap',
                          fontFamily:'inherit',
                        }}
                        onMouseEnter={e => { if (resolving !== alert.id) { e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.borderColor='#86efac'; } }}
                        onMouseLeave={e => { if (resolving !== alert.id) { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#bbf7d0'; } }}
                      >
                        <IcCheck/>
                        {resolving === alert.id ? '…' : 'Resolve'}
                      </button>
                    ) : (
                      <span style={{ fontSize:11, color:'#9ca3af' }}>Done</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── PAGINATION ───────────────────────────────────── */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
                Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage+1)*PAGE_SIZE, filtered.length)} of {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p-1))}
                  disabled={currentPage === 0}
                  style={{
                    width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0',
                    background:'#fff', cursor: currentPage===0 ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity: currentPage===0 ? 0.4 : 1,
                  }}
                >
                  <IcChevL/>
                </button>
                {Array.from({ length:Math.min(totalPages,5) }, (_,i) => {
                  const pg = totalPages<=5 ? i
                    : currentPage<=2       ? i
                    : currentPage>=totalPages-3 ? totalPages-5+i
                    : currentPage-2+i;
                  return (
                    <button key={pg} onClick={() => setPage(pg)} style={{
                      width:32, height:32, borderRadius:8,
                      border: pg===currentPage ? 'none' : '1px solid #e2e8f0',
                      background: pg===currentPage ? '#2563eb' : '#fff',
                      color: pg===currentPage ? '#fff' : '#374151',
                      cursor:'pointer', fontWeight:700, fontSize:13,
                    }}>
                      {pg+1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                  disabled={currentPage >= totalPages-1}
                  style={{
                    width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0',
                    background:'#fff', cursor: currentPage>=totalPages-1 ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity: currentPage>=totalPages-1 ? 0.4 : 1,
                  }}
                >
                  <IcChevR/>
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {modalUserId != null && (
        <ViUserModal
          userId={modalUserId}
          alertData={modalAlertData}
          onClose={() => { setModalUserId(null); setModalAlertData(null); }}
        />
      )}

      <Toaster position="top-right"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
import { useSidebarState } from '../hooks/useSidebarState';
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
