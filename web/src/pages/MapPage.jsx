/**
 * ActiveAlertsPage.jsx — AssistWalk
 *
 * APIs utilisées :
 *   GET  /api/v1/alerts/active          → alertes actives des malvoyants associés
 *   PATCH /api/v1/alerts/{id}/resolve   → résoudre une alerte
 *   GET  /api/v1/users/me               → profil accompagnateur connecté
 *
 * WebSocket : /topic/alerts/{userId}    → nouvelles alertes en temps réel
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosInstance';
import { useWebSocket } from '../hooks/useWebSocket';
import { logout } from '../utils/auth';

// ─── Helpers ──────────────────────────────────────────────────

/** Emoji + couleur par type d'obstacle */
const OBSTACLE_META = {
  stairs:           { emoji: '🪜', color: '#ef4444', bg: '#fef2f2', label: 'Stairs'           },
  staircase:        { emoji: '🪜', color: '#ef4444', bg: '#fef2f2', label: 'Staircase'        },
  doors:            { emoji: '🚪', color: '#f97316', bg: '#fff7ed', label: 'Doors'            },
  door:             { emoji: '🚪', color: '#f97316', bg: '#fff7ed', label: 'Door'             },
  tree:             { emoji: '🌳', color: '#16a34a', bg: '#f0fdf4', label: 'Tree'             },
  metallic_barrier: { emoji: '🚧', color: '#d97706', bg: '#fffbeb', label: 'Metallic Barrier' },
  barrier:          { emoji: '🚧', color: '#d97706', bg: '#fffbeb', label: 'Barrier'          },
  car:              { emoji: '🚗', color: '#6366f1', bg: '#eef2ff', label: 'Car'              },
  vehicle:          { emoji: '🚗', color: '#6366f1', bg: '#eef2ff', label: 'Vehicle'          },
};

function obstacleMeta(type) {
  if (!type) return { emoji: '🚨', color: '#ef4444', bg: '#fef2f2', label: 'Unknown' };
  const key = type.toLowerCase().replace(/ /g, '_');
  return OBSTACLE_META[key] ?? { emoji: '🚨', color: '#6b7280', bg: '#f3f4f6', label: type };
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + '\n' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Reverse-geocode lat/lon → adresse lisible (Nominatim, gratuit) */
async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address ?? {};
    const street = a.road ?? a.pedestrian ?? a.path ?? '';
    const city   = a.city ?? a.town ?? a.village ?? a.county ?? '';
    const country= a.country ?? '';
    return [street, city, country].filter(Boolean).join(', ') || 'Unknown location';
  } catch {
    return null;
  }
}

// ─── SVG Icons ─────────────────────────────────────────────────

const SvgHome     = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const SvgBell     = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const SvgClock    = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>;
const SvgUser     = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const SvgSearch   = () => <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}} stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const SvgChevronD = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2"><polyline points="4,6 8,10 12,6"/></svg>;
const SvgFilter   = () => <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;
const SvgCheck    = () => <svg viewBox="0 0 20 20" fill="none" style={{width:13,height:13}} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="4,10 8,14 16,6"/></svg>;
const SvgLogout   = () => <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SvgChevronL = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,4 6,8 10,12"/></svg>;
const SvgChevronR = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6,4 10,8 6,12"/></svg>;
const SvgPin      = () => <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const SvgCalendar = () => <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const SvgHelp     = () => <svg viewBox="0 0 24 24" fill="none" style={{width:17,height:17}} stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const SvgInfo     = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const SvgChevronH = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="#9ca3af" strokeWidth="2"><polyline points="4,6 8,10 12,6"/></svg>;

