import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { logout } from '../utils/auth';

// ─── Helpers ──────────────────────────────────────────────────

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
  uneven_sidewalk:  { emoji: '⚠️', color: '#d97706', bg: '#fffbeb', label: 'Uneven Sidewalk' },
  pothole:          { emoji: '🕳️', color: '#dc2626', bg: '#fef2f2', label: 'Pothole'         },
};

function obstacleMeta(type) {
  if (!type) return { emoji: '🚨', color: '#ef4444', bg: '#fef2f2', label: 'Unknown' };
  const key = type.toLowerCase().replace(/ /g, '_');
  return OBSTACLE_META[key] ?? {
    emoji: '🚨', color: '#6b7280', bg: '#f3f4f6', label: type,
  };
}

function formatDateTime(dateStr) {
  if (!dateStr) return { date: '—', time: '' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    }),
  };
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
  } catch {
    return null;
  }
}

const PAGE_SIZE = 7;

// ─── SVG Icons ─────────────────────────────────────────────────

const SvgHome      = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const SvgBell      = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const SvgClock     = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>;
const SvgUser      = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const SvgSearch    = () => <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}} stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const SvgChevronD  = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2"><polyline points="4,6 8,10 12,6"/></svg>;
const SvgChevronH  = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="#9ca3af" strokeWidth="2"><polyline points="4,6 8,10 12,6"/></svg>;
const SvgChevronL  = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,4 6,8 10,12"/></svg>;
const SvgChevronR  = () => <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6,4 10,8 6,12"/></svg>;
const SvgCalendar  = () => <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const SvgPin       = () => <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const SvgLogout    = () => <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SvgDownload  = () => <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SvgInfo      = () => <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const SvgHelp      = () => <svg viewBox="0 0 24 24" fill="none" style={{width:17,height:17}} stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const SvgFilter    = () => <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;
const SvgCheckCircle = () => <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}} stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9,12 11,14 15,10"/></svg>;
const SvgXCircle   = () => <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}} stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;

// ─── Sub-components ────────────────────────────────────────────

function NavItem({ Icon, label, active, badge, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 13px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: active ? '#2563eb' : hov ? '#f3f4f6' : 'transparent',
        color: active ? '#fff' : hov ? '#111827' : '#6b7280',
        fontWeight: 600, fontSize: 14, textAlign: 'left',
        transition: 'all 0.15s',
        boxShadow: active ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
      }}
    >
      <Icon />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? '#fff' : '#ef4444',
          color: active ? '#2563eb' : '#fff',
          fontSize: 11, fontWeight: 800,
          width: 20, height: 20, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Select({ value, onChange, options, placeholder, style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          width: '100%', padding: '9px 36px 9px 13px',
          border: '1px solid #e5e7eb', borderRadius: 10,
          background: '#fff',
          color: value ? '#111827' : '#9ca3af',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span style={{
        position: 'absolute', right: 10, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af',
      }}>
        <SvgChevronD />
      </span>
    </div>
  );
}

function ObstacleBadge({ type }) {
  const m = obstacleMeta(type);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: m.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, border: `1px solid ${m.color}22`,
      }}>
        {m.emoji}
      </div>
      <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
        {m.label}
      </span>
    </div>
  );
}

function UserAvatar({ userId, name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : `U${String(userId).slice(-1)}`;
  const colors = ['#2563eb', '#7c3aed', '#dc2626', '#d97706', '#16a34a', '#0891b2'];
  const color  = colors[Number(userId) % colors.length];
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Spinner({ size = 24 }) {
  return (
    <svg style={{ width: size, height: size, animation: 'spin 1s linear infinite' }}
         viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4"/>
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const resolved = status === 'RESOLVED';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: resolved ? '#f0fdf4' : '#fef2f2',
      color:      resolved ? '#16a34a' : '#dc2626',
      border:     `1px solid ${resolved ? '#bbf7d0' : '#fecaca'}`,
      borderRadius: 20, padding: '4px 12px',
      fontSize: 12, fontWeight: 700,
    }}>
      {resolved ? <SvgCheckCircle /> : <SvgXCircle />}
      {resolved ? 'Resolved' : 'Unresolved'}
    </span>
  );
}

// ─── Main ──────────────────────────────────────────────────────

