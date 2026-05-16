/**
 * DashboardPage.jsx — AssistWalk Companion Dashboard
 *
 * APIs réellement utilisées (d'après le contrat API) :
 *   GET  /api/v1/alerts/active          → alertes actives + historique complet
 *   GET  /api/v1/users/me               → profil accompagnateur connecté
 *   PATCH /api/v1/alerts/{id}/resolve   → résoudre une alerte
 *
 * KPIs calculés côté front depuis ces données :
 *   - "Total Users Following"  → nb d'userId uniques dans toutes les alertes
 *   - "Active Alerts"          → alertes avec status === 'ACTIVE'
 *   - "Resolved Today"         → alertes résolues aujourd'hui (resolvedAt = today)
 *
 * WebSocket : /topic/alerts/{companionId}  (via useWebSocket existant)
 */

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axiosInstance';
import { useWebSocket } from '../hooks/useWebSocket';
import { logout } from '../utils/auth';

// ─── Leaflet icon fix (Vite) ──────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const redIcon = new L.Icon({
  iconUrl:     'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:   'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41], iconAnchor: [12, 41],
  popupAnchor: [1, -34], shadowSize: [41, 41],
});

// ─── Helpers ──────────────────────────────────────────────────
const OBSTACLE_ICONS = {
  stairs: '🪜', staircase: '🪜',
  door: '🚪', doors: '🚪',
  tree: '🌳',
  barrier: '🚧', 'metallic barrier': '🚧',
  car: '🚗', vehicle: '🚗',
  pothole: '⚠️',
};
const obstacleEmoji = (t) =>
  t ? (OBSTACLE_ICONS[t.toLowerCase()] ?? '🚨') : '🚨';

/** Retourne true si la date est aujourd'hui */
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getDate() === n.getDate() &&
    d.getMonth()   === n.getMonth() &&
    d.getFullYear() === n.getFullYear();
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const hm = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return isToday(dateStr)
    ? `Today, ${hm}`
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${hm}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

/**
 * Calcule les KPIs depuis la liste complète des alertes :
 *   allAlerts = toutes les alertes retournées par /api/v1/alerts/active
 *   (le endpoint retourne en réalité toutes les alertes associées,
 *    pas uniquement les ACTIVE selon les notes du contrat — à confirmer)
 *
 * Si /alerts/active ne retourne QUE les ACTIVE, on ne peut pas calculer
 * "Resolved Today" depuis ce seul endpoint. Dans ce cas, la valeur
 * s'incrémente en mémoire chaque fois que le companion résout une alerte.
 */
function computeKpis(allAlerts) {
  const uniqueUsers   = new Set(allAlerts.map(a => a.userId)).size;
  const activeCount   = allAlerts.filter(a => a.status === 'ACTIVE').length;
  const resolvedToday = allAlerts.filter(
    a => a.status === 'RESOLVED' && isToday(a.resolvedAt)
  ).length;
  return { uniqueUsers, activeCount, resolvedToday };
}

/**
 * Construit un feed d'activité récente à partir des alertes.
 * Triées par date décroissante, on liste les 6 plus récentes.
 */