// ─── Sidebar NavItem ──────────────────────────────────────────
function NavItem({ Icon, label, active, badge, onClick }) {
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
      <Icon />
      <span style={{flex:1}}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? '#fff' : '#ef4444', color: active ? '#2563eb' : '#fff',
          fontSize:11, fontWeight:800, width:20, height:20, borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─── Select dropdown ──────────────────────────────────────────
function Select({ value, onChange, options, placeholder, style }) {
  return (
    <div style={{ position:'relative', ...style }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance:'none', WebkitAppearance:'none',
          width:'100%', padding:'9px 36px 9px 13px',
          border:'1px solid #e5e7eb', borderRadius:10,
          background:'#fff', color: value ? '#111827' : '#9ca3af',
          fontSize:13, fontWeight:500, cursor:'pointer', outline:'none',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{
        position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
        pointerEvents:'none', color:'#9ca3af',
      }}>
        <SvgChevronD />
      </span>
    </div>
  );
}

// ─── Obstacle Badge ───────────────────────────────────────────
function ObstacleBadge({ type }) {
  const m = obstacleMeta(type);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{
        width:40, height:40, borderRadius:10, background:m.bg,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
        border:`1px solid ${m.color}22`,
      }}>
        {m.emoji}
      </div>
      <span style={{ fontWeight:600, fontSize:13, color:'#111827' }}>
        {m.label}
      </span>
    </div>
  );
}

