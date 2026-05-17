/**
 * AdminDashboardPage.jsx — AssistWalk Admin Dashboard
 *
 * APIs :
 *   GET  /api/v1/admin/users
 *   GET  /api/v1/alerts/active
 *   GET  /api/v1/users/me
 *   PATCH /api/v1/alerts/{id}/resolve
 */

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axiosInstance';
import { useWebSocket } from '../../hooks/useWebSocket';
import { logout } from '../../utils/auth';

// ── Leaflet icon fix ──────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const redIcon = new L.Icon({
  iconUrl:     'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:   'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41],
});

// ── Helpers ───────────────────────────────────────────────────
const OBSTACLE_META = {
  stairs:           { emoji:'🪜', color:'#ef4444', bg:'#fef2f2' },
  staircase:        { emoji:'🪜', color:'#ef4444', bg:'#fef2f2' },
  doors:            { emoji:'🚪', color:'#f97316', bg:'#fff7ed' },
  door:             { emoji:'🚪', color:'#f97316', bg:'#fff7ed' },
  tree:             { emoji:'🌳', color:'#16a34a', bg:'#f0fdf4' },
  metallic_barrier: { emoji:'🚧', color:'#d97706', bg:'#fffbeb' },
  barrier:          { emoji:'🚧', color:'#d97706', bg:'#fffbeb' },
  car:              { emoji:'🚗', color:'#6366f1', bg:'#eef2ff' },
};
function obMeta(t) {
  if (!t) return { emoji:'🚨', color:'#6b7280', bg:'#f3f4f6' };
  return OBSTACLE_META[t.toLowerCase().replace(/ /g,'_')]
      ?? { emoji:'🚨', color:'#6b7280', bg:'#f3f4f6' };
}
function isToday(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getDate()===n.getDate() && dt.getMonth()===n.getMonth()
      && dt.getFullYear()===n.getFullYear();
}
function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s<60)    return `${s}s ago`;
  if (s<3600)  return `${Math.floor(s/60)} min ago`;
  if (s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function fmtTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const hm = dt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  return isToday(d) ? `Today, ${hm}`
    : dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})+`, ${hm}`;
}

