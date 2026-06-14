/**
 * ReportsPage.jsx — AssistWalk Admin
 * 100% data-driven. No hardcoded values. Empty states when no data.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api, { API_BASE } from '../../api/axiosInstance';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

// ── Palette ─────────────────────────────────────────────────
const C = {
  blue:        '#2563eb',
  blueLight:   '#eff6ff',
  blueMid:     '#bfdbfe',
  green:       '#16a34a',
  greenLight:  '#f0fdf4',
  greenMid:    '#bbf7d0',
  orange:      '#f59e0b',
  orangeLight: '#fffbeb',
  orangeMid:   '#fde68a',
  gray:        '#6b7280',
  grayLight:   '#f9fafb',
  grayMid:     '#e5e7eb',
  red:         '#dc2626',
  redLight:    '#fef2f2',
  teal:        '#0891b2',
  tealLight:   '#f0f9ff',
  violet:      '#7c3aed',
  violetLight: '#f5f3ff',
};
const CHART_PALETTE = [C.blue, C.green, C.orange, C.gray, C.teal, C.violet, C.red];

// ── Helpers ──────────────────────────────────────────────────
function fmtDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${h}h ${String(m % 60).padStart(2, '0')}m`;
}
function displayName(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return (p + ' ' + n).trim() || u?.email?.split('@')[0] || 'Admin';
}
function initials(u) {
  return displayName(u).split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function resolvePhoto(u) {
  const url = u?.photoUrl;
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}
const AV_PALETTE = [C.blue, C.violet, C.red, C.orange, C.green, C.teal];
function avColor(id) { return AV_PALETTE[(id || 0) % AV_PALETTE.length]; }

// ── Icons ────────────────────────────────────────────────────
const ic = (d, w = 18, h = 18) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: w, height: h, flexShrink: 0 }}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const IcHome    = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink    = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar     = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcUser    = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 14, 14);
const IcMenu    = () => <svg viewBox="0 0 24 24" fill="none" width="17" height="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcBell    = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>);
const IcZap     = ic(<><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></>);
const IcActivity= ic(<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>);
const IcTriangle= ic(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>);
const IcTrendUp = ic(<><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></>);
const IcMapPin  = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>);

// ── Spinner ──────────────────────────────────────────────────
function Spinner({ size = 32 }) {
  return (
    <svg style={{ width: size, height: size, animation: 'spin 0.9s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4" />
      <path fill={C.blue} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Avatar ───────────────────────────────────────────────────
function Avatar({ user, size = 28 }) {
  const [err, setErr] = useState(false);
  const photo = resolvePhoto(user);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: photo && !err ? 'transparent' : avColor(user?.id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size > 34 ? 13 : 10,
    }}>
      {photo && !err
        ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} />
        : initials(user)}
    </div>
  );
}

// ── Profile Dropdown ─────────────────────────────────────────
function ProfileDropdown({ profile, onClose }) {
  const navigate = useNavigate();
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 224, zIndex: 91, overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={profile} size={38} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(profile)}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || ''}</p>
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
          style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: C.red, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = C.redLight}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IcLogout /> Logout
        </button>
      </div>
    </>
  );
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ Icon, iconBg, iconColor, label, value, sub, loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</p>
        {loading
          ? <div style={{ height: 24, width: 52, background: '#f3f4f6', borderRadius: 6 }} />
          : <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{value ?? '—'}</p>}
        {sub && !loading && <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────
function SectionCard({ title, sub, right, children, minH }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 16,
      minHeight: minH,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</p>
          {sub && <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────
function EmptyState({ height = 160, msg = 'No data available' }) {
  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
        <IcActivity />
      </div>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{msg}</p>
    </div>
  );
}

// ── Smooth Area Chart ─────────────────────────────────────────
function AreaChart({ data, height = 240 }) {
  if (!data || data.length < 2) return <EmptyState height={height} msg="Not enough history to display" />;

  const W = 700, H = height - 48, PAD_LEFT = 28;
  const max = Math.max(...data.map(d => d.value), 1);
  const xs = data.map((_, i) => PAD_LEFT + (i / (data.length - 1)) * (W - PAD_LEFT));
  const ys = data.map(d => H - (d.value / max) * (H - 8));
  const pts = data.map((d, i) => ({ x: xs[i], y: ys[i], ...d }));

  // Catmull-Rom → cubic bezier control points (tension 0.35)
  const tension = 0.35;
  let linePath = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: H - f * (H - 8) + 4,
    v: Math.round(f * max),
  }));

  const every = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.blue} stopOpacity="0.18" />
            <stop offset="100%" stopColor={C.blue} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {gridY.map((g, i) => (
          <g key={i}>
            <line x1={PAD_LEFT} y1={g.y} x2={W} y2={g.y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD_LEFT - 4} y={g.y + 4} textAnchor="end" fontSize={9} fill="#c4c9d4">{g.v}</text>
          </g>
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke={C.blue} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={C.blue} stroke="#fff" strokeWidth={2} />
            {i % every === 0 && (
              <text x={p.x} y={H + 20} textAnchor="middle" fontSize={9} fill="#9ca3af">{p.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Doughnut Chart ────────────────────────────────────────────
function DonutChart({ segments, size = 120, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - 22) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={22} />
          {centerLabel && <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={15} fontWeight={800} fill="#d1d5db">{centerLabel}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#d1d5db">{centerSub}</text>
          </>}
        </svg>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>No data available</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ, gap = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={22}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          );
          offset += pct;
          return el;
        })}
        {centerLabel && <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={15} fontWeight={800} fill="#111827">{centerLabel}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#9ca3af">{centerSub}</text>
        </>}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seg.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{seg.value}</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{((seg.value / total) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${(seg.value / total) * 100}%`, height: '100%', background: seg.color, borderRadius: 2, transition: 'width 0.6s' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal Bar ────────────────────────────────────────────
function HBar({ label, value, max, displayValue, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 10 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', flexShrink: 0 }}>{displayValue ?? value}</span>
      </div>
      <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
}

// ── Vertical Bar Chart ────────────────────────────────────────
function VBarChart({ data, height = 170, valueFormatter }) {
  if (!data || data.every(d => d.value === 0)) return <EmptyState height={height} />;
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = Math.min(52, Math.floor(580 / data.length) - 12);
  const W = data.length * (bw + 16), H = height - 32;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
      {[0, 0.5, 1].map((f, i) => (
        <g key={i}>
          <line x1={0} y1={H - f * H} x2={W} y2={H - f * H} stroke="#f1f5f9" strokeWidth={1} />
          <text x={-4} y={H - f * H + 4} textAnchor="end" fontSize={8} fill="#c4c9d4">
            {valueFormatter ? valueFormatter(Math.round(f * max)) : Math.round(f * max)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const bH = Math.max((d.value / max) * H, d.value > 0 ? 2 : 0);
        const x = i * (bw + 16) + 8;
        const y = H - bH;
        const isMax = d.value === max && d.value > 0;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bH} rx={5}
              fill={isMax ? C.blue : '#dbeafe'} />
            {d.value > 0 && (
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={9}
                fill={isMax ? '#1d4ed8' : '#6b7280'} fontWeight={isMax ? 700 : 500}>
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </text>
            )}
            <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Insight Pill ─────────────────────────────────────────────
function InsightPill({ icon, label, value, iconBg, iconColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 16px', background: '#f8fafc',
      borderRadius: 12, border: '1px solid #f1f5f9', flex: 1, minWidth: 0,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function ReportsPage() {
  const navigate = useNavigate();

  const [alerts,       setAlerts]       = useState([]);
  const [users,        setUsers]        = useState([]);
  const [associations, setAssociations] = useState([]);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [profOpen,     setProfOpen]     = useState(false);
  const [collapsed, toggleSidebar] = useSidebarState();

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/admin/alerts'),
      api.get('/api/v1/admin/users'),
      api.get('/api/v1/admin/associations'),
      api.get('/api/v1/users/me'),
    ])
      .then(([ar, ur, assr, pr]) => {
        setAlerts(ar.data);
        setUsers(ur.data);
        setAssociations(assr.data);
        setProfile(pr.data);
      })
      .catch(() => toast.error('Failed to load report data.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data — all from real API ──────────────────────
  const resolved   = useMemo(() => alerts.filter(a => a.status === 'RESOLVED'), [alerts]);
  const active     = useMemo(() => alerts.filter(a => a.status === 'ACTIVE'),   [alerts]);
  const companions = useMemo(() => users.filter(u => u.role === 'COMPANION'),   [users]);
  const viUsers    = useMemo(() => users.filter(u => u.role === 'VISUAL_IMPAIRED'), [users]);
  const total      = alerts.length;

  const avgResMs = useMemo(() => {
    const w = resolved.filter(a => a.createdAt && a.resolvedAt);
    if (!w.length) return null;
    return w.reduce((s, a) => s + (new Date(a.resolvedAt) - new Date(a.createdAt)), 0) / w.length;
  }, [resolved]);

  // Alerts over time — daily buckets, last 30 days (includes zero-count days)
  const alertsOverTime = useMemo(() => {
    const now = new Date();
    const days = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days[key] = 0;
    }
    alerts.forEach(a => {
      if (!a.createdAt) return;
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (Object.prototype.hasOwnProperty.call(days, key)) days[key]++;
    });
    return Object.entries(days).map(([key, value]) => {
      const d = new Date(key + 'T00:00:00');
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
      };
    });
  }, [alerts]);

  // Obstacle frequency
  const obstacleStats = useMemo(() => {
    const c = {};
    alerts.forEach(a => { if (a.obstacleType) c[a.obstacleType] = (c[a.obstacleType] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], i) => ({
      label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      rawLabel: label,
      value,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }));
  }, [alerts, total]);

  // Status donut segments
  const statusSegs = useMemo(() => [
    { label: 'Resolved', value: resolved.length, color: C.green  },
    { label: 'Active',   value: active.length,   color: C.orange },
  ].filter(s => s.value > 0), [resolved, active]);

  // Time of day (6 slots of 4h each)
  const timeOfDay = useMemo(() => {
    const slots = [
      { label: '00-04', min: 0,  max: 4,  value: 0 },
      { label: '04-08', min: 4,  max: 8,  value: 0 },
      { label: '08-12', min: 8,  max: 12, value: 0 },
      { label: '12-16', min: 12, max: 16, value: 0 },
      { label: '16-20', min: 16, max: 20, value: 0 },
      { label: '20-24', min: 20, max: 24, value: 0 },
    ];
    alerts.forEach(a => {
      const h = a.createdAt ? new Date(a.createdAt).getHours() : null;
      if (h === null) return;
      const slot = slots.find(s => h >= s.min && h < s.max);
      if (slot) slot.value++;
    });
    return slots;
  }, [alerts]);

  // Resolution time by obstacle type
  const resByObstacle = useMemo(() => {
    const d = {};
    resolved.forEach(a => {
      if (!a.createdAt || !a.resolvedAt || !a.obstacleType) return;
      const k = a.obstacleType;
      if (!d[k]) d[k] = { total: 0, count: 0 };
      d[k].total += new Date(a.resolvedAt) - new Date(a.createdAt);
      d[k].count++;
    });
    return Object.entries(d)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 7)
      .map(([label, { total: t, count }]) => ({
        label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: Math.round(t / count),
      }));
  }, [resolved]);

  const maxResTime = resByObstacle.length > 0 ? Math.max(...resByObstacle.map(r => r.value)) : 0;

  // Coverage
  const coveredSet     = useMemo(() => new Set(associations.map(a => a.malvoyantId)), [associations]);
  const coverageRate   = viUsers.length > 0 ? Math.round((viUsers.filter(u => coveredSet.has(u.id)).length / viUsers.length) * 100) : 0;
  const unmonitored    = viUsers.filter(u => !coveredSet.has(u.id)).length;

  // Peak time
  const peakSlot = useMemo(() => {
    const max = Math.max(...timeOfDay.map(s => s.value));
    return max > 0 ? timeOfDay.find(s => s.value === max) : null;
  }, [timeOfDay]);

  // ── Sidebar items (no Active Alerts for admin) ────────────
  const sidebarItems = [
    { Icon: IcHome,  label: 'Dashboard',    path: '/admin' },
    { Icon: IcUsers, label: 'Users',        path: '/admin/users' },
    { Icon: IcLink,  label: 'Associations', path: '/admin/associations' },
    { Icon: IcBar,   label: 'Reports',      path: '/admin/reports' },
    { Icon: IcUser,  label: 'My Profile',   path: '/profile' },
  ];

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'row',
      background: '#f8fafc', overflow: 'hidden',
      fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
      <Sidebar collapsed={collapsed} onToggle={() => toggleSidebar()} items={sidebarItems} />

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
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Reports</span>
            </nav>
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setProfOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb',
              borderRadius: 9, padding: '5px 10px 5px 6px', cursor: 'pointer',
              background: profOpen ? '#f9fafb' : '#fff',
            }}
              onMouseEnter={e => !profOpen && (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => !profOpen && (e.currentTarget.style.background = '#fff')}>
              <Avatar user={profile} size={24} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName(profile)}
              </span>
              <span style={{ color: '#9ca3af' }}><IcChevD /></span>
            </button>
            {profOpen && <ProfileDropdown profile={profile} onClose={() => setProfOpen(false)} />}
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 52px' }}>

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 3px', letterSpacing: '-0.4px' }}>Reports</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Performance metrics and analytics — all data from backend.</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 460, flexDirection: 'column', gap: 16 }}>
              <Spinner size={40} />
              <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Loading analytics…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* ── ROW 1: 4 KPI Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <KpiCard
                  Icon={IcBell} iconBg={C.blueLight} iconColor={C.blue}
                  label="Total Alerts" value={total}
                  sub={total > 0 ? `${active.length} still active` : undefined}
                  loading={loading}
                />
                <KpiCard
                  Icon={IcShield} iconBg={C.greenLight} iconColor={C.green}
                  label="Resolved Alerts" value={resolved.length}
                  sub={total > 0 ? `${((resolved.length / total) * 100).toFixed(1)}% resolution rate` : undefined}
                  loading={loading}
                />
                <KpiCard
                  Icon={IcClock} iconBg={C.orangeLight} iconColor={C.orange}
                  label="Avg Resolution Time" value={fmtDuration(avgResMs)}
                  sub={resolved.length > 0 ? `across ${resolved.length} resolved` : 'No resolved alerts yet'}
                  loading={loading}
                />
                <KpiCard
                  Icon={IcUsers} iconBg={C.tealLight} iconColor={C.teal}
                  label="Active Companions" value={companions.length}
                  sub={viUsers.length > 0 ? `${coverageRate}% coverage` : undefined}
                  loading={loading}
                />
              </div>

              {/* ── ROW 2: Area Chart (65%) + Obstacles Donut (35%) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>

                <SectionCard
                  title="Alerts Over Time"
                  sub="Monthly SOS alerts — full history"
                  right={
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', padding: '3px 9px', borderRadius: 6 }}>
                      Monthly
                    </span>
                  }
                  minH={300}
                >
                  <AreaChart data={alertsOverTime} height={240} />
                </SectionCard>

                <SectionCard
                  title="Most Frequent Obstacles"
                  sub="Ranked by alert count"
                  minH={300}
                >
                  {obstacleStats.length === 0
                    ? <EmptyState height={220} />
                    : <DonutChart
                        segments={obstacleStats}
                        size={110}
                        centerLabel={`${obstacleStats.length}`}
                        centerSub="types"
                      />
                  }
                </SectionCard>
              </div>

              {/* ── ROW 3: Status Donut + Resolution Time + Time of Day ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.2fr', gap: 16 }}>

                {/* Alerts By Status */}
                <SectionCard title="Alerts by Status" sub="Resolved vs active">
                  {total === 0
                    ? <EmptyState height={180} />
                    : <DonutChart
                        segments={statusSegs}
                        size={110}
                        centerLabel={total > 0 ? `${((resolved.length / total) * 100).toFixed(0)}%` : '—'}
                        centerSub="resolved"
                      />
                  }
                </SectionCard>

                {/* Resolution Time by Obstacle */}
                <SectionCard title="Avg Resolution Time" sub="By obstacle type — resolved alerts only">
                  {resByObstacle.length === 0
                    ? <EmptyState height={180} msg="No resolved alerts yet" />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {resByObstacle.map((r, i) => (
                          <HBar key={i}
                            label={r.label}
                            value={r.value}
                            max={maxResTime}
                            displayValue={fmtDuration(r.value)}
                            color={i === 0 ? C.orange : '#fed7aa'}
                          />
                        ))}
                      </div>
                    )
                  }
                </SectionCard>

                {/* Alerts by Time of Day */}
                <SectionCard title="Alerts by Time of Day" sub="6-hour slots — all alerts">
                  {total === 0
                    ? <EmptyState height={180} />
                    : <VBarChart data={timeOfDay} height={180} />
                  }
                </SectionCard>
              </div>

              {/* ── ROW 4: Summary Insights (only shown when data exists) ── */}
              {(total > 0 || companions.length > 0 || viUsers.length > 0) && (
                <SectionCard title="Summary Insights" sub="Key metrics at a glance — computed from real data">
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {obstacleStats[0] && (
                      <InsightPill
                        icon={<IcTriangle />}
                        label="Top obstacle"
                        value={`${obstacleStats[0].label} (${obstacleStats[0].pct}%)`}
                        iconBg={C.orangeLight}
                        iconColor={C.orange}
                      />
                    )}
                    {total > 0 && (
                      <InsightPill
                        icon={<IcTrendUp />}
                        label="Resolution rate"
                        value={`${((resolved.length / total) * 100).toFixed(1)}%`}
                        iconBg={C.greenLight}
                        iconColor={C.green}
                      />
                    )}
                    {viUsers.length > 0 && (
                      <InsightPill
                        icon={<IcMapPin />}
                        label="User coverage"
                        value={`${coverageRate}% (${viUsers.length - unmonitored}/${viUsers.length} monitored)`}
                        iconBg={C.tealLight}
                        iconColor={C.teal}
                      />
                    )}
                    {peakSlot && peakSlot.value > 0 && (
                      <InsightPill
                        icon={<IcZap />}
                        label="Peak alert time"
                        value={`${peakSlot.label}h (${peakSlot.value} alert${peakSlot.value !== 1 ? 's' : ''})`}
                        iconBg={C.blueLight}
                        iconColor={C.blue}
                      />
                    )}
                    {companions.length > 0 && (
                      <InsightPill
                        icon={<IcActivity />}
                        label="Active companions"
                        value={`${companions.length} companion${companions.length !== 1 ? 's' : ''}`}
                        iconBg={C.violetLight}
                        iconColor={C.violet}
                      />
                    )}
                  </div>
                </SectionCard>
              )}

            </div>
          )}
        </main>
      </div>

      <Toaster position="top-right" toastOptions={{ style: { fontSize: 13, fontWeight: 600 } }} />
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