// ─── User Avatar ──────────────────────────────────────────────
function UserAvatar({ userId, name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
    : `U${String(userId).slice(-1)}`;

  const colors = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2'];
  const color  = colors[userId % colors.length];

  return (
    <div style={{
      width:40, height:40, borderRadius:'50%', background:color,
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700, fontSize:13, flexShrink:0,
    }}>
      {initials}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────
function Spinner({ size=24 }) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}}
         viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4"/>
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─── PAGE_SIZE ────────────────────────────────────────────────
const PAGE_SIZE = 5;

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function ActiveAlertsPage() {
  const navigate = useNavigate();

  // ── Data state ────────────────────────────────────────────
  const [allAlerts,    setAllAlerts]    = useState([]);
  const [addresses,    setAddresses]    = useState({});  // id → adresse géocodée
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [connected,    setConnected]    = useState(false);
  const [resolving,    setResolving]    = useState(null);
  const [profileOpen,  setProfileOpen]  = useState(false);

  // ── Filter/search state ───────────────────────────────────
  const [search,    setSearch]    = useState('');
  const [filterObs, setFilterObs] = useState('');
  const [filterUser,setFilterUser]= useState('');
  const [sortKey,   setSortKey]   = useState('newest'); // newest | oldest
  const [page,      setPage]      = useState(0);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [alertsRes] = await Promise.all([
          api.get('/api/v1/alerts/active'),
        ]);
        setAllAlerts(alertsRes.data);

        // Géocoder les alertes en arrière-plan
        alertsRes.data.forEach(a => geocodeAlert(a));
      } catch {
        toast.error('Failed to load alerts.');
      } finally {
        setLoading(false);
      }

      // Profil (optionnel)
      try {
        const { data } = await api.get('/api/v1/users/me');
        setProfile(data);
      } catch { /* endpoint pas encore prêt */ }
    };
    load();
  }, []);

  // Géocoder une alerte et mettre en cache
  const geocodeAlert = useCallback(async (alert) => {
    if (!alert.latitude || !alert.longitude) return;
    const key = `${alert.id}`;
    if (addresses[key]) return;
    const addr = await reverseGeocode(alert.latitude, alert.longitude);
    if (addr) setAddresses(prev => ({ ...prev, [key]: addr }));
  }, [addresses]);

  // ── WebSocket ─────────────────────────────────────────────
  const handleNewAlert = useCallback((notif) => {
    const newAlert = {
      id:           notif.alertId,
      userId:       notif.userId,
      latitude:     notif.latitude,
      longitude:    notif.longitude,
      obstacleType: notif.obstacleType,
      status:       'ACTIVE',
      createdAt:    notif.createdAt ?? new Date().toISOString(),
    };
    setAllAlerts(prev =>
      prev.find(a => a.id === notif.alertId) ? prev : [newAlert, ...prev]
    );
    geocodeAlert(newAlert);
    toast.custom(t => (
      <div style={{
        background:'#dc2626', color:'#fff',
        padding:'12px 18px', borderRadius:14,
        boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <span style={{fontSize:22}}>🚨</span>
        <div>
          <p style={{fontWeight:700,fontSize:14,margin:0}}>New SOS Alert!</p>
          <p style={{fontSize:12,opacity:0.85,margin:0}}>
            {notif.obstacleType ?? 'Unknown'} — User #{notif.userId}
          </p>
        </div>
      </div>
    ), { duration: 6000 });
  }, [geocodeAlert]);

  useWebSocket(handleNewAlert, setConnected);

  // ── Resolve ───────────────────────────────────────────────
  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      setAllAlerts(prev =>
        prev.map(a => a.id === alertId
          ? { ...a, status: 'RESOLVED', resolvedAt: new Date().toISOString() }
          : a
        )
      );
      toast.success('Alert resolved successfully.');
    } catch (err) {
      if (err.response?.status === 409) toast.error('Already resolved.');
      else toast.error('Failed to resolve alert.');
    } finally {
      setResolving(null);
    }
  };

  // ── Filter options from data ──────────────────────────────
  const obstacleOptions = useMemo(() => {
    const types = [...new Set(allAlerts.map(a => a.obstacleType).filter(Boolean))];
    return types.map(t => ({ value: t, label: obstacleMeta(t).label }));
  }, [allAlerts]);

  const userOptions = useMemo(() => {
    const ids = [...new Set(allAlerts.map(a => a.userId))];
    return ids.map(id => ({ value: String(id), label: `User #${id}` }));
  }, [allAlerts]);

  // ── Filter + sort + paginate ──────────────────────────────
  const activeAlerts = allAlerts.filter(a => a.status === 'ACTIVE');

  const filtered = useMemo(() => {
    let list = [...activeAlerts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        String(a.userId).includes(q) ||
        (a.obstacleType ?? '').toLowerCase().includes(q) ||
        (addresses[String(a.id)] ?? '').toLowerCase().includes(q)
      );
    }
    if (filterObs)  list = list.filter(a => a.obstacleType === filterObs);
    if (filterUser) list = list.filter(a => String(a.userId) === filterUser);

    list.sort((a, b) => sortKey === 'newest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [activeAlerts, search, filterObs, filterUser, sortKey, addresses]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData    = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => setPage(0), [search, filterObs, filterUser, sortKey]);

  // ── Profile ───────────────────────────────────────────────
  const firstName   = profile?.prenom ?? profile?.firstName ?? '';
  const lastName    = profile?.nom    ?? profile?.lastName  ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Companion';
  const initials    = displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'C';

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
        {/* Logo */}
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{
            width:38, height:38, borderRadius:10, background:'#2563eb',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{width:22,height:22}}>
              <circle cx="12" cy="4.5" r="2.2"/>
              <path d="M8.5 11.5l-1.5 4h2l1-2.5 1.5 1.5V20h2v-5.5l-2-2 .8-2.5 1.7 1.5H17V9.5h-2.5L13 8l-1 1-1-1-2 3.5z"/>
            </svg>
          </div>
          <span style={{fontWeight:800,fontSize:17,color:'#111827',letterSpacing:'-0.4px'}}>
            Assist<span style={{color:'#2563eb'}}>Walk</span>
          </span>
          <span style={{color:'#e5e7eb',margin:'0 8px'}}>|</span>
          <span style={{color:'#9ca3af',fontSize:13,fontWeight:500}}>Companion Dashboard</span>
        </div>

        {/* Right */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
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
            <span style={{fontSize:12,color:'#6b7280',fontWeight:500}}>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Profile */}
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
                width:34, height:34, borderRadius:'50%', background:'#2563eb',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:700, fontSize:13,
              }}>
                {initials}
              </div>
              <div style={{textAlign:'left'}}>
                <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,lineHeight:1.2}}>
                  {displayName}
                </p>
                <p style={{fontSize:11,color:'#9ca3af',margin:0}}>Accompagnateur</p>
              </div>
              <SvgChevronH />
            </button>

            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)}
                     style={{position:'fixed',inset:0,zIndex:40}}/>
                <div style={{
                  position:'absolute', right:0, top:'calc(100% + 8px)',
                  background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
                  boxShadow:'0 8px 32px rgba(0,0,0,0.12)', minWidth:200, zIndex:50,
                  overflow:'hidden',
                }}>
                  <div style={{padding:'14px 16px',borderBottom:'1px solid #f3f4f6'}}>
                    <p style={{fontWeight:700,fontSize:14,margin:0,color:'#111827'}}>{displayName}</p>
                    <p style={{fontSize:12,color:'#6b7280',margin:0}}>{profile?.email ?? ''}</p>
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
            border:'1px solid #e5e7eb', borderRadius:8,
            padding:'7px 13px', background:'none',
            cursor:'pointer', color:'#6b7280', fontSize:13, fontWeight:600,
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
          <NavItem Icon={SvgHome}  label="Dashboard"     active={false}
            onClick={() => navigate('/dashboard')} />
          <NavItem Icon={SvgBell}  label="Active Alerts" active={true}
            badge={activeAlerts.length}
            onClick={() => {}} />
          <NavItem Icon={SvgClock} label="History"       active={false}
            onClick={() => navigate('/history')} />
          <NavItem Icon={SvgUser}  label="My Profile"    active={false}
            onClick={() => setProfileOpen(true)} />

          <div style={{flex:1}}/>

          {/* Help card */}
          <div style={{
            background:'#eff6ff', borderRadius:14, padding:'12px 12px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{
              width:32, height:32, borderRadius:'50%', background:'#2563eb',
              flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <SvgHelp />
            </div>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:'#1e40af',margin:0}}>Need help?</p>
              <a href="#" style={{fontSize:11,color:'#3b82f6',textDecoration:'none'}}>
                Contact support
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────── */}
        <main style={{flex:1, overflowY:'auto', padding:'28px 28px'}}>

          {/* Page header */}
          <div style={{
            display:'flex', alignItems:'flex-start', justifyContent:'space-between',
            marginBottom:24,
          }}>
            <div>
              <h1 style={{fontSize:24,fontWeight:800,color:'#111827',margin:'0 0 4px',letterSpacing:'-0.5px'}}>
                Active Alerts
              </h1>
              <p style={{fontSize:14,color:'#6b7280',margin:0}}>
                Real-time alerts from users who need assistance.
              </p>
            </div>

            {/* Alert count badge */}
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              background: activeAlerts.length > 0 ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${activeAlerts.length > 0 ? '#fecaca' : '#bbf7d0'}`,
              borderRadius:12, padding:'10px 16px',
            }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background: activeAlerts.length > 0 ? '#ef4444' : '#22c55e',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <SvgBell />
              </div>
              <div>
                <p style={{
                  fontWeight:800, fontSize:18, margin:0, lineHeight:1,
                  color: activeAlerts.length > 0 ? '#dc2626' : '#16a34a',
                }}>
                  {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* ── Filters bar ──────────────────────────────── */}
          <div style={{
            background:'#fff', borderRadius:14, border:'1px solid #e5e7eb',
            padding:'14px 18px', marginBottom:16,
            display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* Search */}
            <div style={{position:'relative', flex:'1', minWidth:220}}>
              <span style={{
                position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none',
              }}>
                <SvgSearch />
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by user or obstacle..."
                style={{
                  width:'100%', padding:'9px 13px 9px 36px',
                  border:'1px solid #e5e7eb', borderRadius:10,
                  fontSize:13, color:'#374151', outline:'none',
                  background:'#f9fafb', boxSizing:'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Obstacle filter */}
            <Select
              value={filterObs}
              onChange={setFilterObs}
              options={obstacleOptions}
              placeholder="All Obstacles"
              style={{minWidth:160}}
            />

            {/* User filter */}
            <Select
              value={filterUser}
              onChange={setFilterUser}
              options={userOptions}
              placeholder="All Users"
              style={{minWidth:140}}
            />

            {/* Sort */}
            <div style={{position:'relative', minWidth:150}}>
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value)}
                style={{
                  appearance:'none', WebkitAppearance:'none',
                  width:'100%', padding:'9px 36px 9px 13px',
                  border:'1px solid #e5e7eb', borderRadius:10,
                  background:'#fff', color:'#374151',
                  fontSize:13, fontWeight:500, cursor:'pointer', outline:'none',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <span style={{
                position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', color:'#9ca3af',
              }}>
                <SvgFilter />
              </span>
            </div>

            {/* Clear filters */}
            {(search || filterObs || filterUser) && (
              <button
                onClick={() => { setSearch(''); setFilterObs(''); setFilterUser(''); }}
                style={{
                  background:'none', border:'1px solid #e5e7eb', borderRadius:8,
                  padding:'8px 13px', cursor:'pointer', fontSize:12, color:'#6b7280',
                  fontWeight:600,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Table ─────────────────────────────────────── */}
          <div style={{
            background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
            boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden',
            marginBottom:16,
          }}>
            {/* Table header */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'200px 160px 1fr 180px 110px 100px 130px',
              gap:0,
              background:'#f9fafb', borderBottom:'1px solid #e5e7eb',
              padding:'10px 20px',
            }}>
              {['User','Obstacle Type','Location','Detected At','Time Ago','Status','Action'].map(h => (
                <span key={h} style={{
                  fontSize:11, fontWeight:700, color:'#6b7280',
                  textTransform:'uppercase', letterSpacing:'0.06em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                padding:60, flexDirection:'column', gap:12,
              }}>
                <Spinner size={36} />
                <p style={{color:'#9ca3af',fontSize:14,margin:0}}>Loading alerts...</p>
              </div>
            ) : pageData.length === 0 ? (
              <div style={{
                display:'flex', flexDirection:'column', alignItems:'center',
                padding:'60px 0', gap:12,
              }}>
                <span style={{fontSize:40}}>✅</span>
                <p style={{fontWeight:700, fontSize:16, color:'#374151', margin:0}}>
                  {filtered.length === 0 && (search || filterObs || filterUser)
                    ? 'No alerts match your filters'
                    : 'No active alerts'}
                </p>
                <p style={{color:'#9ca3af', fontSize:13, margin:0}}>
                  All users are safe — great job!
                </p>
              </div>
            ) : (
              pageData.map((alert, idx) => {
                const addr = addresses[String(alert.id)];
                const [addrLine1, addrLine2] = addr
                  ? addr.split(',').reduce((acc, part, i) => {
                      if (i === 0) acc[0] = part.trim();
                      else acc[1] = (acc[1] ? acc[1] + ',' : '') + part.trim();
                      return acc;
                    }, ['',''])
                  : [`${alert.latitude?.toFixed(4)}, ${alert.longitude?.toFixed(4)}`, ''];

                const dt = formatDateTime(alert.createdAt).split('\n');

                return (
                  <div
                    key={alert.id}
                    style={{
                      display:'grid',
                      gridTemplateColumns:'200px 160px 1fr 180px 110px 100px 130px',
                      gap:0,
                      padding:'16px 20px',
                      borderBottom: idx < pageData.length - 1 ? '1px solid #f3f4f6' : 'none',
                      alignItems:'center',
                      transition:'background 0.1s',
                      cursor:'default',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* User */}
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <UserAvatar userId={alert.userId} name={alert.userName} />
                      <div>
                        <p style={{fontWeight:700, fontSize:13, color:'#111827', margin:0}}>
                          {alert.userName ?? `User #${alert.userId}`}
                        </p>
                        <p style={{fontSize:11, color:'#9ca3af', margin:0}}>
                          ID: U-{String(alert.userId).padStart(4,'0')}
                        </p>
                      </div>
                    </div>

                    {/* Obstacle */}
                    <ObstacleBadge type={alert.obstacleType} />

                    {/* Location */}
                    <div style={{display:'flex', alignItems:'flex-start', gap:6}}>
                      <span style={{color:'#9ca3af', marginTop:2, flexShrink:0}}>
                        <SvgPin />
                      </span>
                      <div>
                        {addr ? (
                          <>
                            <p style={{fontWeight:600, fontSize:13, color:'#374151', margin:0}}>
                              {addrLine1}
                            </p>
                            <p style={{fontSize:12, color:'#9ca3af', margin:0}}>
                              {addrLine2}
                            </p>
                          </>
                        ) : (
                          <p style={{fontSize:12, color:'#9ca3af', margin:0}}>
                            {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Detected At */}
                    <div style={{display:'flex', alignItems:'flex-start', gap:6}}>
                      <span style={{color:'#9ca3af', marginTop:2, flexShrink:0}}>
                        <SvgCalendar />
                      </span>
                      <div>
                        <p style={{fontSize:13, color:'#374151', fontWeight:600, margin:0}}>
                          {dt[0]}
                        </p>
                        <p style={{fontSize:12, color:'#9ca3af', margin:0}}>
                          {dt[1]}
                        </p>
                      </div>
                    </div>

                    {/* Time Ago */}
                    <p style={{fontSize:13, color:'#ef4444', fontWeight:700, margin:0}}>
                      {timeAgo(alert.createdAt)}
                    </p>

                    {/* Status badge */}
                    <span style={{
                      display:'inline-flex', alignItems:'center',
                      background:'#fef2f2', color:'#dc2626',
                      border:'1px solid #fecaca',
                      borderRadius:20, padding:'4px 12px',
                      fontSize:12, fontWeight:700,
                    }}>
                      Active
                    </span>

                    {/* Action */}
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      disabled={resolving === alert.id}
                      style={{
                        display:'flex', alignItems:'center', gap:6,
                        background: resolving === alert.id ? '#86efac' : '#16a34a',
                        color:'#fff', border:'none', borderRadius:8,
                        padding:'8px 14px', fontSize:13, fontWeight:700,
                        cursor: resolving === alert.id ? 'not-allowed' : 'pointer',
                        transition:'background 0.15s',
                        boxShadow:'0 2px 6px rgba(22,163,74,0.25)',
                      }}
                      onMouseEnter={e => {
                        if (resolving !== alert.id)
                          e.currentTarget.style.background = '#15803d';
                      }}
                      onMouseLeave={e => {
                        if (resolving !== alert.id)
                          e.currentTarget.style.background = '#16a34a';
                      }}
                    >
                      <SvgCheck />
                      {resolving === alert.id ? '…' : 'Resolve'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Pagination ───────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:20,
            }}>
              <p style={{fontSize:13,color:'#6b7280',margin:0}}>
                Showing {currentPage * PAGE_SIZE + 1} to{' '}
                {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
              </p>
              <div style={{display:'flex', alignItems:'center', gap:6}}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    width:34, height:34, borderRadius:8, border:'1px solid #e5e7eb',
                    background:'#fff', cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity: currentPage === 0 ? 0.4 : 1,
                  }}
                >
                  <SvgChevronL />
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    style={{
                      width:34, height:34, borderRadius:8, border:'none',
                      background: i === currentPage ? '#2563eb' : '#fff',
                      color: i === currentPage ? '#fff' : '#374151',
                      border: i === currentPage ? 'none' : '1px solid #e5e7eb',
                      cursor:'pointer', fontWeight:700, fontSize:13,
                    }}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    width:34, height:34, borderRadius:8, border:'1px solid #e5e7eb',
                    background:'#fff', cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity: currentPage >= totalPages - 1 ? 0.4 : 1,
                  }}
                >
                  <SvgChevronR />
                </button>
              </div>
            </div>
          )}

          {/* ── Info card ─────────────────────────────────── */}
          <div style={{
            background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:14,
            padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:12,
          }}>
            <div style={{flexShrink:0, marginTop:1}}>
              <SvgInfo />
            </div>
            <div>
              <p style={{fontWeight:700, fontSize:14, color:'#1e40af', margin:'0 0 3px'}}>
                What do active alerts mean?
              </p>
              <p style={{fontSize:13, color:'#3b82f6', margin:0, lineHeight:1.55}}>
                These alerts are generated in real time when a user encounters an obstacle
                or sends an SOS. You can resolve an alert once the user is safe or no
                longer needs assistance.
              </p>
            </div>
          </div>

        </main>
      </div>

      <Toaster position="top-right" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </div>
  );
}