function buildActivityFeed(allAlerts) {
  return [...allAlerts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map(a => ({
      id:          a.id,
      userId:      a.userId,
      type:        a.status === 'RESOLVED' ? 'SOS_RESOLVED' : 'SOS_DETECTED',
      description: a.status === 'RESOLVED'
        ? `SOS alert resolved (${a.obstacleType ?? 'Unknown'})`
        : `SOS alert detected (${a.obstacleType ?? 'Unknown'})`,
      createdAt:   a.status === 'RESOLVED' ? (a.resolvedAt ?? a.createdAt) : a.createdAt,
    }));
}

// ─── SVG Icons ────────────────────────────────────────────────
const SvgHome = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const SvgBell = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
  </svg>
);
const SvgUser = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const SvgUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const SvgAlertTri = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const SvgShield = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9,12 11,14 15,10"/>
  </svg>
);
const SvgActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
);
const SvgArrow = () => (
  <svg viewBox="0 0 20 20" fill="none" style={{ width: 15, height: 15 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="10" x2="17" y2="10"/><polyline points="12,5 17,10 12,15"/>
  </svg>
);
const SvgCheck = () => (
  <svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="4,10 8,14 16,6"/>
  </svg>
);
const SvgLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const SvgHelp = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 17, height: 17 }} stroke="white" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const SvgChevron = () => (
  <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }} stroke="#9ca3af" strokeWidth="2">
    <polyline points="4,6 8,10 12,6"/>
  </svg>
);

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ Icon, label, value, bgIcon, iconColor, loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: bgIcon, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: iconColor,
      }}>
        <Icon />
      </div>
      <div>
        <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, margin: '0 0 4px' }}>{label}</p>
        {loading
          ? <div style={{ height: 28, width: 40, background: '#f3f4f6', borderRadius: 6 }} />
          : <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>
              {value ?? 0}
            </p>
        }
      </div>
    </div>
  );
}

// ─── Sidebar NavItem ──────────────────────────────────────────
function NavItem({ Icon, label, active, badge, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
        background: active ? '#2563eb' : hovered ? '#f3f4f6' : 'transparent',
        color: active ? '#fff' : hovered ? '#111827' : '#6b7280',
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

// ─── Alert row (right panel) ──────────────────────────────────
function AlertRow({ alert, onResolve, resolving }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '13px 0', borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: '#fef2f2', border: '1px solid #fee2e2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
      }}>
        {obstacleEmoji(alert.obstacleType)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* userId en attendant que le backend renvoie un userName */}
          <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
            {alert.userName ?? `User #${alert.userId}`}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, marginLeft: 4 }}>
            {timeAgo(alert.createdAt)}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
          {alert.obstacleType ?? 'Unknown obstacle'}
        </p>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>
          {formatTime(alert.createdAt)}
        </p>
      </div>
      <button
        onClick={() => onResolve(alert.id)}
        disabled={resolving === alert.id}
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
          background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8,
          padding: '6px 9px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          opacity: resolving === alert.id ? 0.6 : 1, transition: 'opacity 0.15s',
        }}
      >
        <SvgCheck /> {resolving === alert.id ? '…' : 'Resolve'}
      </button>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────
