/**
 * DashboardPage.jsx — AssistWalk Companion Dashboard
 * Modern SaaS redesign — Inter, clean header, professional UI
 */
import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axiosInstance';
import { useWebSocket } from '../hooks/useWebSocket';
import { logout } from '../utils/auth';
import Sidebar from '../components/Sidebar';
import { useSidebarState } from '../hooks/useSidebarState';

// ── Leaflet — inline SVG red marker (no external URL dependency) ──
delete L.Icon.Default.prototype._getIconUrl;
const redIcon = L.divIcon({
  className: '',
  iconSize:    [28, 40],
  iconAnchor:  [14, 40],
  popupAnchor: [0, -42],
  html: `
    <div class="alert-pin-root">
      <div class="alert-pin-pulse"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40" style="display:block;filter:drop-shadow(0 3px 6px rgba(239,68,68,0.45))">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#ef4444"/>
        <circle cx="14" cy="14" r="6" fill="white"/>
        <circle cx="14" cy="14" r="3.5" fill="#ef4444"/>
      </svg>
    </div>
  `,
});

// ── Obstacle meta ─────────────────────────────────────────────
const OB_META = {
  stairs:           { label:'Stairs',       color:'#ef4444', bg:'#fef2f2', dot:'#ef4444' },
  staircase:        { label:'Staircase',     color:'#ef4444', bg:'#fef2f2', dot:'#ef4444' },
  door:             { label:'Door',          color:'#f97316', bg:'#fff7ed', dot:'#f97316' },
  doors:            { label:'Doors',         color:'#f97316', bg:'#fff7ed', dot:'#f97316' },
  tree:             { label:'Tree',          color:'#16a34a', bg:'#f0fdf4', dot:'#16a34a' },
  barrier:          { label:'Barrier',       color:'#d97706', bg:'#fffbeb', dot:'#d97706' },
  metallic_barrier: { label:'Metal Barrier', color:'#d97706', bg:'#fffbeb', dot:'#d97706' },
  car:              { label:'Car',           color:'#6366f1', bg:'#eef2ff', dot:'#6366f1' },
  pothole:          { label:'Pothole',       color:'#dc2626', bg:'#fef2f2', dot:'#dc2626' },
};
function obMeta(t) {
  if (!t) return { label:'Unknown', color:'#6b7280', bg:'#f3f4f6', dot:'#6b7280' };
  return OB_META[t.toLowerCase().replace(/ /g,'_')] ?? { label:t, color:'#6b7280', bg:'#f3f4f6', dot:'#6b7280' };
}

// ── Date helpers ──────────────────────────────────────────────
function isToday(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getDate()===n.getDate() && dt.getMonth()===n.getMonth() && dt.getFullYear()===n.getFullYear();
}
function fmtTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const hm = dt.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  return isToday(d)
    ? `Today, ${hm}`
    : dt.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + `, ${hm}`;
}
function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ── User display ──────────────────────────────────────────────
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return COLORS[(id||0) % COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom   ?? u?.lastName  ?? '';
  return ((p+' '+n).trim() || u?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom   ?? u?.lastName  ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || 'Companion';
}
function alertName(alert) {
  const p = alert?.userPrenom ?? '';
  const n = alert?.userNom    ?? '';
  return (p + ' ' + n).trim() || alert?.userName || '—';
}
function shortUserLabel(name) {
  return name || 'Unknown user';
}

// ── Map auto-fit to active markers ────────────────────────────
function MapAutoFit({ alerts }) {
  const map = useMap();
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const bounds = alerts.map(a => [a.latitude, a.longitude]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
  }, [alerts.length]);
  return null;
}