export default function HistoryPage() {
  const navigate = useNavigate();

  const [allAlerts,   setAllAlerts]   = useState([]);
  const [addresses,   setAddresses]   = useState({});
  const [profile,     setProfile]     = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // Filters
  const [search,      setSearch]      = useState('');
  const [filterObs,   setFilterObs]   = useState('');
  const [filterUser,  setFilterUser]  = useState('');
  const [filterStatus,setFilterStatus]= useState('');
  const [sortKey,     setSortKey]     = useState('newest');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [page,        setPage]        = useState(0);

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/v1/alerts/active');
        // L'endpoint retourne les alertes actives ; pour l'historique
        // on les inclut toutes — l'admin verra résolu + actif
        setAllAlerts(data);
        setActiveCount(data.filter(a => a.status === 'ACTIVE').length);
        data.forEach(geocodeAlert);
      } catch {
        // silently fail — table will show empty state
      } finally {
        setLoading(false);
      }

      try {
        const { data } = await api.get('/api/v1/users/me');
        setProfile(data);
      } catch { /* endpoint optionnel */ }
    };
    load();
  }, []);

  const geocodeAlert = async (alert) => {
    if (!alert.latitude || !alert.longitude) return;
    const key = String(alert.id);
    const addr = await reverseGeocode(alert.latitude, alert.longitude);
    if (addr) setAddresses(prev => ({ ...prev, [key]: addr }));
  };

  // ── Filter options ────────────────────────────────────────
  const obstacleOptions = useMemo(() => {
    const types = [...new Set(allAlerts.map(a => a.obstacleType).filter(Boolean))];
    return types.map(t => ({ value: t, label: obstacleMeta(t).label }));
  }, [allAlerts]);

  const userOptions = useMemo(() => {
    const ids = [...new Set(allAlerts.map(a => a.userId))];
    return ids.map(id => ({ value: String(id), label: `User #${id}` }));
  }, [allAlerts]);

  const statusOptions = [
    { value: 'ACTIVE',   label: 'Active'   },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  // ── Filter + sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allAlerts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        String(a.userId).includes(q) ||
        (a.obstacleType ?? '').toLowerCase().includes(q) ||
        (addresses[String(a.id)] ?? '').toLowerCase().includes(q)
      );
    }
    if (filterObs)    list = list.filter(a => a.obstacleType === filterObs);
    if (filterUser)   list = list.filter(a => String(a.userId) === filterUser);
    if (filterStatus) list = list.filter(a => a.status === filterStatus);
    if (dateFrom)     list = list.filter(a =>
      new Date(a.createdAt) >= new Date(dateFrom));
    if (dateTo)       list = list.filter(a =>
      new Date(a.createdAt) <= new Date(dateTo + 'T23:59:59'));

    list.sort((a, b) => sortKey === 'newest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [allAlerts, search, filterObs, filterUser, filterStatus,
      dateFrom, dateTo, sortKey, addresses]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData    = filtered.slice(
    currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE
  );

  useEffect(() => setPage(0),
    [search, filterObs, filterUser, filterStatus, dateFrom, dateTo, sortKey]);

  // ── Profile ───────────────────────────────────────────────
  const firstName   = profile?.prenom ?? profile?.firstName ?? '';
  const lastName    = profile?.nom    ?? profile?.lastName  ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Companion';
  const initials    = displayName.split(' ').map(w => w[0])
                        .join('').slice(0,2).toUpperCase() || 'C';

  // ── Export CSV ────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['ID','User','Obstacle','Location',
                     'Detected At','Resolved At','Status'];
    const rows = filtered.map(a => [
      a.id, `User #${a.userId}`,
      obstacleMeta(a.obstacleType).label,
      addresses[String(a.id)] ?? `${a.latitude},${a.longitude}`,
      new Date(a.createdAt).toLocaleString('en-US'),
      a.resolvedAt ? new Date(a.resolvedAt).toLocaleString('en-US') : '—',
      a.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'assistwalk-history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#f8fafc', overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <header style={{
        height: 62, background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 22, height: 22 }}>
              <circle cx="12" cy="4.5" r="2.2"/>
              <path d="M8.5 11.5l-1.5 4h2l1-2.5 1.5 1.5V20h2v-5.5l-2-2
                       .8-2.5 1.7 1.5H17V9.5h-2.5L13 8l-1 1-1-1-2 3.5z"/>
            </svg>
          </div>
          <span style={{
            fontWeight: 800, fontSize: 17, color: '#111827',
            letterSpacing: '-0.4px',
          }}>
            Assist<span style={{ color: '#2563eb' }}>Walk</span>
          </span>
          <span style={{ color: '#e5e7eb', margin: '0 8px' }}>|</span>
          <span style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>
            Companion Dashboard
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Profile dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '5px 8px', borderRadius: 10,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#2563eb',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
                {initials}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: '#111827',
                  margin: 0, lineHeight: 1.2,
                }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                  Accompagnateur
                </p>
              </div>
              <SvgChevronH />
            </button>

            {profileOpen && (
              <>
                <div onClick={() => setProfileOpen(false)}
                     style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  minWidth: 200, zIndex: 50, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
                  }}>
                    <p style={{
                      fontWeight: 700, fontSize: 14, margin: 0, color: '#111827',
                    }}>
                      {displayName}
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                      {profile?.email ?? ''}
                    </p>
                  </div>
                  <div style={{ padding: 8 }}>
                    <button onClick={logout} style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: 8, padding: '9px 12px', borderRadius: 8,
                      border: 'none', cursor: 'pointer',
                      background: 'none', color: '#ef4444',
                      fontSize: 13, fontWeight: 600,
                    }}>
                      <SvgLogout /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '7px 13px', background: 'none',
            cursor: 'pointer', color: '#6b7280', fontSize: 13, fontWeight: 600,
          }}>
            <SvgLogout /> Logout
          </button>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── SIDEBAR ────────────────────────────────────── */}
        <aside style={{
          width: 200, background: '#fff', borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          padding: '14px 10px', gap: 2,
        }}>
          <NavItem Icon={SvgHome}  label="Dashboard"
            active={false} onClick={() => navigate('/dashboard')} />
          <NavItem Icon={SvgBell}  label="Active Alerts"
            active={false} badge={activeCount}
            onClick={() => navigate('/map')} />
          <NavItem Icon={SvgClock} label="History"
            active={true} onClick={() => {}} />
          <NavItem Icon={SvgUser}  label="My Profile"
            active={false} onClick={() => setProfileOpen(true)} />

          <div style={{ flex: 1 }}/>

          {/* Help card */}
          <div style={{
            background: '#eff6ff', borderRadius: 14,
            padding: '12px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#2563eb', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SvgHelp />
            </div>
            <div>
              <p style={{
                fontSize: 12, fontWeight: 700, color: '#1e40af', margin: 0,
              }}>
                Need help?
              </p>
              <a href="#" style={{
                fontSize: 11, color: '#3b82f6', textDecoration: 'none',
              }}>
                Contact support
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN ───────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>

          {/* Page header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', marginBottom: 24,
          }}>
            <div>
              <h1 style={{
                fontSize: 24, fontWeight: 800, color: '#111827',
                margin: '0 0 4px', letterSpacing: '-0.5px',
              }}>
                History
              </h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                View and track all past alerts and their resolution status.
              </p>
            </div>

            {/* Export button */}
            <button
              onClick={exportCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: '9px 16px',
                cursor: 'pointer', color: '#374151',
                fontSize: 13, fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <SvgDownload /> Export History
            </button>
          </div>

          {/* ── Filters bar ──────────────────────────────── */}
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
            padding: '14px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>

            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 9, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }}>
                  <SvgCalendar />
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{
                    padding: '9px 10px 9px 28px',
                    border: '1px solid #e5e7eb', borderRadius: 10,
                    fontSize: 13, color: dateFrom ? '#111827' : '#9ca3af',
                    outline: 'none', cursor: 'pointer',
                  }}
                />
              </div>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 9, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }}>
                  <SvgCalendar />
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{
                    padding: '9px 10px 9px 28px',
                    border: '1px solid #e5e7eb', borderRadius: 10,
                    fontSize: 13, color: dateTo ? '#111827' : '#9ca3af',
                    outline: 'none', cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Obstacle filter */}
            <Select
              value={filterObs}
              onChange={setFilterObs}
              options={obstacleOptions}
              placeholder="All Obstacles"
              style={{ minWidth: 160 }}
            />

            {/* User filter */}
            <Select
              value={filterUser}
              onChange={setFilterUser}
              options={userOptions}
              placeholder="All Users"
              style={{ minWidth: 140 }}
            />

            {/* Status filter */}
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              placeholder="All Status"
              style={{ minWidth: 140 }}
            />

            {/* Sort */}
            <div style={{ position: 'relative', minWidth: 150 }}>
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value)}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  width: '100%', padding: '9px 36px 9px 13px',
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  background: '#fff', color: '#374151',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <span style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
                color: '#9ca3af',
              }}>
                <SvgFilter />
              </span>
            </div>

            {/* Clear */}
            {(search || filterObs || filterUser || filterStatus
              || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearch(''); setFilterObs(''); setFilterUser('');
                  setFilterStatus(''); setDateFrom(''); setDateTo('');
                }}
                style={{
                  background: 'none', border: '1px solid #e5e7eb',
                  borderRadius: 8, padding: '8px 13px',
                  cursor: 'pointer', fontSize: 12, color: '#6b7280',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Table ─────────────────────────────────────── */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden', marginBottom: 16,
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '190px 155px 1fr 165px 165px 130px',
              background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
              padding: '10px 20px',
            }}>
              {['User','Obstacle Type','Location',
                'Detected At','Resolved At','Status'].map(h => (
                <span key={h} style={{
                  fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                padding: 60, flexDirection: 'column', gap: 12,
              }}>
                <Spinner size={36} />
                <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
                  Loading history...
                </p>
              </div>
            ) : pageData.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '60px 0', gap: 12,
              }}>
                <span style={{ fontSize: 40 }}>📋</span>
                <p style={{
                  fontWeight: 700, fontSize: 16,
                  color: '#374151', margin: 0,
                }}>
                  No history records found
                </p>
                <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
                  Try adjusting your filters.
                </p>
              </div>
            ) : (
              pageData.map((alert, idx) => {
                const addr  = addresses[String(alert.id)];
                const parts = addr ? addr.split(',') : [];
                const line1 = parts[0]?.trim() ?? '';
                const line2 = parts.slice(1).join(',').trim();

                const det = formatDateTime(alert.createdAt);
                const res = formatDateTime(alert.resolvedAt);

                return (
                  <div
                    key={alert.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '190px 155px 1fr 165px 165px 130px',
                      padding: '15px 20px',
                      borderBottom: idx < pageData.length - 1
                        ? '1px solid #f3f4f6' : 'none',
                      alignItems: 'center',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e =>
                      e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e =>
                      e.currentTarget.style.background = 'transparent'}
                  >
                    {/* User */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <UserAvatar
                        userId={alert.userId} name={alert.userName}
                      />
                      <div>
                        <p style={{
                          fontWeight: 700, fontSize: 13,
                          color: '#111827', margin: 0,
                        }}>
                          {alert.userName ?? `User #${alert.userId}`}
                        </p>
                        <p style={{
                          fontSize: 11, color: '#9ca3af', margin: 0,
                        }}>
                          ID: U-{String(alert.userId).padStart(4, '0')}
                        </p>
                      </div>
                    </div>

                    {/* Obstacle */}
                    <ObstacleBadge type={alert.obstacleType} />

                    {/* Location */}
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 6,
                    }}>
                      <span style={{ color: '#9ca3af', marginTop: 2, flexShrink: 0 }}>
                        <SvgPin />
                      </span>
                      <div>
                        {addr ? (
                          <>
                            <p style={{
                              fontWeight: 600, fontSize: 13,
                              color: '#374151', margin: 0,
                            }}>
                              {line1}
                            </p>
                            <p style={{
                              fontSize: 12, color: '#9ca3af', margin: 0,
                            }}>
                              {line2}
                            </p>
                          </>
                        ) : (
                          <p style={{
                            fontSize: 12, color: '#9ca3af', margin: 0,
                          }}>
                            {alert.latitude?.toFixed(4)},{' '}
                            {alert.longitude?.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Detected At */}
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 6,
                    }}>
                      <span style={{ color: '#9ca3af', marginTop: 2, flexShrink: 0 }}>
                        <SvgCalendar />
                      </span>
                      <div>
                        <p style={{
                          fontSize: 13, color: '#374151',
                          fontWeight: 600, margin: 0,
                        }}>
                          {det.date}
                        </p>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                          {det.time}
                        </p>
                      </div>
                    </div>

                    {/* Resolved At */}
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 6,
                    }}>
                      <span style={{
                        color: alert.resolvedAt ? '#9ca3af' : '#d1d5db',
                        marginTop: 2, flexShrink: 0,
                      }}>
                        <SvgCalendar />
                      </span>
                      <div>
                        {alert.resolvedAt ? (
                          <>
                            <p style={{
                              fontSize: 13, color: '#374151',
                              fontWeight: 600, margin: 0,
                            }}>
                              {res.date}
                            </p>
                            <p style={{
                              fontSize: 12, color: '#9ca3af', margin: 0,
                            }}>
                              {res.time}
                            </p>
                          </>
                        ) : (
                          <p style={{
                            fontSize: 12, color: '#d1d5db',
                            fontStyle: 'italic', margin: 0,
                          }}>
                            Not yet resolved
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge status={alert.status} />
                  </div>
                );
              })
            )}
          </div>

          {/* ── Pagination ───────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 20,
            }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Showing {currentPage * PAGE_SIZE + 1} to{' '}
                {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}{' '}
                of {filtered.length} history record
                {filtered.length !== 1 ? 's' : ''}
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
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
                      width: 34, height: 34, borderRadius: 8,
                      border: i === currentPage
                        ? 'none' : '1px solid #e5e7eb',
                      background: i === currentPage ? '#2563eb' : '#fff',
                      color: i === currentPage ? '#fff' : '#374151',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    }}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                    cursor: currentPage >= totalPages - 1
                      ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
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
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}>
              <SvgInfo />
            </div>
            <div>
              <p style={{
                fontWeight: 700, fontSize: 14,
                color: '#1e40af', margin: '0 0 3px',
              }}>
                About History
              </p>
              <p style={{
                fontSize: 13, color: '#3b82f6',
                margin: 0, lineHeight: 1.55,
              }}>
                History includes all alerts that have been resolved or are
                no longer active. You can filter by date range, obstacle
                type, user, or status.
              </p>
            </div>
          </div>

        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1; border-radius: 3px;
        }
      `}</style>
    </div>
  );
}