function Spinner({ size = 28, color = '#2563eb' }) {
  return (
    <svg style={{ width: size, height: size, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4"/>
      <path fill={color} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// DashboardPage
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────
  const [connected,       setConnected]       = useState(false);
  const [allAlerts,       setAllAlerts]       = useState([]);  // toutes les alertes du backend
  const [profile,         setProfile]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [resolving,       setResolving]       = useState(null);
  const [activeNav,       setActiveNav]       = useState('dashboard');
  const [profileOpen,     setProfileOpen]     = useState(false);
  // KPI "Resolved Today" incrémenté en mémoire lors de résolutions via le dashboard
  // (en plus des alertes déjà RESOLVED retournées par l'API si elle les inclut)
  const [sessionResolved, setSessionResolved] = useState(0);

  // ── Chargement initial ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Alertes — seul endpoint disponible pour les données métier
        //    /api/v1/alerts/active retourne les alertes des malvoyants associés
        const { data: alerts } = await api.get('/api/v1/alerts/active');
        setAllAlerts(alerts);

        // 2. Profil de l'accompagnateur connecté
        //    GET /api/v1/users/me (documenté comme "pas encore documenté" mais existant)
        try {
          const { data: me } = await api.get('/api/v1/users/me');
          setProfile(me);
        } catch {
          // Endpoint pas encore prêt : on affiche un profil minimal
          setProfile(null);
        }
      } catch {
        toast.error('Impossible de charger les données du tableau de bord.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── KPIs calculés depuis allAlerts ───────────────────────
  const activeAlerts   = allAlerts.filter(a => a.status === 'ACTIVE');
  const kpis           = computeKpis(allAlerts);
  const resolvedToday  = kpis.resolvedToday + sessionResolved;
  const activityFeed   = buildActivityFeed(allAlerts);

  // ── WebSocket : SOS en temps réel ────────────────────────
  const handleNewAlert = useCallback((notif) => {
    const newAlert = {
      id:           notif.alertId,
      userId:       notif.userId,
      userName:     notif.userName ?? null,
      latitude:     notif.latitude,
      longitude:    notif.longitude,
      obstacleType: notif.obstacleType,
      status:       'ACTIVE',
      createdAt:    notif.createdAt ?? new Date().toISOString(),
      resolvedAt:   null,
    };
    setAllAlerts(prev =>
      prev.find(a => a.id === notif.alertId) ? prev : [newAlert, ...prev]
    );
    toast.custom(t => (
      <div style={{
        background: '#dc2626', color: '#fff',
        padding: '12px 18px', borderRadius: 14,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>🚨</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>SOS Alert!</p>
          <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>
            {notif.obstacleType ?? 'Obstacle inconnu'}
            {notif.userName ? ` — ${notif.userName}` : ` — User #${notif.userId}`}
          </p>
        </div>
      </div>
    ), { duration: 6000 });
  }, []);

  useWebSocket(handleNewAlert, setConnected);

  // ── Résoudre une alerte ───────────────────────────────────
  const resolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      const { data: updated } = await api.patch(`/api/v1/alerts/${alertId}/resolve`);
      // Met à jour l'alerte dans la liste locale avec la réponse du serveur
      setAllAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, ...updated } : a)
      );
      // Si resolvedAt n'est pas dans la réponse API ou si l'API ne retourne
      // les RESOLVED dans /active, on incrémente le compteur en session
      if (isToday(updated.resolvedAt)) {
        // resolvedToday déjà couvert par kpis si l'API renvoie les RESOLVED
        // sinon incrémentation de session
      }
      setSessionResolved(c => c + 1);
      toast.success('Alerte marquée comme résolue.');
    } catch (err) {
      if (err.response?.status === 409) toast.error('Alerte déjà résolue.');
      else if (err.response?.status === 403) toast.error('Alerte hors de votre périmètre.');
      else toast.error('Impossible de résoudre l\'alerte.');
    } finally {
      setResolving(null);
    }
  };

  // ── Profil ────────────────────────────────────────────────
  // /api/v1/users/me peut retourner { id, email, role, nom, prenom, telephone }
  // selon la structure des autres endpoints admin
  const firstName   = profile?.prenom ?? profile?.firstName ?? '';
  const lastName    = profile?.nom    ?? profile?.lastName  ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Companion';
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'C';
  const roleLabel   = profile?.role === 'COMPANION'
    ? 'Accompagnateur'
    : (profile?.role ?? 'Accompagnateur');

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#f3f4f6', overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <header style={{
        height: 60, background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
              <circle cx="12" cy="4.5" r="2"/>
              <path d="M8.5 11.5l-1.5 4h2l1-2.5 1.5 1.5V20h2v-5.5l-2-2 .8-2.5 1.7 1.5H17V9.5h-2.5L13 8l-1 1-1-1-2 3.5z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#111827', letterSpacing: '-0.4px' }}>
            Assist<span style={{ color: '#2563eb' }}>Walk</span>
          </span>
          <span style={{ color: '#e5e7eb', margin: '0 6px' }}>|</span>
          <span style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>
            Companion Dashboard
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* WS live pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 20, padding: '5px 12px',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
            }}/>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Profile pill + dropdown */}
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
                width: 34, height: 34, borderRadius: '50%', background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{roleLabel}</p>
              </div>
              <SvgChevron />
            </button>

            {profileOpen && (
              <>
                <div
                  onClick={() => setProfileOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  minWidth: 230, zIndex: 50, overflow: 'hidden',
                }}>
                  {/* Profile header */}
                  <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%', background: '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 15,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#111827' }}>
                          {displayName}
                        </p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                          {profile?.email ?? ''}
                        </p>
                        {profile?.telephone && (
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                            {profile.telephone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mini KPI strip */}
                  <div style={{
                    display: 'flex', padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                    {[
                      { label: 'Users',    value: kpis.uniqueUsers,   color: '#2563eb' },
                      { label: 'Active',   value: activeAlerts.length, color: '#ef4444' },
                      { label: 'Resolved', value: resolvedToday,       color: '#16a34a' },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontWeight: 800, fontSize: 20, color: s.color, margin: 0, lineHeight: 1 }}>
                          {s.value}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Logout */}
                  <div style={{ padding: 8 }}>
                    <button
                      onClick={logout}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600,
                      }}
                    >
                      <SvgLogout /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Logout direct */}
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '7px 13px', background: 'none',
              cursor: 'pointer', color: '#6b7280', fontSize: 13, fontWeight: 600,
            }}
          >
            <SvgLogout /> Logout
          </button>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────────────── */}
        <aside style={{
          width: 190, background: '#fff', borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          padding: '14px 10px', gap: 2,
        }}>
          <NavItem
            Icon={SvgHome}
            label="Dashboard"
            active={activeNav === 'dashboard'}
            onClick={() => setActiveNav('dashboard')}
          />
          <NavItem
            Icon={SvgBell}
            label="Active Alerts"
            active={activeNav === 'alerts'}
            badge={activeAlerts.length}
            onClick={() => { setActiveNav('alerts'); navigate('/map'); }}
          />
          <NavItem
            Icon={SvgClock}
            label="History"
            active={activeNav === 'history'}
            onClick={() => { setActiveNav('history'); navigate('/history'); }}
          />
          <NavItem
            Icon={SvgUser}
            label="My Profile"
            active={activeNav === 'profile'}
            onClick={() => { setActiveNav('profile'); setProfileOpen(true); }}
          />

          <div style={{ flex: 1 }} />

          {/* Help card */}
          <div style={{
            background: '#eff6ff', borderRadius: 14, padding: '11px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#2563eb',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SvgHelp />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', margin: 0 }}>
                Need help?
              </p>
              <a href="#" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>
                Contact support
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* KPI row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 14, padding: '14px 14px 0', flexShrink: 0,
          }}>
            <KpiCard
              Icon={SvgUsers}
              label="Total Users Following"
              value={kpis.uniqueUsers}
              bgIcon="#eff6ff" iconColor="#2563eb"
              loading={loading}
            />
            <KpiCard
              Icon={SvgAlertTri}
              label="Active Alerts"
              value={activeAlerts.length}
              bgIcon="#fef2f2" iconColor="#ef4444"
              loading={loading}
            />
            <KpiCard
              Icon={SvgShield}
              label="Resolved Today"
              value={resolvedToday}
              bgIcon="#f0fdf4" iconColor="#16a34a"
              loading={loading}
            />
          </div>

          {/* Map + right panel */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 14, gap: 14 }}>

            {/* Left col: map + activity */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 14 }}>

              {/* ── Leaflet map ─────────────────────────────── */}
              <div style={{
                flex: 1, minHeight: 0, borderRadius: 16, overflow: 'hidden',
                border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {loading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
                    <Spinner />
                  </div>
                ) : (
                  <MapContainer
                    center={[33.9716, -6.8498]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    />
                    {activeAlerts.map(alert => (
                      <Marker
                        key={alert.id}
                        position={[alert.latitude, alert.longitude]}
                        icon={redIcon}
                      >
                        <Popup minWidth={200}>
                          <div style={{ padding: '2px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 18 }}>{obstacleEmoji(alert.obstacleType)}</span>
                              <strong style={{ color: '#dc2626', fontSize: 13 }}>
                                {alert.obstacleType ?? 'SOS Alert'} #{alert.id}
                              </strong>
                            </div>
                            <p style={{ fontSize: 12, color: '#374151', margin: '4px 0' }}>
                              <b>User:</b> {alert.userName ?? `User #${alert.userId}`}
                            </p>
                            <p style={{ fontSize: 12, color: '#374151', margin: '4px 0' }}>
                              <b>Time:</b> {formatTime(alert.createdAt)}
                            </p>
                            <p style={{ fontSize: 12, color: '#374151', margin: '4px 0 10px' }}>
                              <b>Location:</b> {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                            </p>
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              disabled={resolving === alert.id}
                              style={{
                                width: '100%', background: '#16a34a', color: '#fff',
                                border: 'none', borderRadius: 8, padding: '8px',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                opacity: resolving === alert.id ? 0.6 : 1,
                              }}
                            >
                              ✓ {resolving === alert.id ? 'Resolving…' : 'Mark as Resolved'}
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              {/* ── Recent Activity ──────────────────────────── */}
              <div style={{
                background: '#fff', borderRadius: 16,
                border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                flexShrink: 0,
              }}>
                {/* Header */}
                <div style={{
                  padding: '13px 18px 10px', borderBottom: '1px solid #f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: '#eff6ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb',
                    }}>
                      <SvgActivity />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                      Recent Activity
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/history')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#2563eb', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    View Full History <SvgArrow />
                  </button>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      {[
                        { h: 'User',  align: 'left'  },
                        { h: 'Event', align: 'left'  },
                        { h: 'Time',  align: 'right' },
                      ].map(({ h, align }) => (
                        <th key={h} style={{
                          padding: '7px 18px', textAlign: align,
                          fontSize: 11, fontWeight: 600, color: '#9ca3af',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? [1, 2, 3].map(i => (
                          <tr key={i}>
                            {[60, 80, 40].map((w, j) => (
                              <td key={j} style={{ padding: '10px 18px' }}>
                                <div style={{ height: 11, background: '#f3f4f6', borderRadius: 4, width: `${w}%` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      : activityFeed.length === 0
                        ? (
                          <tr>
                            <td colSpan={3} style={{ padding: '18px', textAlign: 'center', color: '#9ca3af' }}>
                              Aucune activité récente.
                            </td>
                          </tr>
                        )
                        : activityFeed.map((ev, i) => {
                          const isResolved = ev.type === 'SOS_RESOLVED';
                          return (
                            <tr key={ev.id ?? i} style={{ borderTop: '1px solid #f9fafb' }}>
                              <td style={{ padding: '10px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: isResolved ? '#dcfce7' : '#dbeafe',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 700,
                                    color: isResolved ? '#16a34a' : '#2563eb',
                                  }}>
                                    {isResolved ? '✓' : 'ℹ'}
                                  </div>
                                  <span style={{ fontWeight: 600, color: '#111827' }}>
                                    {/* userId car l'API ne retourne pas de userName */}
                                    User #{ev.userId}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 18px', color: '#6b7280' }}>
                                {ev.description}
                              </td>
                              <td style={{ padding: '10px 18px', textAlign: 'right', color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>
                                {formatTime(ev.createdAt)}
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── RIGHT: Active Alerts panel ───────────────── */}
            <div style={{
              width: 290, background: '#fff', borderRadius: 16,
              border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '15px 15px 11px', borderBottom: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                    Active Alerts
                  </span>
                  {activeAlerts.length > 0 && (
                    <span style={{
                      background: '#ef4444', color: '#fff',
                      fontSize: 11, fontWeight: 800,
                      width: 20, height: 20, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {activeAlerts.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Alert list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <Spinner />
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 8 }}>
                    <span style={{ fontSize: 30 }}>✅</span>
                    <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500, textAlign: 'center', margin: 0 }}>
                      All clear —<br/>no active alerts
                    </p>
                  </div>
                ) : (
                  activeAlerts.map(alert => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onResolve={resolveAlert}
                      resolving={resolving}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '11px 14px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <button
                  onClick={() => navigate('/history')}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    color: '#2563eb', fontSize: 13, fontWeight: 700, padding: '6px 0',
                  }}
                >
                  View All Alerts <SvgArrow />
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      <Toaster position="top-right" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}