// ── SVG Icons — all as normal React components ────────────────
function SvgHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}
function SvgUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function SvgUsersLg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function SvgBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function SvgClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  );
}
function SvgBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function SvgGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
function SvgArrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" style={{width:15,height:15}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="10" x2="17" y2="10"/>
      <polyline points="12,5 17,10 12,15"/>
    </svg>
  );
}
function SvgCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" style={{width:13,height:13}}
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,10 8,14 16,6"/>
    </svg>
  );
}
function SvgLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function SvgHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:17,height:17}}
         stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function SvgChevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}}
         stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,6 8,10 12,6"/>
    </svg>
  );
}
function SvgRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,4 23,11 16,11"/>
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 11"/>
    </svg>
  );
}
function SvgShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9,12 11,14 15,10"/>
    </svg>
  );
}
function SvgAlertT() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function SvgMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function SvgActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=24 }) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}}
         viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4"/>
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Sidebar NavItem ───────────────────────────────────────────
function NavItem({ Icon, icon, label, active, badge, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:'100%', display:'flex', alignItems:'center', gap:10,
        padding:'10px 13px', borderRadius:10, border:'none', cursor:'pointer',
        background: active ? '#2563eb' : hov ? '#f3f4f6' : 'transparent',
        color: active ? '#fff' : hov ? '#111827' : '#6b7280',
        fontWeight:600, fontSize:14, textAlign:'left', transition:'all 0.15s',
        boxShadow: active ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
      }}
    >
      {Icon ? <Icon /> : <span style={{fontSize:16}}>{icon}</span>}
      <span style={{flex:1}}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? '#fff' : '#ef4444',
          color: active ? '#2563eb' : '#fff',
          fontSize:11, fontWeight:800, width:20, height:20, borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ Icon, label, value, sub, trend, bgIcon, iconColor, loading }) {
  const up = trend >= 0;
  return (
    <div style={{
      background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
      boxShadow:'0 1px 4px rgba(0,0,0,0.05)', padding:'20px 22px',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
        <div style={{
          width:52, height:52, borderRadius:14, background:bgIcon,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:iconColor, flexShrink:0,
        }}>
          <Icon />
        </div>
        <div style={{flex:1}}>
          <p style={{fontSize:12, color:'#6b7280', fontWeight:500, margin:'0 0 4px'}}>{label}</p>
          {loading
            ? <div style={{height:28, width:40, background:'#f3f4f6', borderRadius:6}}/>
            : <p style={{fontSize:28, fontWeight:800, color:'#111827', margin:0, lineHeight:1}}>
                {value ?? 0}
              </p>
          }
        </div>
      </div>
      {!loading && sub && (
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          paddingTop:12, borderTop:'1px solid #f3f4f6',
        }}>
          <span style={{
            fontSize:11, fontWeight:700,
            color: up ? '#16a34a' : '#dc2626',
            background: up ? '#f0fdf4' : '#fef2f2',
            padding:'2px 7px', borderRadius:20,
          }}>
            {up ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span style={{fontSize:11, color:'#9ca3af'}}>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Alert Row (right panel) ───────────────────────────────────
function AlertRow({ alert, onResolve, resolving }) {
  const m = obMeta(alert.obstacleType);
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:10,
      padding:'13px 0', borderBottom:'1px solid #f3f4f6',
    }}>
      <div style={{
        width:40, height:40, borderRadius:11, flexShrink:0,
        background:m.bg, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:18,
        border:`1px solid ${m.color}22`,
      }}>
        {m.emoji}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontWeight:700, fontSize:13, color:'#111827'}}>
            {alert.userName ?? `User #${alert.userId}`}
          </span>
          <span style={{fontSize:11, color:'#ef4444', fontWeight:600, flexShrink:0, marginLeft:4}}>
            {timeAgo(alert.createdAt)}
          </span>
        </div>
        <p style={{fontSize:12, color:'#6b7280', margin:'2px 0 0'}}>
          {alert.obstacleType ?? 'Unknown'} • {fmtTime(alert.createdAt)}
        </p>
      </div>
      <button
        onClick={() => onResolve(alert.id)}
        disabled={resolving === alert.id}
        style={{
          flexShrink:0, display:'flex', alignItems:'center', gap:4,
          background:'#16a34a', color:'#fff', border:'none', borderRadius:8,
          padding:'6px 10px', fontSize:12, fontWeight:700, cursor:'pointer',
          opacity: resolving === alert.id ? 0.6 : 1, transition:'opacity 0.15s',
          boxShadow:'0 2px 6px rgba(22,163,74,0.2)',
        }}
      >
        <SvgCheck /> {resolving === alert.id ? '…' : 'Resolve'}
      </button>
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────
function DonutChart({ active, inactive, offline, total }) {
  const r = 52, cx = 68, cy = 68, stroke = 18;
  const circ = 2 * Math.PI * r;
  const pA = total > 0 ? active / total : 0;
  const pI = total > 0 ? inactive / total : 0;
  const pO = Math.max(0, 1 - pA - pI);
  const segments = [
    { pct: pA, color: '#2563eb' },
    { pct: pI, color: '#93c5fd' },
    { pct: pO, color: '#e5e7eb' },
  ];
  let offset = 0;
  return (
    <div style={{display:'flex', alignItems:'center', gap:20}}>
      <svg width={136} height={136} style={{flexShrink:0}}>
        {segments.map((s, i) => {
          const dash = s.pct * circ;
          const gap  = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += s.pct;
          return el;
        })}
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={20}
              fontWeight={800} fill="#111827">{total}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize={10}
              fill="#9ca3af">Total Users</text>
      </svg>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        {[
          { label:'Active',   value:active,   color:'#2563eb', pct: total ? Math.round(pA*100) : 0 },
          { label:'Inactive', value:inactive, color:'#93c5fd', pct: total ? Math.round(pI*100) : 0 },
          { label:'Offline',  value:offline,  color:'#e5e7eb', pct: total ? Math.round(pO*100) : 0 },
        ].map(s => (
          <div key={s.label} style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0}}/>
            <span style={{fontSize:12, color:'#374151', minWidth:60}}>{s.label}</span>
            <span style={{fontSize:12, fontWeight:700, color:'#111827', minWidth:20}}>{s.value}</span>
            <span style={{fontSize:11, color:'#9ca3af'}}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [connected,       setConnected]       = useState(false);
  const [allAlerts,       setAllAlerts]       = useState([]);
  const [users,           setUsers]           = useState([]);
  const [profile,         setProfile]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [resolving,       setResolving]       = useState(null);
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [sessionResolved, setSessionResolved] = useState(0);
  const [lastUpdated,     setLastUpdated]     = useState(null);

  // ── Load data ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [alertsRes, usersRes] = await Promise.all([
        api.get('/api/v1/alerts/active'),
        api.get('/api/v1/admin/users'),
      ]);
      setAllAlerts(alertsRes.data);
      setUsers(usersRes.data);
      setLastUpdated(new Date());
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
    try {
      const { data } = await api.get('/api/v1/users/me');
      setProfile(data);
    } catch { /* optional */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed ──────────────────────────────────────────────
  const activeAlerts  = allAlerts.filter(a => a.status === 'ACTIVE');
  const companions    = users.filter(u => u.role === 'COMPANION');
  const resolvedToday = allAlerts.filter(
    a => a.status === 'RESOLVED' && isToday(a.resolvedAt)
  ).length + sessionResolved;
  const activityFeed  = [...allAlerts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const activeUsers   = users.filter(
    u => u.role === 'VISUAL_IMPAIRED' || u.role === 'COMPANION'
  ).length;
  const inactiveUsers = Math.max(0, Math.floor(users.length * 0.36));
  const offlineUsers  = Math.max(0, users.length - activeUsers - inactiveUsers);

  // ── WebSocket ─────────────────────────────────────────────
  const handleNewAlert = useCallback((notif) => {
    setAllAlerts(prev =>
      prev.find(a => a.id === notif.alertId) ? prev : [{
        id: notif.alertId, userId: notif.userId,
        latitude: notif.latitude, longitude: notif.longitude,
        obstacleType: notif.obstacleType, status: 'ACTIVE',
        createdAt: notif.createdAt ?? new Date().toISOString(),
      }, ...prev]
    );
    toast.custom(() => (
      <div style={{
        background:'#dc2626', color:'#fff', padding:'12px 18px',
        borderRadius:14, boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <span style={{fontSize:22}}>🚨</span>
        <div>
          <p style={{fontWeight:700, fontSize:14, margin:0}}>New SOS Alert!</p>
          <p style={{fontSize:12, opacity:0.85, margin:0}}>
            {notif.obstacleType ?? 'Unknown'} — User #{notif.userId}
          </p>
        </div>
      </div>
    ), { duration: 6000 });
  }, []);

  useWebSocket(handleNewAlert, setConnected);

  // ── Resolve ───────────────────────────────────────────────
  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      const { data: updated } = await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      setAllAlerts(prev => prev.map(a =>
        a.id === alertId
          ? { ...a, ...updated, status:'RESOLVED', resolvedAt: new Date().toISOString() }
          : a
      ));
      setSessionResolved(c => c + 1);
      toast.success('Alert resolved.');
    } catch (err) {
      if (err.response?.status === 409) toast.error('Already resolved.');
      else toast.error('Failed to resolve alert.');
    } finally {
      setResolving(null);
    }
  };

  // ── Profile ───────────────────────────────────────────────
  const firstName   = profile?.prenom ?? profile?.firstName ?? '';
  const lastName    = profile?.nom    ?? profile?.lastName  ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Administrator';
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'A';

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{
      height:'100vh', display:'flex', flexDirection:'column',
      background:'#f8fafc', overflow:'hidden',
      fontFamily:"'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <header style={{
        height:62, background:'#fff', borderBottom:'1px solid #e5e7eb',
        padding:'0 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexShrink:0,
        boxShadow:'0 1px 3px rgba(0,0,0,0.05)', zIndex:20,
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{
            width:38, height:38, borderRadius:10, background:'#2563eb',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{width:22, height:22}}>
              <circle cx="12" cy="4.5" r="2.2"/>
              <path d="M8.5 11.5l-1.5 4h2l1-2.5 1.5 1.5V20h2v-5.5l-2-2 .8-2.5 1.7 1.5H17V9.5h-2.5L13 8l-1 1-1-1-2 3.5z"/>
            </svg>
          </div>
          <span style={{fontWeight:800, fontSize:18, color:'#111827', letterSpacing:'-0.4px'}}>
            Assist<span style={{color:'#2563eb'}}>Walk</span>
          </span>
          <span style={{color:'#e5e7eb', margin:'0 10px'}}>|</span>
          <span style={{color:'#9ca3af', fontSize:14, fontWeight:500}}>Admin Dashboard</span>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:10}}>
          {/* Live pill */}
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            background:'#f9fafb', border:'1px solid #e5e7eb',
            borderRadius:20, padding:'5px 12px',
          }}>
            <div style={{
              width:7, height:7, borderRadius:'50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
            }}/>
            <span style={{fontSize:12, color:'#6b7280', fontWeight:500}}>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Profile dropdown */}
          <div style={{position:'relative'}}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'none', border:'none', cursor:'pointer',
                padding:'5px 8px', borderRadius:10,
              }}
            >
              <div style={{
                width:36, height:36, borderRadius:'50%', background:'#2563eb',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:700, fontSize:13,
              }}>{initials}</div>
              <div style={{textAlign:'left'}}>
                <p style={{fontSize:13, fontWeight:700, color:'#111827', margin:0, lineHeight:1.2}}>
                  {displayName}
                </p>
                <p style={{fontSize:11, color:'#9ca3af', margin:0}}>Administrator</p>
              </div>
              <SvgChevron />
            </button>

            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)}
                     style={{position:'fixed', inset:0, zIndex:40}}/>
                <div style={{
                  position:'absolute', right:0, top:'calc(100% + 8px)',
                  background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
                  boxShadow:'0 8px 32px rgba(0,0,0,0.12)', minWidth:210, zIndex:50,
                  overflow:'hidden',
                }}>
                  <div style={{padding:'14px 16px', borderBottom:'1px solid #f3f4f6'}}>
                    <p style={{fontWeight:700, fontSize:14, margin:0, color:'#111827'}}>
                      {displayName}
                    </p>
                    <p style={{fontSize:12, color:'#6b7280', margin:0}}>
                      {profile?.email ?? ''}
                    </p>
                  </div>
                  <div style={{padding:8}}>
                    <button onClick={logout} style={{
                      width:'100%', display:'flex', alignItems:'center', gap:8,
                      padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer',
                      background:'none', color:'#ef4444', fontSize:13, fontWeight:600,
                    }}>
                      <SvgLogout /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={logout} style={{
            display:'flex', alignItems:'center', gap:6,
            border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 14px',
            background:'none', cursor:'pointer', color:'#6b7280', fontSize:13, fontWeight:600,
          }}>
            <SvgLogout /> Logout
          </button>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════ */}
      <div style={{flex:1, display:'flex', minHeight:0}}>

        {/* ── SIDEBAR ──────────────────────────────────────── */}
        <aside style={{
          width:200, background:'#fff', borderRight:'1px solid #e5e7eb',
          display:'flex', flexDirection:'column', flexShrink:0,
          padding:'14px 10px', gap:2,
        }}>
          <NavItem Icon={SvgHome}  label="Dashboard"     active={true}  onClick={() => {}} />
          <NavItem Icon={SvgUsers} label="Users"         active={false} onClick={() => navigate('/admin/users')} />
          <NavItem icon="🔗"       label="Associations" active={false} onClick={() => navigate('/admin/associations')} />

          <NavItem Icon={SvgBar} label="Reports" active={false} onClick={() => navigate('/admin/reports')} />
          <NavItem Icon={SvgGear}  label="Settings"      active={false} onClick={() => {}} />

          <div style={{flex:1}}/>

          <div style={{
            background:'#eff6ff', borderRadius:14, padding:'12px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{
              width:32, height:32, borderRadius:'50%', background:'#2563eb',
              flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <SvgHelp />
            </div>
            <div>
              <p style={{fontSize:12, fontWeight:700, color:'#1e40af', margin:0}}>Need help?</p>
              <a href="#" style={{fontSize:11, color:'#3b82f6', textDecoration:'none'}}>
                Contact support
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────── */}
        <main style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden'}}>

          {/* KPI row */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(4,1fr)',
            gap:14, padding:'16px 16px 0', flexShrink:0,
          }}>
            <KpiCard Icon={SvgUsersLg} label="Total Users" value={users.length}
              sub="All registered users" trend={12}
              bgIcon="#eff6ff" iconColor="#2563eb" loading={loading} />
            <KpiCard Icon={SvgAlertT} label="Active Alerts" value={activeAlerts.length}
              sub="Requiring attention" trend={-20}
              bgIcon="#fef2f2" iconColor="#ef4444" loading={loading} />
            <KpiCard Icon={SvgShield} label="Resolved Today" value={resolvedToday}
              sub="vs yesterday" trend={36}
              bgIcon="#f0fdf4" iconColor="#16a34a" loading={loading} />
            <KpiCard Icon={SvgUsersLg} label="Companions" value={companions.length}
              sub="Active companions" trend={8}
              bgIcon="#f5f3ff" iconColor="#7c3aed" loading={loading} />
          </div>

          {/* Map + panels */}
          <div style={{flex:1, display:'flex', minHeight:0, padding:14, gap:14}}>

            {/* Left: map + activity */}
            <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, gap:14}}>

              {/* Map */}
              <div style={{
                flex:1, minHeight:0, borderRadius:16, overflow:'hidden',
                border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {loading ? (
                  <div style={{height:'100%', display:'flex', alignItems:'center',
                               justifyContent:'center', background:'#f9fafb'}}>
                    <Spinner size={36}/>
                  </div>
                ) : (
                  <MapContainer center={[33.9716,-6.8498]} zoom={13}
                                style={{height:'100%', width:'100%'}}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    />
                    {activeAlerts.map(alert => (
                      <Marker key={alert.id}
                              position={[alert.latitude, alert.longitude]}
                              icon={redIcon}>
                        <Popup minWidth={200}>
                          <div style={{padding:'2px 0'}}>
                            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:8}}>
                              <span style={{fontSize:18}}>{obMeta(alert.obstacleType).emoji}</span>
                              <strong style={{color:'#dc2626', fontSize:13}}>
                                {alert.obstacleType ?? 'SOS'} #{alert.id}
                              </strong>
                            </div>
                            <p style={{fontSize:12, color:'#374151', margin:'3px 0'}}>
                              <b>User:</b> {alert.userName ?? `User #${alert.userId}`}
                            </p>
                            <p style={{fontSize:12, color:'#374151', margin:'3px 0 10px'}}>
                              <b>Time:</b> {fmtTime(alert.createdAt)}
                            </p>
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              disabled={resolving === alert.id}
                              style={{
                                width:'100%', background:'#16a34a', color:'#fff',
                                border:'none', borderRadius:8, padding:'8px',
                                fontWeight:700, fontSize:13, cursor:'pointer',
                                display:'flex', alignItems:'center',
                                justifyContent:'center', gap:6,
                                opacity: resolving===alert.id ? 0.6 : 1,
                              }}
                            >
                              ✓ {resolving===alert.id ? 'Resolving…' : 'Resolve'}
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              {/* Recent Activity */}
              <div style={{
                background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
                boxShadow:'0 1px 4px rgba(0,0,0,0.04)', flexShrink:0,
              }}>
                <div style={{
                  padding:'13px 18px 10px', borderBottom:'1px solid #f3f4f6',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{
                      width:28, height:28, borderRadius:8, background:'#eff6ff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#2563eb',
                    }}>
                      <SvgActivity />
                    </div>
                    <span style={{fontWeight:700, fontSize:14, color:'#111827'}}>
                      Recent Activity
                    </span>
                  </div>
                  <button onClick={() => navigate('/admin/logs')} style={{
                    display:'flex', alignItems:'center', gap:4,
                    background:'none', border:'none', cursor:'pointer',
                    color:'#2563eb', fontSize:13, fontWeight:600,
                  }}>
                    View full history <SvgArrow />
                  </button>
                </div>

                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                  <thead>
                    <tr style={{background:'#fafafa'}}>
                      {[
                        { h:'User',  align:'left'  },
                        { h:'Event', align:'left'  },
                        { h:'Time',  align:'right' },
                      ].map(({ h, align }) => (
                        <th key={h} style={{
                          padding:'7px 18px', textAlign:align,
                          fontSize:11, fontWeight:600, color:'#9ca3af',
                          textTransform:'uppercase', letterSpacing:'0.05em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? [1,2,3].map(i => (
                      <tr key={i}>
                        {[60,80,40].map((w,j) => (
                          <td key={j} style={{padding:'10px 18px'}}>
                            <div style={{height:11, background:'#f3f4f6', borderRadius:4, width:`${w}%`}}/>
                          </td>
                        ))}
                      </tr>
                    )) : activityFeed.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{padding:'18px', textAlign:'center', color:'#9ca3af'}}>
                          No recent activity.
                        </td>
                      </tr>
                    ) : activityFeed.map((a, i) => {
                      const resolved = a.status === 'RESOLVED';
                      return (
                        <tr key={a.id ?? i} style={{borderTop:'1px solid #f9fafb'}}>
                          <td style={{padding:'10px 18px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                              <div style={{
                                width:28, height:28, borderRadius:'50%', flexShrink:0,
                                background: resolved ? '#f0fdf4' : '#fef2f2',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:14,
                              }}>
                                {obMeta(a.obstacleType).emoji}
                              </div>
                              <span style={{fontWeight:600, color:'#111827'}}>
                                {a.userName ?? `User #${a.userId}`}
                              </span>
                            </div>
                          </td>
                          <td style={{padding:'10px 18px', color:'#6b7280'}}>
                            SOS alert {resolved ? 'resolved' : 'detected'} ({a.obstacleType ?? 'Unknown'})
                          </td>
                          <td style={{padding:'10px 18px', textAlign:'right', color:'#9ca3af',
                                      fontSize:12, whiteSpace:'nowrap'}}>
                            {fmtTime(a.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: alerts panel + system overview */}
            <div style={{width:300, display:'flex', flexDirection:'column', gap:14, flexShrink:0}}>

              {/* Active Alerts panel */}
              <div style={{
                background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
                overflow:'hidden', display:'flex', flexDirection:'column',
                flex:1, minHeight:0, boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  padding:'14px 16px 12px', borderBottom:'1px solid #f3f4f6',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  flexShrink:0,
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{fontWeight:700, fontSize:15, color:'#111827'}}>
                      Active Alerts
                    </span>
                    {activeAlerts.length > 0 && (
                      <span style={{
                        background:'#ef4444', color:'#fff',
                        fontSize:11, fontWeight:800, width:20, height:20, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>{activeAlerts.length}</span>
                    )}
                  </div>
                  <button onClick={() => navigate('/admin/alerts')} style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:'#2563eb', fontSize:12, fontWeight:600,
                  }}>View all</button>
                </div>

                <div style={{flex:1, overflowY:'auto', padding:'0 14px'}}>
                  {loading ? (
                    <div style={{display:'flex', alignItems:'center',
                                 justifyContent:'center', padding:40}}>
                      <Spinner />
                    </div>
                  ) : activeAlerts.length === 0 ? (
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center',
                                 padding:'40px 0', gap:8}}>
                      <span style={{fontSize:30}}>✅</span>
                      <p style={{fontSize:13, color:'#9ca3af', fontWeight:500,
                                 textAlign:'center', margin:0}}>
                        All clear —<br/>no active alerts
                      </p>
                    </div>
                  ) : activeAlerts.map(alert => (
                    <AlertRow key={alert.id} alert={alert}
                              onResolve={resolveAlert} resolving={resolving} />
                  ))}
                </div>

                <div style={{padding:'11px 14px', borderTop:'1px solid #f3f4f6', flexShrink:0}}>
                  <button onClick={() => navigate('/admin/logs')} style={{
                    width:'100%', background:'none', border:'none', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    color:'#2563eb', fontSize:13, fontWeight:700, padding:'6px 0',
                  }}>
                    View All Alerts <SvgArrow />
                  </button>
                </div>
              </div>

              {/* System Overview */}
              <div style={{
                background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
                padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', flexShrink:0,
              }}>
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:16,
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{
                      width:28, height:28, borderRadius:8, background:'#f3f4f6',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#6b7280',
                    }}>
                      <SvgMonitor />
                    </div>
                    <span style={{fontWeight:700, fontSize:14, color:'#111827'}}>
                      System Overview
                    </span>
                  </div>
                  <button onClick={loadData} title="Refresh" style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:'#9ca3af', display:'flex', padding:4,
                  }}>
                    <SvgRefresh />
                  </button>
                </div>

                {loading ? (
                  <div style={{display:'flex', alignItems:'center',
                               justifyContent:'center', padding:20}}>
                    <Spinner />
                  </div>
                ) : (
                  <DonutChart
                    active={activeUsers}
                    inactive={inactiveUsers}
                    offline={offlineUsers}
                    total={users.length}
                  />
                )}

                <div style={{
                  marginTop:14, paddingTop:12, borderTop:'1px solid #f3f4f6',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <div>
                    <p style={{fontSize:12, color:'#374151', fontWeight:600, margin:0}}>
                      System Status
                    </p>
                    <div style={{display:'flex', alignItems:'center', gap:5, marginTop:3}}>
                      <div style={{width:7, height:7, borderRadius:'50%', background:'#22c55e'}}/>
                      <span style={{fontSize:11, color:'#16a34a', fontWeight:600}}>
                        All systems operational
                      </span>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:12, color:'#374151', fontWeight:600, margin:0}}>Uptime</p>
                    <p style={{fontSize:13, color:'#111827', fontWeight:800, margin:'2px 0 0'}}>
                      99.9%
                    </p>
                  </div>
                </div>

                {lastUpdated && (
                  <p style={{
                    fontSize:11, color:'#9ca3af', margin:'10px 0 0',
                    display:'flex', alignItems:'center', gap:4,
                  }}>
                    <SvgRefresh />
                    Last updated: {fmtTime(lastUpdated.toISOString())}
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <Toaster position="top-right" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </div>
  );
}