// ── SVG icon factory ──────────────────────────────────────────
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
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, 24, 24);
const IcAlert   = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 24, 24);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>, 24, 24);
const IcUser    = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>, 16, 16);
const IcHelp    = ic(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 16, 16);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 16, 16);
const IcChevD   = ic(<polyline points="6,9 12,15 18,9"/>, 16, 16);
const IcCheck   = ic(<polyline points="4,10 8,14 16,6"/>, 13, 13);
const IcArrow   = ic(<><line x1="3" y1="10" x2="17" y2="10"/><polyline points="12,5 17,10 12,15"/></>, 15, 15);
const IcActivity= ic(<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>, 16, 16);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 13, 13);
const IcPin     = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, 13, 13);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=28, light=false }) {
  return (
    <svg style={{ width:size, height:size, animation:'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light ? 'rgba(255,255,255,0.3)' : '#bfdbfe'} strokeWidth="4"/>
      <path fill={light ? 'white' : '#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

const API_BASE = 'http://localhost:8081';
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, size=34, photoUrl=null, onClick=null }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolvePhoto(photoUrl);
  const showPhoto = src && !imgErr;
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHov(true)}
      onMouseLeave={() => onClick && setHov(false)}
      style={{
        width:size, height:size, borderRadius:'50%', background:avColor(user?.id),
        flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontWeight:700, fontSize:size > 38 ? 14 : 12, letterSpacing:'-0.5px',
        overflow:'hidden', cursor: onClick ? 'pointer' : 'default',
        transition:'transform 0.15s, box-shadow 0.15s',
        transform: hov ? 'scale(1.08)' : 'scale(1)',
        boxShadow: hov ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none',
      }}>
      {showPhoto
        ? <img src={src} alt="" onError={() => setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : initials(user)}
    </div>
  );
}

// ── VI User Modal ─────────────────────────────────────────────
function ViUserModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/v1/users/${userId}/profile`)
      .then(({ data }) => { if (!cancelled) setProfile(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const photo = resolvePhoto(profile?.photoUrl);
  const fullName = (() => {
    const p = profile?.prenom ?? ''; const n = profile?.nom ?? '';
    return (p + ' ' + n).trim() || profile?.email?.split('@')[0] || '—';
  })();
  const ini = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const IcXs   = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  const IcTel  = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
  const IcMail = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
  const IcDrop = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>;
  const IcEyeS = <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

  const infoRow = (icon, label, value, color = '#6b7280', iconBg = '#f8fafc', action = null) => !value ? null : (
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
        fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
      }}>
        {/* Close */}
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
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'36px 0' }}>
              <svg style={{ width:32, height:32, animation:'spin 0.9s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="3.5"/>
                <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 8px' }}>Contact</p>
              {infoRow(IcMail, 'Email',     profile?.email,            '#0369a1', '#f0f9ff',
                profile?.email ? <a href={`mailto:${profile.email}`} style={{ fontSize:11, fontWeight:600, color:'#2563eb', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, padding:'2px 8px', textDecoration:'none', flexShrink:0 }}>Send</a> : null
              )}
              {infoRow(IcTel,  'Phone',     profile?.telephone,        '#16a34a', '#f0fdf4',
                profile?.telephone ? <a href={`tel:${profile.telephone}`} style={{ fontSize:11, fontWeight:600, color:'#16a34a', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'2px 8px', textDecoration:'none', flexShrink:0 }}>Call</a> : null
              )}

              {(profile?.telephoneUrgence || profile?.groupeSanguin || profile?.niveauDeficience) && (
                <>
                  <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 8px' }}>Medical</p>
                  {infoRow(IcTel,  'Emergency contact', profile?.telephoneUrgence, '#dc2626', '#fef2f2',
                    profile?.telephoneUrgence ? <a href={`tel:${profile.telephoneUrgence}`} style={{ fontSize:11, fontWeight:600, color:'#dc2626', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, padding:'2px 8px', textDecoration:'none', flexShrink:0 }}>Call</a> : null
                  )}
                  {infoRow(IcDrop, 'Blood type',        profile?.groupeSanguin,    '#dc2626', '#fef2f2')}
                  {infoRow(IcEyeS, 'Visual impairment', profile?.niveauDeficience, '#7c3aed', '#f5f3ff')}
                </>
              )}

              {profile?.adresse && (
                <>
                  <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 8px' }}>Address</p>
                  {infoRow(
                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                    'Address', profile.adresse, '#16a34a', '#f0fdf4'
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── KPI Card (compact horizontal) ─────────────────────────────
function KpiCard({ Icon, iconColor, bgIcon, label, value, sub, loading }) {
  return (
    <div style={{
      background:'#fff', borderRadius:12,
      border:'1px solid #e5e7eb',
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
      padding:'13px 16px',
      display:'flex', alignItems:'center', gap:13,
    }}>
      <div style={{
        width:36, height:36, borderRadius:9,
        background:bgIcon, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:iconColor,
      }}>
        <Icon/>
      </div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:10, color:'#9ca3af', fontWeight:700, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{label}</p>
        {loading
          ? <div style={{ height:20, width:44, background:'#f3f4f6', borderRadius:5 }}/>
          : <p style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0, lineHeight:1, letterSpacing:'-0.5px' }}>{value ?? 0}</p>
        }
        {sub && !loading && <p style={{ fontSize:10, color:'#9ca3af', margin:'1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Alert card (right panel) ──────────────────────────────────
function AlertCard({ alert, onResolve, resolving, onAvatarClick }) {
  const [hov, setHov] = useState(false);
  const m = obMeta(alert.obstacleType);
  const name = alertName(alert);
  return (
    <div
      onClick={() => onAvatarClick(alert.userId)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'11px 0', borderBottom:'1px solid #f3f4f6',
        display:'flex', alignItems:'flex-start', gap:10,
        cursor:'pointer', borderRadius:8,
        background: hov ? '#f8fafc' : 'transparent',
        transition:'background 0.1s',
        margin:'0 -4px', padding:'11px 4px',
      }}
    >
      <Avatar
        user={{ id:alert.userId, prenom:alert.userPrenom, nom:alert.userNom }}
        size={32}
        photoUrl={alert.userPhotoUrl}
      />
      <div style={{ flex:1, minWidth:0 }}>
        {/* Name + timeAgo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
          <span style={{ fontWeight:700, fontSize:12, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {name}
          </span>
          <span style={{ fontSize:10, color:'#ef4444', flexShrink:0, marginLeft:4, fontWeight:500 }}>
            {timeAgo(alert.createdAt)}
          </span>
        </div>
        {/* Obstacle */}
        <span style={{
          fontSize:10, fontWeight:600, color:m.color, background:m.bg,
          padding:'2px 7px', borderRadius:20, border:`1px solid ${m.color}22`,
          display:'inline-flex', alignItems:'center', gap:4, marginBottom:3,
        }}>
          <span style={{ width:4, height:4, borderRadius:'50%', background:m.color }}/>
          {m.label}
        </span>
        {/* Location (two lines) */}
        {alert.latitude != null && (
          <div style={{ fontSize:10, color:'#9ca3af', lineHeight:1.4 }}>
            <span>{alert.latitude.toFixed(4)}° N</span>
            <span style={{ display:'block' }}>{alert.longitude?.toFixed(4)}° E</span>
          </div>
        )}
      </div>
      {/* Resolve button — compact, stops row click */}
      <div onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onResolve(alert.id)}
          disabled={resolving === alert.id}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:4,
            width:76, height:28,
            background:'#fff', color:'#16a34a', border:'1px solid #bbf7d0',
            borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer',
            opacity:resolving === alert.id ? 0.6 : 1, flexShrink:0,
            transition:'background 0.15s, border-color 0.15s',
            fontFamily:'inherit',
          }}
          onMouseEnter={e => { if (resolving !== alert.id) { e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.borderColor='#86efac'; } }}
          onMouseLeave={e => { if (resolving !== alert.id) { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#bbf7d0'; } }}
        >
          <IcCheck/>{resolving === alert.id ? '…' : 'Resolve'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  const [sidebarCollapsed, toggleSidebar] = useSidebarState();
  const [connected,        setConnected]        = useState(false);
  const [allAlerts,        setAllAlerts]        = useState([]);
  const [profile,          setProfile]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [resolving,        setResolving]        = useState(null);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [sessionResolved,  setSessionResolved]  = useState(0);
  const [viDrawer,         setViDrawer]         = useState(null); // userId

  useEffect(() => {
    (async () => {
      try {
        const { data: alerts } = await api.get('/api/v1/alerts/active');
        setAllAlerts(alerts);
        try { const { data: me } = await api.get('/api/v1/users/me'); setProfile(me); } catch {}
      } catch { toast.error('Failed to load dashboard.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const activeAlerts  = allAlerts.filter(a => a.status === 'ACTIVE');
  const uniqueUsers   = new Set(allAlerts.map(a => a.userId)).size;
  const resolvedToday = allAlerts.filter(a => a.status === 'RESOLVED' && isToday(a.resolvedAt)).length + sessionResolved;
  const activityFeed  = [...allAlerts].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  // WebSocket — real-time alerts
  const handleNewAlert = useCallback((notif) => {
    setAllAlerts(prev => prev.find(a => a.id === notif.alertId) ? prev : [{
      id:notif.alertId, userId:notif.userId, userName:notif.userName ?? null,
      latitude:notif.latitude, longitude:notif.longitude,
      obstacleType:notif.obstacleType, status:'ACTIVE',
      createdAt:notif.createdAt ?? new Date().toISOString(), resolvedAt:null,
    }, ...prev]);
    const m = obMeta(notif.obstacleType);
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
          <p style={{ fontWeight:700, fontSize:14, margin:0 }}>New SOS Alert</p>
          <p style={{ fontSize:12, opacity:0.85, margin:0 }}>
            {m.label} — {shortUserLabel(notif.userName)}
          </p>
        </div>
      </div>
    ), { duration:6000 });
  }, []);
  useWebSocket(handleNewAlert, setConnected);

  // Resolve alert
  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      const { data: updated } = await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      setAllAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, ...updated, status:'RESOLVED', resolvedAt:new Date().toISOString() } : a
      ));
      setSessionResolved(c => c + 1);
      toast.success('Alert resolved.');
    } catch (err) {
      if      (err.response?.status === 409) toast.error('Already resolved.');
      else if (err.response?.status === 403) toast.error('Alert out of your scope.');
      else                                   toast.error('Failed to resolve alert.');
    } finally { setResolving(null); }
  };

  const dn = displayName(profile);
  const hasAlerts = activeAlerts.length > 0;

  // (no resize side-effect needed — modal doesn't affect layout)

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
          { Icon:IcHome,    label:'Dashboard', path:'/dashboard' },
          { Icon:IcBell,    label:'Alerts',    path:'/map', badge:activeAlerts.length },
          { Icon:IcHistory, label:'History',   path:'/history' },
          { Icon:IcUser,    label:'My Profile',path:'/profile' },
        ]}
      />

      {/* ══ CONTENT COLUMN — always full width ════════════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <header style={{
          height:56, background:'#fff',
          borderBottom:'1px solid #f1f5f9',
          padding:'0 20px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', zIndex:20,
        }}>

          {/* Left: hamburger + divider + page title */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={() => toggleSidebar()}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:34, height:34, borderRadius:8,
                background:'none', border:'none', cursor:'pointer',
                color:'#64748b', flexShrink:0, transition:'background 0.15s, color 0.15s',
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
              Dashboard
            </span>
          </div>

          {/* Right: profile dropdown */}
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
              <Avatar user={profile} size={32} photoUrl={profile?.photoUrl}/>
              <span style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{dn}</span>
              <span style={{ color:'#94a3b8' }}><IcChevD/></span>
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
                  {/* User info */}
                  <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar user={profile} size={40} photoUrl={profile?.photoUrl}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:14, color:'#0f172a', margin:0, lineHeight:1.3 }}>{dn}</p>
                        <p style={{
                          fontSize:12, color:'#94a3b8', margin:'2px 0 0',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        }}>
                          {profile?.email ?? ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <div style={{ padding:'4px' }}>
                    <button onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'none', color:'#374151', fontSize:13, fontWeight:500, textAlign:'left' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                      <span style={{ color:'#64748b', display:'flex' }}><IcUser/></span>
                      My Profile
                    </button>
                    <div style={{ height:1, background:'#f1f5f9', margin:'2px 8px' }}/>
                    <button onClick={logout}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'none', color:'#ef4444', fontSize:13, fontWeight:500, textAlign:'left', marginBottom:2 }}
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
        <main style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>

          {/* KPI row */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3,1fr)',
            gap:12, padding:'14px 18px 0', flexShrink:0,
          }}>
            <KpiCard Icon={IcUsers}  iconColor="#2563eb" bgIcon="#eff6ff"
              label="Users Followed" value={uniqueUsers}          loading={loading}/>
            <KpiCard Icon={IcAlert}  iconColor="#ef4444" bgIcon="#fef2f2"
              label="Active Alerts"  value={activeAlerts.length}  loading={loading}
              sub="Requiring attention"/>
            <KpiCard Icon={IcShield} iconColor="#16a34a" bgIcon="#f0fdf4"
              label="Resolved Today" value={resolvedToday}        loading={loading}/>
          </div>

          {/* Body: Map column + Alerts panel */}
          <div style={{ flex:1, display:'flex', minHeight:0, padding:'14px 18px 16px', gap:14 }}>

            {/* LEFT column: Map + Recent Activity */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, gap:14 }}>

              {/* ── MAP CARD ─────────────────────────────────── */}
              <div style={{
                flex:'0 0 60%', borderRadius:16, overflow:'hidden',
                border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                display:'flex', flexDirection:'column', minHeight:0, background:'#fff',
              }}>
                {/* Title bar */}
                <div style={{
                  height:48, padding:'0 16px', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  borderBottom:'1px solid #f1f5f9', background:'#fff',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8,
                      background: hasAlerts ? '#fef2f2' : '#f0fdf4',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: hasAlerts ? '#ef4444' : '#16a34a',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{ width:14, height:14 }}
                           stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <span style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>Live Map</span>
                  </div>

                  {/* Status pill */}
                  <div style={{
                    display:'flex', alignItems:'center', gap:6,
                    background: hasAlerts ? '#fef2f2' : '#f0fdf4',
                    border:`1px solid ${hasAlerts ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius:20, padding:'4px 11px',
                  }}>
                    <div style={{
                      width:6, height:6, borderRadius:'50%',
                      background: hasAlerts ? '#ef4444' : '#22c55e',
                    }}/>
                    <span style={{
                      fontSize:11, fontWeight:600,
                      color: hasAlerts ? '#dc2626' : '#16a34a',
                    }}>
                      {hasAlerts ? `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}` : 'All clear'}
                    </span>
                  </div>
                </div>

                {/* Map body */}
                <div style={{ flex:1, minHeight:0, position:'relative' }}>
                  {loading ? (
                    <div style={{
                      position:'absolute', inset:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexDirection:'column', gap:12, background:'#f8fafc',
                    }}>
                      <Spinner size={40}/>
                      <p style={{ color:'#94a3b8', fontSize:13, margin:0, fontWeight:500 }}>Loading map…</p>
                    </div>
                  ) : (
                    <MapContainer
                      center={[33.9716,-6.8498]} zoom={6}
                      style={{ height:'100%', width:'100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
                      />
                      {activeAlerts.length > 0 && <MapAutoFit alerts={activeAlerts}/>}
                      {activeAlerts.map(alert => (
                        <Marker key={alert.id} position={[alert.latitude, alert.longitude]} icon={redIcon}>
                          <Popup minWidth={240}>
                            <div style={{ padding:'4px 0' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                                <Avatar
                                  user={{ id:alert.userId, prenom:alert.userPrenom, nom:alert.userNom }}
                                  size={36}
                                  photoUrl={alert.userPhotoUrl}
                                  onClick={() => setViDrawer(alert.userId)}
                                />
                                <div>
                                  <p style={{ fontWeight:700, fontSize:13, color:'#0f172a', margin:0 }}>
                                    {alertName(alert)}
                                  </p>
                                  <span style={{ fontSize:11, color:'#64748b', display:'inline-flex', alignItems:'center', gap:4 }}>
                                    <span style={{ width:8,height:8,borderRadius:'50%',background:obMeta(alert.obstacleType).dot,display:'inline-block'}}/>
                                    {obMeta(alert.obstacleType).label}
                                  </span>
                                </div>
                              </div>
                              <div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                                  <IcClock/><span>{fmtTime(alert.createdAt)}</span>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                  <IcPin/>
                                  <span>{alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => resolveAlert(alert.id)}
                                disabled={resolving === alert.id}
                                style={{
                                  width:'100%', background:'#16a34a', color:'#fff',
                                  border:'none', borderRadius:8, padding:'9px',
                                  fontWeight:700, fontSize:13, cursor:'pointer',
                                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                                  opacity:resolving === alert.id ? 0.6 : 1,
                                }}
                              >
                                <IcCheck/>
                                {resolving === alert.id ? 'Resolving…' : 'Mark as Resolved'}
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  )}
                </div>
              </div>

              {/* ── RECENT ACTIVITY ───────────────────────────── */}
              <div style={{
                flex:1, background:'#fff', borderRadius:16,
                border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
                overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0,
              }}>
                {/* Header */}
                <div style={{
                  padding:'12px 18px', borderBottom:'1px solid #f1f5f9',
                  display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8, background:'#eff6ff',
                      display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb',
                    }}>
                      <IcActivity/>
                    </div>
                    <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>Recent Activity</span>
                  </div>
                  <button
                    onClick={() => navigate('/history')}
                    style={{
                      display:'flex', alignItems:'center', gap:5,
                      background:'none', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer',
                      color:'#374151', fontSize:12, fontWeight:600, padding:'5px 11px',
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}
                  >
                    View all <IcArrow/>
                  </button>
                </div>

                {/* Table or empty state */}
                {!loading && activityFeed.length === 0 ? (
                  <div style={{
                    flex:1, display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:12, padding:32,
                  }}>
                    <div style={{
                      width:52, height:52, borderRadius:16, background:'#f8fafc',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{ width:26, height:26, color:'#cbd5e1' }}
                           stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22,12 16,12 14,15 10,15 8,12 2,12"/>
                        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
                      </svg>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontWeight:600, fontSize:14, color:'#64748b', margin:'0 0 4px' }}>No recent activity</p>
                      <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>Alert events from followed users will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowY:'auto', flex:1 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ position:'sticky', top:0, zIndex:1 }}>
                          {['User','Obstacle','Status','Time'].map(h => (
                            <th key={h} style={{
                              padding:'9px 16px', textAlign:'left',
                              fontSize:10, fontWeight:700, color:'#94a3b8',
                              textTransform:'uppercase', letterSpacing:'0.08em',
                              background:'#fafafa', borderBottom:'1px solid #f1f5f9',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? [1,2,3].map(i => (
                          <tr key={i}>
                            {[50,35,30,30].map((w,j) => (
                              <td key={j} style={{ padding:'12px 16px' }}>
                                <div style={{ height:11, background:'#f1f5f9', borderRadius:4, width:`${w}%` }}/>
                              </td>
                            ))}
                          </tr>
                        )) : activityFeed.map((a, i) => {
                          const resolved = a.status === 'RESOLVED';
                          const m = obMeta(a.obstacleType);
                          return (
                            <tr
                              key={a.id ?? i}
                              onClick={() => setViDrawer(a.userId)}
                              style={{ borderTop:'1px solid #f8fafc', transition:'background 0.1s', cursor:'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}
                            >
                              <td style={{ padding:'11px 16px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                                  <Avatar
                                    user={{ id:a.userId, prenom:a.userPrenom, nom:a.userNom }}
                                    size={28}
                                    photoUrl={a.userPhotoUrl}
                                  />
                                  <div style={{ minWidth:0 }}>
                                    <p style={{ fontWeight:600, color:'#0f172a', fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                      {alertName(a)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding:'11px 16px' }}>
                                <span style={{
                                  display:'inline-flex', alignItems:'center', gap:4,
                                  fontSize:11, fontWeight:600, color:m.color,
                                  background:m.bg, padding:'3px 9px', borderRadius:20,
                                  border:`1px solid ${m.color}22`,
                                }}>
                                  <span style={{ width:4, height:4, borderRadius:'50%', background:m.color }}/>
                                  {m.label}
                                </span>
                              </td>
                              <td style={{ padding:'11px 16px' }}>
                                <span style={{
                                  display:'inline-flex', alignItems:'center', gap:5,
                                  height:26, padding:'0 9px', borderRadius:20,
                                  fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                                  color:      resolved ? '#16a34a' : '#d97706',
                                  background: resolved ? '#f0fdf4' : '#fffbeb',
                                  border:     `1px solid ${resolved ? '#bbf7d0' : '#fde68a'}`,
                                }}>
                                  <span style={{ width:5, height:5, borderRadius:'50%', background: resolved ? '#22c55e' : '#f59e0b' }}/>
                                  {resolved ? 'Resolved' : 'Active'}
                                </span>
                              </td>
                              <td style={{ padding:'11px 16px', color:'#94a3b8', fontSize:12, whiteSpace:'nowrap' }}>
                                {fmtTime(resolved ? (a.resolvedAt ?? a.createdAt) : a.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Active Alerts panel ─────────────────── */}
            <div style={{
              width:272, background:'#fff', borderRadius:16,
              border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
              display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden',
            }}>
              {/* Panel header */}
              <div style={{
                padding:'13px 16px', borderBottom:'1px solid #f1f5f9',
                display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{
                    width:28, height:28, borderRadius:8,
                    background: hasAlerts ? '#fef2f2' : '#f0fdf4',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: hasAlerts ? '#ef4444' : '#16a34a',
                  }}>
                    <IcBell/>
                  </div>
                  <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>Active Alerts</span>
                  {hasAlerts && (
                    <span style={{
                      background:'#ef4444', color:'#fff', fontSize:10, fontWeight:800,
                      minWidth:18, height:18, borderRadius:9,
                      display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
                    }}>
                      {activeAlerts.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate('/map')}
                  style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:'#2563eb', fontSize:12, fontWeight:600,
                    display:'flex', alignItems:'center', gap:3,
                  }}
                >
                  Map <IcArrow/>
                </button>
              </div>

              {/* Alerts list */}
              <div style={{ flex:1, overflowY:'auto', padding:'0 14px' }}>
                {loading ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
                    <Spinner/>
                  </div>
                ) : !hasAlerts ? (
                  /* Empty state */
                  <div style={{
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', height:'100%', padding:'32px 16px',
                    gap:16, textAlign:'center',
                  }}>
                    <div style={{
                      width:64, height:64, borderRadius:20,
                      background:'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
                      border:'2px solid #bbf7d0',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{ width:30, height:30, color:'#22c55e' }}
                           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <polyline points="9,12 11,14 15,10"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight:700, fontSize:14, color:'#0f172a', margin:'0 0 6px' }}>No active alerts</p>
                      <p style={{ fontSize:12, color:'#94a3b8', margin:0, lineHeight:1.6 }}>
                        All followed users are safe.<br/>
                        Alerts appear here in real time.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeAlerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} resolving={resolving} onAvatarClick={id => setViDrawer(id)}/>
                  ))
                )}
              </div>

              {/* Footer CTA — only shown when there are alerts */}
              {hasAlerts && (
                <div style={{ padding:'10px 14px', borderTop:'1px solid #f1f5f9', flexShrink:0 }}>
                  <button
                    onClick={() => navigate('/map')}
                    style={{
                      width:'100%', background:'#2563eb', border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      color:'#fff', fontSize:13, fontWeight:600, padding:'9px 0',
                      borderRadius:10, boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background='#2563eb'}
                  >
                    View Live Map <IcArrow/>
                  </button>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* ══ VI USER MODAL — centered overlay, no layout impact ═ */}
      {viDrawer && <ViUserModal userId={viDrawer} onClose={() => setViDrawer(null)}/>}

      <Toaster position="top-right"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
import { useSidebarState } from '../hooks/useSidebarState';
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%,-48%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        /* Red alert pin marker */
        .alert-pin-root  { position: relative; width: 28px; height: 40px; }
        .alert-pin-pulse {
          position: absolute; top: 2px; left: 2px;
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(239, 68, 68, 0.35);
          animation: alertPulse 2s ease-out infinite;
        }
        @keyframes alertPulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0;   }
        }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 5px }
        ::-webkit-scrollbar-track { background: #f1f5f9 }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8 }
      `}</style>
    </div>
  );
}
