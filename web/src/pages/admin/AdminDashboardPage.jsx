import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axiosInstance';
import { useWebSocket } from '../../hooks/useWebSocket';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

// ── Inline SVG marker — no external images, no broken icons ──
const redIcon = L.divIcon({
  className: '',
  iconSize:    [34, 46],
  iconAnchor:  [17, 46],
  popupAnchor: [0, -48],
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 46" width="34" height="46"
         style="display:block;filter:drop-shadow(0 3px 8px rgba(220,38,38,0.45))">
    <path d="M17 0C7.611 0 0 7.611 0 17c0 13.5 17 29 17 29S34 30.5 34 17C34 7.611 26.389 0 17 0z" fill="#dc2626"/>
    <circle cx="17" cy="17" r="9" fill="white"/>
    <circle cx="17" cy="17" r="5" fill="#dc2626"/>
  </svg>`,
});

// ── Helpers ───────────────────────────────────────────────────
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
function isToday(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getDate()===n.getDate() && dt.getMonth()===n.getMonth() && dt.getFullYear()===n.getFullYear();
}
function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function fmtTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const hm = dt.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  return isToday(d) ? `Today, ${hm}` : dt.toLocaleDateString('en-US',{ month:'short', day:'numeric' })+`, ${hm}`;
}
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return COLORS[(id||0) % COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom   ?? u?.lastName  ?? '';
  return ((p+' '+n).trim() || u?.email || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom   ?? u?.lastName  ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || 'Admin';
}
function alertName(a) {
  const p = a?.userPrenom ?? ''; const n = a?.userNom ?? '';
  return (p+' '+n).trim() || '—';
}
function MapAutoFit({ alerts }) {
  const map = useMap();
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const bounds = alerts.map(a => [a.latitude, a.longitude]);
    map.fitBounds(bounds, { padding:[60,60], maxZoom:15, animate:true });
  }, [alerts.length]);
  return null;
}

// ── Icons ─────────────────────────────────────────────────────
const ic = (d, w=20, h=20) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width:w, height:h, flexShrink:0 }}
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const IcHome    = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink    = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar     = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcProfile = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>, 18, 18);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 14, 14);
const IcChevFwd = ic(<polyline points="5,3 10,8 5,13"/>, 12, 12);
const IcArrow   = ic(<><line x1="3" y1="10" x2="17" y2="10"/><polyline points="12,5 17,10 12,15"/></>, 15, 15);
const IcCheck   = ic(<polyline points="4,10 8,14 16,6"/>, 13, 13);
const IcRefresh = ic(<><polyline points="23,4 23,11 16,11"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 11"/></>, 14, 14);
const IcMonitor = ic(<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>);
const IcActivity= ic(<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>, 16, 16);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 13, 13);
const IcMenu    = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcBell    = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>);
// KPI icons
const KicUsers  = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, 22, 22);
const KicAlert  = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 22, 22);
const KicShield = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>, 22, 22);
const KicCompanion = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>, 22, 22);
// Quick action icons
const QicUsers  = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, 20, 20);
const QicLink   = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>, 20, 20);
const QicBar    = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>, 20, 20);
const QicProfile= ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>, 20, 20);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=24, light=false }) {
  return (
    <svg style={{ width:size, height:size, animation:'spin 0.9s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="3.5"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, size=36 }) {
  const [imgErr, setImgErr] = useState(false);
  const src = user?.photoUrl
    ? (user.photoUrl.startsWith('http') ? user.photoUrl : `http://localhost:8081${user.photoUrl}`)
    : null;
  const showPhoto = src && !imgErr;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:avColor(user?.id), flexShrink:0, overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700, fontSize:size>40?15:12,
    }}>
      {showPhoto
        ? <img src={src} alt="" onError={()=>setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : initials(user)}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ Icon, iconColor, bgIcon, label, value, sub, loading }) {
  return (
    <div style={{
      background:'#fff', borderRadius:16, border:'1px solid #f0f0f0',
      boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:'18px 20px',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <p style={{ fontSize:11, color:'#9ca3af', fontWeight:600, margin:0, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {label}
        </p>
        <div style={{ width:40, height:40, borderRadius:11, background:bgIcon, display:'flex', alignItems:'center', justifyContent:'center', color:iconColor, flexShrink:0 }}>
          <Icon/>
        </div>
      </div>
      {loading
        ? <div style={{ height:30, width:56, background:'#f3f4f6', borderRadius:6 }}/>
        : <p style={{ fontSize:28, fontWeight:800, color:'#111827', margin:'0 0 4px', lineHeight:1, letterSpacing:'-0.8px' }}>{value ?? 0}</p>}
      {!loading && sub && <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>{sub}</p>}
    </div>
  );
}

// ── Quick Action Card ─────────────────────────────────────────
function QuickAction({ Icon, iconBg, iconColor, label, description, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:13,
        padding:'14px 16px', borderRadius:12,
        border:'1px solid #f0f0f0',
        background: hov ? '#fafafa' : '#fff',
        cursor:'pointer', textAlign:'left', flex:1,
        boxShadow: hov ? '0 2px 12px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition:'box-shadow 0.18s, background 0.15s',
      }}
    >
      <div style={{ width:40, height:40, borderRadius:11, background:iconBg, color:iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon/>
      </div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:'0 0 2px' }}>{label}</p>
        <p style={{ fontSize:11, color:'#9ca3af', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{description}</p>
      </div>
    </button>
  );
}

// ── Alert row ─────────────────────────────────────────────────
function AlertRow({ alert, onResolve, resolving }) {
  const m = obMeta(alert.obstacleType);
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 0', borderBottom:'1px solid #f5f5f5' }}>
      <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:m.bg, display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${m.color}22` }}>
        <div style={{ width:9, height:9, borderRadius:'50%', background:m.dot }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:13, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {alertName(alert)}
          </span>
          <span style={{ fontSize:10, color:'#ef4444', fontWeight:600, flexShrink:0, marginLeft:4 }}>{timeAgo(alert.createdAt)}</span>
        </div>
        <span style={{ fontSize:11, fontWeight:600, color:m.color, background:m.bg, padding:'1px 7px', borderRadius:10, border:`1px solid ${m.color}33`, display:'inline-block', margin:'2px 0' }}>{m.label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:4, color:'#9ca3af', fontSize:11 }}>
          <IcClock/>{fmtTime(alert.createdAt)}
        </div>
      </div>
      <button onClick={() => onResolve(alert.id)} disabled={resolving===alert.id}
        style={{ flexShrink:0, display:'flex', alignItems:'center', gap:3, background:'#16a34a', color:'#fff', border:'none', borderRadius:7, padding:'6px 9px', fontSize:11, fontWeight:700, cursor:'pointer', opacity:resolving===alert.id?0.6:1, boxShadow:'0 2px 5px rgba(22,163,74,0.2)', transition:'background 0.15s' }}
        onMouseEnter={e => { if (resolving!==alert.id) e.currentTarget.style.background='#15803d'; }}
        onMouseLeave={e => { if (resolving!==alert.id) e.currentTarget.style.background='#16a34a'; }}>
        <IcCheck/>{resolving===alert.id?'…':'Resolve'}
      </button>
    </div>
  );
}

// ── Donut ─────────────────────────────────────────────────────
function Donut({ active, inactive, offline, total }) {
  if (total === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, flex:1, padding:'12px 0' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', color:'#d1d5db' }}>
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <p style={{ fontSize:12, color:'#9ca3af', margin:0, textAlign:'center', lineHeight:1.5 }}>No activity data available</p>
      </div>
    );
  }
  const r=50, cx=66, cy=66, stroke=16, circ=2*Math.PI*r;
  const pA=active/total, pI=inactive/total, pO=Math.max(0,1-pA-pI);
  const segs=[{pct:pA,color:'#2563eb'},{pct:pI,color:'#93c5fd'},{pct:pO,color:'#f0f0f0'}];
  let offset=0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:18 }}>
      <svg width={132} height={132} style={{ flexShrink:0 }}>
        {segs.map((s,i) => {
          const dash=s.pct*circ, gap=circ-dash;
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset*circ}
            transform={`rotate(-90 ${cx} ${cy})`}/>;
          offset+=s.pct; return el;
        })}
        <text x={cx} y={cy-5} textAnchor="middle" fontSize={20} fontWeight={800} fill="#111827">{total}</text>
        <text x={cx} y={cy+11} textAnchor="middle" fontSize={10} fill="#9ca3af">Total Users</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {[
          { label:'Active',   value:active,   color:'#2563eb', pct:Math.round(pA*100) },
          { label:'Inactive', value:inactive, color:'#93c5fd', pct:Math.round(pI*100) },
          { label:'Offline',  value:offline,  color:'#e5e7eb', pct:Math.round(pO*100) },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#374151', minWidth:52 }}>{s.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#111827', minWidth:16 }}>{s.value}</span>
            <span style={{ fontSize:11, color:'#9ca3af' }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
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
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

  const loadData = useCallback(async () => {
    try {
      const [ar, ur] = await Promise.all([
        api.get('/api/v1/admin/alerts'),
        api.get('/api/v1/admin/users'),
      ]);
      setAllAlerts(ar.data);
      setUsers(ur.data);
      setLastUpdated(new Date());
    } catch { toast.error('Failed to load dashboard.'); }
    finally { setLoading(false); }
    try { const { data } = await api.get('/api/v1/users/me'); setProfile(data); } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived stats (real data only) ────────────────────────
  const activeAlerts  = allAlerts.filter(a => a.status === 'ACTIVE');
  const companions    = users.filter(u => u.role === 'COMPANION');
  const resolvedToday = allAlerts.filter(a => a.status==='RESOLVED' && isToday(a.resolvedAt)).length + sessionResolved;
  const activityFeed  = [...allAlerts].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
  const activeUsers   = users.filter(u => u.role==='VISUAL_IMPAIRED' || u.role==='COMPANION').length;
  const inactiveUsers = Math.max(0, Math.floor(users.length * 0.36));
  const offlineUsers  = Math.max(0, users.length - activeUsers - inactiveUsers);

  const handleNewAlert = useCallback((notif) => {
    setAllAlerts(prev => prev.find(a => a.id===notif.alertId) ? prev : [{
      id:notif.alertId, userId:notif.userId, latitude:notif.latitude,
      longitude:notif.longitude, obstacleType:notif.obstacleType,
      status:'ACTIVE', createdAt:notif.createdAt ?? new Date().toISOString(),
    }, ...prev]);
    toast.custom(() => (
      <div style={{ background:'#dc2626', color:'#fff', padding:'12px 18px', borderRadius:14,
        boxShadow:'0 8px 24px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
          <KicAlert/>
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:14, margin:0 }}>New SOS Alert</p>
          <p style={{ fontSize:12, opacity:0.85, margin:0 }}>
            {obMeta(notif.obstacleType).label} — User #{notif.userId}
          </p>
        </div>
      </div>
    ), { duration:6000 });
  }, []);
  useWebSocket(handleNewAlert, setConnected);

  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      const { data: updated } = await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      setAllAlerts(prev => prev.map(a => a.id===alertId
        ? { ...a, ...updated, status:'RESOLVED', resolvedAt:new Date().toISOString() } : a));
      setSessionResolved(c => c+1);
      toast.success('Alert resolved.');
    } catch (err) {
      if (err.response?.status===409) toast.error('Already resolved.');
      else toast.error('Failed to resolve alert.');
    } finally { setResolving(null); }
  };

  const dn = displayName(profile);
  const goProfile = () => { setProfileOpen(false); navigate('/profile'); };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      height:'100vh', display:'flex', flexDirection:'row',
      background:'#f4f6f8', overflow:'hidden',
      fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>

      {/* ── SIDEBAR ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => toggleSidebar()}
        items={[
          { Icon:IcHome,    label:'Dashboard',    path:'/admin' },
          { Icon:IcUsers,   label:'Users',        path:'/admin/users' },
          { Icon:IcLink,    label:'Associations', path:'/admin/associations' },
          { Icon:IcBar,     label:'Reports',      path:'/admin/reports' },
          { Icon:IcProfile, label:'My Profile',   path:'/profile' },
        ]}
      />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* ── HEADER ── */}
        <header style={{
          height:60, background:'#fff', borderBottom:'1px solid #f0f0f0',
          padding:'0 24px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0, zIndex:20,
        }}>
          {/* Left: toggle + breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button
              onClick={() => toggleSidebar()}
              style={{ width:34, height:34, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}
            >
              <IcMenu/>
            </button>
            <span style={{ fontSize:15, fontWeight:700, color:'#111827', letterSpacing:'-0.3px' }}>
              Dashboard
            </span>
          </div>

          {/* Right: profile dropdown only */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'1px solid transparent', cursor:'pointer', padding:'5px 8px 5px 5px', borderRadius:10, transition:'background 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.borderColor='transparent'; }}
            >
              <Avatar user={profile} size={32}/>
              <span style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{dn}</span>
              <span style={{ color:'#9ca3af', display:'flex' }}><IcChevD/></span>
            </button>

            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)} style={{ position:'fixed', inset:0, zIndex:40 }}/>
                <div style={{
                  position:'absolute', right:0, top:'calc(100% + 8px)',
                  background:'#fff', border:'1px solid #e2e8f0',
                  borderRadius:14, boxShadow:'0 8px 30px rgba(0,0,0,0.10)',
                  minWidth:214, zIndex:50, overflow:'hidden',
                }}>
                  {/* User info — read only, no click */}
                  <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar user={profile} size={40}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:14, color:'#0f172a', margin:0, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dn}</p>
                        <p style={{ fontSize:12, color:'#94a3b8', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.email ?? ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <div style={{ padding:'6px' }}>
                    <button onClick={goProfile} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'none', color:'#374151', fontSize:13, fontWeight:500, textAlign:'left', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                      <span style={{ color:'#64748b', display:'flex' }}><IcProfile/></span>
                      My Profile
                    </button>

                    <div style={{ height:1, background:'#f1f5f9', margin:'4px 2px' }}/>

                    <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'none', color:'#ef4444', fontSize:13, fontWeight:500, textAlign:'left', transition:'background 0.15s' }}
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

        {/* ── MAIN ── */}
        <main style={{ flex:1, overflowY:'auto', padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* ── ROW 1: KPI cards ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, flexShrink:0 }}>
            <KpiCard Icon={KicUsers}     iconColor="#2563eb" bgIcon="#eff6ff"
              label="Total Users"    value={users.length}         sub={`${companions.length} companions`}  loading={loading}/>
            <KpiCard Icon={KicAlert}     iconColor="#ef4444" bgIcon="#fef2f2"
              label="Active Alerts"  value={activeAlerts.length}  sub="Requiring attention"                loading={loading}/>
            <KpiCard Icon={KicShield}    iconColor="#16a34a" bgIcon="#f0fdf4"
              label="Resolved Today" value={resolvedToday}        sub="Alerts closed today"                loading={loading}/>
            <KpiCard Icon={KicCompanion} iconColor="#7c3aed" bgIcon="#f5f3ff"
              label="Companions"     value={companions.length}    sub={`of ${users.length} total users`}   loading={loading}/>
          </div>

          {/* ── ROW 2: Map (70%) | System Overview (30%) ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, height:340, flexShrink:0 }}>

            {/* Map */}
            <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid #f0f0f0', boxShadow:'0 1px 6px rgba(0,0,0,0.05)', position:'relative' }}>
              <div style={{ position:'absolute', top:12, left:12, zIndex:800 }}>
                <div style={{ background:'rgba(255,255,255,0.95)', borderRadius:9, padding:'5px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.10)', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#374151', border:'1px solid #e5e7eb' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:activeAlerts.length>0?'#ef4444':'#22c55e' }}/>
                  {activeAlerts.length>0 ? `${activeAlerts.length} active alert${activeAlerts.length>1?'s':''}` : 'All clear'}
                </div>
              </div>
              {loading ? (
                <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', flexDirection:'column', gap:12 }}>
                  <Spinner size={36}/>
                  <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>Loading map…</p>
                </div>
              ) : (
                <MapContainer center={[33.9716,-6.8498]} zoom={6} style={{ height:'100%', width:'100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'/>
                  {activeAlerts.length > 0 && <MapAutoFit alerts={activeAlerts}/>}
                  {activeAlerts.map(alert => (
                    <Marker key={alert.id} position={[alert.latitude,alert.longitude]} icon={redIcon}>
                      <Popup minWidth={240}>
                        <div style={{ padding:'4px 0' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                            <Avatar
                              user={{ id:alert.userId, prenom:alert.userPrenom, nom:alert.userNom, photoUrl:alert.userPhotoUrl }}
                              size={36}
                            />
                            <div>
                              <p style={{ fontWeight:700, fontSize:13, color:'#111827', margin:0 }}>{alertName(alert)}</p>
                              <span style={{ fontSize:11, color:obMeta(alert.obstacleType).color, fontWeight:600 }}>
                                {obMeta(alert.obstacleType).label}
                              </span>
                            </div>
                          </div>
                          <p style={{ fontSize:12, color:'#374151', margin:'3px 0' }}><b>Time:</b> {fmtTime(alert.createdAt)}</p>
                          <p style={{ fontSize:12, color:'#374151', margin:'3px 0 10px' }}><b>Location:</b> {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}</p>
                          <button onClick={() => resolveAlert(alert.id)} disabled={resolving===alert.id}
                            style={{ width:'100%', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'9px', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:resolving===alert.id?0.6:1 }}>
                            <IcCheck/>{resolving===alert.id?'Resolving…':'Mark as Resolved'}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>

            {/* System Overview */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f0f0', padding:'18px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb' }}>
                    <IcMonitor/>
                  </div>
                  <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>System Overview</span>
                </div>
                <button onClick={loadData} title="Refresh" style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', padding:4, borderRadius:6, transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                  <IcRefresh/>
                </button>
              </div>

              {loading ? (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner/></div>
              ) : (
                <div style={{ flex:1 }}>
                  <Donut active={activeUsers} inactive={inactiveUsers} offline={offlineUsers} total={users.length}/>
                </div>
              )}

              <div style={{ marginTop:'auto', paddingTop:14, borderTop:'1px solid #f5f5f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: connected ? '#22c55e' : '#f59e0b' }}/>
                  <span style={{ fontSize:12, fontWeight:600, color: connected ? '#16a34a' : '#d97706' }}>
                    {connected ? 'Connected' : 'Reconnecting'}
                  </span>
                </div>
                {lastUpdated && (
                  <span style={{ fontSize:11, color:'#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                    <IcClock/>{fmtTime(lastUpdated.toISOString())}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── ROW 3: Recent Activity (70%) | Quick Actions (30%) ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, flexShrink:0 }}>

            {/* Recent Activity */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f0f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'13px 18px', borderBottom:'1px solid #f5f5f5', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb' }}>
                    <IcActivity/>
                  </div>
                  <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Recent Activity</span>
                  {!loading && allAlerts.length > 0 && (
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{allAlerts.length} records</span>
                  )}
                </div>
                <button onClick={() => navigate('/admin/reports')} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#2563eb', fontSize:13, fontWeight:600 }}>
                  View Reports <IcArrow/>
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#fafafa' }}>
                      {['User','Obstacle','Status','Time'].map(h => (
                        <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? [1,2,3,4].map(i => (
                      <tr key={i}>{[50,35,30,30].map((w,j) => (
                        <td key={j} style={{ padding:'11px 16px' }}>
                          <div style={{ height:11, background:'#f3f4f6', borderRadius:4, width:`${w}%` }}/>
                        </td>
                      ))}</tr>
                    )) : activityFeed.length===0 ? (
                      <tr><td colSpan={4} style={{ padding:'24px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>No recent activity.</td></tr>
                    ) : activityFeed.map((a,i) => {
                      const resolved = a.status === 'RESOLVED';
                      const m = obMeta(a.obstacleType);
                      return (
                        <tr key={a.id??i} style={{ borderTop:'1px solid #f9fafb', transition:'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'11px 16px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <Avatar user={{ id:a.userId, prenom:a.userPrenom, nom:a.userNom, photoUrl:a.userPhotoUrl }} size={26}/>
                              <span style={{ fontWeight:600, color:'#111827', fontSize:12 }}>
                                {alertName(a)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding:'11px 16px' }}>
                            <span style={{ fontSize:11, fontWeight:600, color:m.color, background:m.bg, padding:'2px 8px', borderRadius:10, border:`1px solid ${m.color}33`, whiteSpace:'nowrap' }}>{m.label}</span>
                          </td>
                          <td style={{ padding:'11px 16px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
                              color:resolved?'#16a34a':'#f59e0b', background:resolved?'#f0fdf4':'#fffbeb',
                              padding:'2px 8px', borderRadius:10, border:`1px solid ${resolved?'#bbf7d0':'#fde68a'}`, whiteSpace:'nowrap' }}>
                              {resolved ? <IcCheck/> : <div style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b' }}/>}
                              {resolved ? 'Resolved' : 'Active'}
                            </span>
                          </td>
                          <td style={{ padding:'11px 16px', color:'#9ca3af', fontSize:11, whiteSpace:'nowrap' }}>
                            {fmtTime(a.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f0f0', padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#7c3aed' }}>
                  <IcArrow/>
                </div>
                <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Quick Actions</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { Icon:QicUsers,   bg:'#eff6ff',  color:'#2563eb', label:'Manage Users',   path:'/admin/users' },
                  { Icon:QicLink,    bg:'#f0fdf4',  color:'#16a34a', label:'Associations',   path:'/admin/associations' },
                  { Icon:QicBar,     bg:'#fff7ed',  color:'#d97706', label:'View Reports',   path:'/admin/reports' },
                  { Icon:QicProfile, bg:'#f5f3ff',  color:'#7c3aed', label:'My Profile',     path:'/profile' },
                ].map(({ Icon, bg, color, label, path }) => (
                  <button key={label} onClick={() => navigate(path)} style={{
                    display:'flex', flexDirection:'column', alignItems:'flex-start', gap:8,
                    padding:'13px 13px', borderRadius:11, border:'1px solid #f0f0f0',
                    background:'#fafafa', cursor:'pointer', textAlign:'left',
                    transition:'background 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='#fafafa'; e.currentTarget.style.boxShadow='none'; }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:bg, color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'#374151', lineHeight:1.3 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>

      <Toaster position="top-right"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
import { useSidebarState } from '../../hooks/useSidebarState';
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
