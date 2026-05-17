/**
 * AssociationsPage.jsx — AssistWalk Admin
 * Clean, professional — no right panel, no ID column, SVG icons only
 *
 * APIs :
 *   GET    /api/v1/admin/associations      → list
 *   DELETE /api/v1/admin/associations/{id} → delete
 *   GET    /api/v1/admin/users             → to enrich rows
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}
function isThisMonth(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getMonth() === n.getMonth() && dt.getFullYear() === n.getFullYear();
}
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777','#059669'];
function avColor(id) { return COLORS[(id || 0) % COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  const full = (p + ' ' + n).trim() || u?.email || '?';
  return full.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return (p + ' ' + n).trim() || u?.email?.split('@')[0] || ('User #' + u?.id);
}
const PAGE_SIZE = 8;

// ── SVG Icons ─────────────────────────────────────────────────
function IcHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}
function IcUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IcLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function IcBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  );
}
function IcGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
function IcSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}}
         stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IcChevD() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="4,6 8,10 12,6"/>
    </svg>
  );
}
function IcPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}}
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IcTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}
function IcCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  );
}
function IcLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IcHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:17,height:17}}
         stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IcArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="14,7 19,12 14,17"/>
    </svg>
  );
}
function IcLinkSm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}
         stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function IcCal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}
         stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IcChevL() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="10,4 6,8 10,12"/>
    </svg>
  );
}
function IcChevR() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6,4 10,8 6,12"/>
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=24, light=false }) {
  return (
    <svg style={{width:size, height:size, animation:'spin 1s linear infinite'}}
         viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10"
        stroke={light ? 'rgba(255,255,255,0.3)' : '#bfdbfe'} strokeWidth="4"/>
      <path fill={light ? 'white' : '#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, size=38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avColor(user?.id), flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size > 40 ? 15 : 13,
      letterSpacing: '-0.5px',
    }}>
      {initials(user)}
    </div>
  );
}

// ── Sidebar NavItem ───────────────────────────────────────────
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
        fontWeight: 600, fontSize: 14, textAlign: 'left', transition: 'all 0.15s',
        boxShadow: active ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
      }}>
      <Icon />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? '#fff' : '#ef4444',
          color: active ? '#2563eb' : '#fff',
          fontSize: 11, fontWeight: 800, width: 20, height: 20,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ Icon, iconColor, bgIcon, label, value, sub, loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: bgIcon,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor, flexShrink: 0,
      }}>
        <Icon />
      </div>
      <div>
        <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, margin: '0 0 4px',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
        {loading
          ? <div style={{ height: 26, width: 44, background: '#f3f4f6', borderRadius: 6 }}/>
          : <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 2px', lineHeight: 1 }}>
              {value}
            </p>
        }
        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{sub}</p>
      </div>
    </div>
  );
}

// ── KPI Icons (24px) ──────────────────────────────────────────
function KicTotal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function KicActive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22,4 12,14.01 9,11.01"/>
    </svg>
  );
}
function KicCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24}}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function KicUsers() {
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

// ── Delete Modal ──────────────────────────────────────────────
function DeleteModal({ assoc, onClose, onConfirm, deleting }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.16)', padding: '32px 32px 28px',
        margin: '0 16px',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#fef2f2',
          border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', color: '#dc2626',
        }}>
          <IcTrash />
        </div>

        <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 800,
                     color: '#111827', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
          Remove Association
        </h2>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280',
                    margin: '0 0 6px', lineHeight: 1.6 }}>
          Are you sure you want to remove the association between
        </p>

        {/* Users preview */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, margin: '14px 0 24px',
          padding: '14px', background: '#f8fafc', borderRadius: 12,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar user={assoc?.malvoyant} size={32}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {displayName(assoc?.malvoyant)}
            </span>
          </div>
          <div style={{ color: '#2563eb' }}><IcLinkSm /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar user={assoc?.accompagnateur} size={32}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {displayName(assoc?.accompagnateur)}
            </span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: '0 0 24px' }}>
          This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e5e7eb',
            background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: '#374151', transition: 'all 0.15s',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex: 1, padding: '11px', borderRadius: 10, border: 'none',
            background: deleting ? '#fca5a5' : '#dc2626', color: '#fff',
            cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
          }}>
            {deleting && <Spinner size={16} light />}
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function AssociationsPage() {
  const navigate = useNavigate();

  const [assocs,       setAssocs]       = useState([]);
  const [users,        setUsers]        = useState([]);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [delModal,     setDelModal]     = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterComp,   setFilterComp]   = useState('');
  const [page,         setPage]         = useState(0);

  // ── Load ────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [ar, ur] = await Promise.all([
        api.get('/api/v1/admin/associations'),
        api.get('/api/v1/admin/users'),
      ]);
      setAssocs(ar.data);
      setUsers(ur.data);
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
    try { const { data } = await api.get('/api/v1/users/me'); setProfile(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  // ── Computed ────────────────────────────────────────────────
  const companions  = users.filter(u => u.role === 'COMPANION');
  const thisMonth   = assocs.filter(a => isThisMonth(a.createdAt)).length;
  const userById    = id => users.find(u => u.id === id) || null;

  const enriched = useMemo(() => assocs.map(a => ({
    ...a,
    malvoyant:      userById(a.malvoyantId),
    accompagnateur: userById(a.accompagnateurId),
  })), [assocs, users]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        displayName(a.malvoyant).toLowerCase().includes(q)      ||
        displayName(a.accompagnateur).toLowerCase().includes(q) ||
        (a.malvoyant?.email      || '').toLowerCase().includes(q) ||
        (a.accompagnateur?.email || '').toLowerCase().includes(q)
      );
    }
    if (filterComp) list = list.filter(a => String(a.accompagnateurId) === filterComp);
    return list;
  }, [enriched, search, filterComp]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage    = Math.min(page, totalPages - 1);
  const pageData   = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  useEffect(() => setPage(0), [search, filterComp]);

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delModal) return;
    setDeleting(true);
    try {
      await api.delete('/api/v1/admin/associations/' + delModal.id);
      toast.success('Association removed.');
      setDelModal(null);
      load();
    } catch { toast.error('Failed to remove association.'); }
    finally { setDeleting(false); }
  };

  // ── Profile ─────────────────────────────────────────────────
  const adminName  = displayName(profile) || 'Administrator';
  const adminInit  = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'A';

  // ─────────────────────────────────────────────────────────────
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 22, height: 22 }}>
              <circle cx="12" cy="4.5" r="2.2"/>
              <path d="M8.5 11.5l-1.5 4h2l1-2.5 1.5 1.5V20h2v-5.5l-2-2 .8-2.5 1.7 1.5H17V9.5h-2.5L13 8l-1 1-1-1-2 3.5z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#111827', letterSpacing: '-0.4px' }}>
            Assist<span style={{ color: '#2563eb' }}>Walk</span>
          </span>
          <span style={{ color: '#e5e7eb', margin: '0 10px' }}>|</span>
          <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500 }}>Admin Dashboard</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13,
          }}>{adminInit}</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
              {adminName}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Administrator</p>
          </div>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px',
            background: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13,
            fontWeight: 600, marginLeft: 8,
          }}>
            <IcLogout /> Logout
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ══ SIDEBAR ═════════════════════════════════════════ */}
        <aside style={{
          width: 200, background: '#fff', borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          padding: '14px 10px', gap: 2,
        }}>
          <NavItem Icon={IcHome}  label="Dashboard"    active={false} onClick={() => navigate('/admin')}/>
          <NavItem Icon={IcUsers} label="Users"        active={false} onClick={() => navigate('/admin/users')}/>
          <NavItem Icon={IcLink}  label="Associations" active={true}  onClick={() => {}}/>
          <NavItem Icon={IcBar}   label="Reports"      active={false} onClick={() => navigate('/admin/reports')}/>
          <NavItem Icon={IcGear}  label="Settings"     active={false} onClick={() => {}}/>

          <div style={{ flex: 1 }}/>

          <div style={{
            background: '#eff6ff', borderRadius: 14, padding: '12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#2563eb',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcHelp />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', margin: 0 }}>Need help?</p>
              <a href="#" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>
                Contact support
              </a>
            </div>
          </div>
        </aside>

        {/* ══ MAIN ════════════════════════════════════════════ */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '26px 28px 40px' }}>

          {/* Page header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <div>
              <h1 style={{
                fontSize: 24, fontWeight: 800, color: '#111827',
                margin: '0 0 4px', letterSpacing: '-0.5px',
              }}>
                Associations
              </h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                Manage links between visually impaired users and their companions.
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/associations/new')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                border: 'none', borderRadius: 10, padding: '10px 20px',
                background: '#2563eb', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: '#fff',
                boxShadow: '0 2px 10px rgba(37,99,235,0.28)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
            >
              <IcPlus /> New Association
            </button>
          </div>

          {/* KPI row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14, marginBottom: 22,
          }}>
            <KpiCard
              Icon={KicTotal} iconColor="#2563eb" bgIcon="#eff6ff"
              label="Total Associations" value={assocs.length}
              sub="All time" loading={loading}
            />
            <KpiCard
              Icon={KicActive} iconColor="#16a34a" bgIcon="#f0fdf4"
              label="Active Associations" value={assocs.length}
              sub="Currently active" loading={loading}
            />
            <KpiCard
              Icon={KicCalendar} iconColor="#7c3aed" bgIcon="#f5f3ff"
              label="Created This Month" value={thisMonth}
              sub={new Date().toLocaleString('en-US',{month:'long', year:'numeric'})}
              loading={loading}
            />
            <KpiCard
              Icon={KicUsers} iconColor="#d97706" bgIcon="#fffbeb"
              label="Active Companions" value={companions.length}
              sub="Registered companions" loading={loading}
            />
          </div>

          {/* Filter bar */}
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}>
                <IcSearch />
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{
                  width: '100%', padding: '9px 12px 9px 36px', fontSize: 13,
                  border: '1px solid #e5e7eb', borderRadius: 9,
                  background: '#f9fafb', color: '#374151', outline: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; }}
                onBlur={e  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
              />
            </div>

            {/* Companion filter */}
            <div style={{ position: 'relative', minWidth: 180 }}>
              <select
                value={filterComp}
                onChange={e => setFilterComp(e.target.value)}
                style={{
                  width: '100%', padding: '9px 32px 9px 13px', fontSize: 13,
                  border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff',
                  color: filterComp ? '#111827' : '#9ca3af',
                  appearance: 'none', outline: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <option value="">All Companions</option>
                {companions.map(c => (
                  <option key={c.id} value={String(c.id)}>{displayName(c)}</option>
                ))}
              </select>
              <span style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: '#9ca3af',
              }}>
                <IcChevD />
              </span>
            </div>

            {/* Reset */}
            {(search || filterComp) && (
              <button
                onClick={() => { setSearch(''); setFilterComp(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: '#2563eb', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  padding: '6px 10px', borderRadius: 8,
                }}
              >
                ↺ Reset
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
            marginBottom: 16,
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 180px 120px 80px',
              padding: '11px 22px', background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
            }}>
              {['Malvoyant', 'Companion', 'Created', 'Status', 'Action'].map(h => (
                <span key={h} style={{
                  fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>{h}</span>
              ))}
            </div>

            {/* Body */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
                <Spinner size={36}/>
              </div>
            ) : pageData.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '64px 0', gap: 12,
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', background: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2563eb',
                }}>
                  <IcLink />
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#374151', margin: 0 }}>
                  No associations found
                </p>
                <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
                  {search || filterComp ? 'Try adjusting your filters.' : 'Create your first association.'}
                </p>
                {!search && !filterComp && (
                  <button
                    onClick={() => navigate('/admin/associations/new')}
                    style={{
                      marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
                      border: 'none', borderRadius: 9, padding: '9px 18px',
                      background: '#2563eb', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, color: '#fff',
                    }}
                  >
                    <IcPlus /> New Association
                  </button>
                )}
              </div>
            ) : pageData.map((a, idx) => (
              <div
                key={a.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 180px 120px 80px',
                  padding: '15px 22px', alignItems: 'center',
                  borderBottom: idx < pageData.length - 1 ? '1px solid #f3f4f6' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Malvoyant */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar user={a.malvoyant}/>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontWeight: 700, fontSize: 13, color: '#111827',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {displayName(a.malvoyant)}
                    </p>
                    <p style={{
                      fontSize: 11, color: '#9ca3af', margin: '1px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.malvoyant?.email ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Companion */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar user={a.accompagnateur}/>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontWeight: 700, fontSize: 13, color: '#111827',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {displayName(a.accompagnateur)}
                    </p>
                    <p style={{
                      fontSize: 11, color: '#9ca3af', margin: '1px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.accompagnateur?.email ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Created */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IcCal />
                  <div>
                    <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, margin: 0 }}>
                      {fmtDate(a.createdAt)}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>
                      {fmtTime(a.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    background: '#f0fdf4', color: '#16a34a',
                    border: '1px solid #bbf7d0',
                  }}>
                    <IcCheck /> Active
                  </span>
                </div>

                {/* Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    onClick={() => setDelModal(a)}
                    title="Remove association"
                    style={{
                      width: 34, height: 34, borderRadius: 8,
                      border: '1px solid #e5e7eb', background: '#fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#9ca3af',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background   = '#fef2f2';
                      e.currentTarget.style.borderColor  = '#fecaca';
                      e.currentTarget.style.color        = '#dc2626';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background   = '#fff';
                      e.currentTarget.style.borderColor  = '#e5e7eb';
                      e.currentTarget.style.color        = '#9ca3af';
                    }}
                  >
                    <IcTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Showing {curPage * PAGE_SIZE + 1} to{' '}
                {Math.min((curPage + 1) * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length} association{filtered.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={curPage === 0}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#fff', cursor: curPage === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: curPage === 0 ? 0.4 : 1, color: '#374151',
                  }}>
                  <IcChevL />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)} style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: i === curPage ? 'none' : '1px solid #e5e7eb',
                    background: i === curPage ? '#2563eb' : '#fff',
                    color: i === curPage ? '#fff' : '#374151',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  }}>{i + 1}</button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={curPage >= totalPages - 1}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#fff', cursor: curPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: curPage >= totalPages - 1 ? 0.4 : 1, color: '#374151',
                  }}>
                  <IcChevR />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {delModal && (
        <DeleteModal
          assoc={delModal}
          onClose={() => setDelModal(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      <Toaster position="top-right"/>
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