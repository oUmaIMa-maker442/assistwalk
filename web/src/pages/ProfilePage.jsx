/**
 * ProfilePage.jsx — AssistWalk
 * Premium SaaS profile page — compact, professional
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosInstance';
import { logout } from '../utils/auth';
import { useSidebarState } from '../hooks/useSidebarState';

// ── Helpers ───────────────────────────────────────────────────
const AV_COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return AV_COLORS[(id || 0) % AV_COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? '', n = u?.nom ?? '';
  return ((p + ' ' + n).trim() || u?.email || '?')
    .split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? '', n = u?.nom ?? '';
  return (p + ' ' + n).trim() || u?.email?.split('@')[0] || 'User';
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (dt.toDateString() === new Date().toDateString()) return `Today, ${time}`;
  return fmtDate(d) + ', ' + time;
}
function roleLabel(r) {
  return r === 'COMPANION' ? 'Companion' : r === 'ADMIN' ? 'Administrator' : r === 'VISUAL_IMPAIRED' ? 'Visually Impaired' : r || '—';
}
const API_BASE = 'http://localhost:8081';
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}

// ── Icons ─────────────────────────────────────────────────────
const ic = (d, w = 16, h = 16) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: w, height: h, flexShrink: 0 }}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcHome    = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>, 18, 18);
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, 18, 18);
const IcLink    = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>, 18, 18);
const IcBar     = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>, 18, 18);
const IcUserNav = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>, 18, 18);
const IcBell    = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>, 18, 18);
const IcHistory = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 18, 18);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 14, 14);
const IcEdit    = ic(<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>);
const IcCamera  = ic(<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>, 13, 13);
const IcMail    = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></>, 13, 13);
const IcPhone   = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>, 13, 13);
const IcPin     = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, 13, 13);
const IcLock    = ic(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>, 14, 14);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, 13, 13);
const IcCal     = ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, 13, 13);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 13, 13);
const IcX       = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>);
const IcSave    = ic(<><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></>, 14, 14);
const IcMenu    = ic(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, 17, 17);
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcBriefcase = ic(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>, 13, 13);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size = 20, light = false }) {
  return (
    <svg style={{ width: size, height: size, animation: 'spin 0.9s linear infinite', flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light ? 'rgba(255,255,255,0.3)' : '#bfdbfe'} strokeWidth="3.5" />
      <path fill={light ? 'white' : '#2563eb'} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Input helpers ─────────────────────────────────────────────
const INP_STYLE = {
  width: '100%', padding: '8px 11px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  background: '#fff', color: '#111827', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocIn  = e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; };
const onFocOut = e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

// ── Info Row (read-only) ──────────────────────────────────────
function InfoRow({ label, value, Icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 11px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f0f0', minHeight: 36 }}>
        {Icon && <span style={{ color: '#9ca3af', display: 'flex', flexShrink: 0 }}><Icon /></span>}
        <span style={{ fontSize: 13, fontWeight: 500, color: value ? '#111827' : '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '—'}
        </span>
      </div>
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────
function FieldLabel({ label }) {
  return <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>;
}

// ── Account row ───────────────────────────────────────────────
function AccountRow({ label, value, valueColor = '#374151', last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: last ? 'none' : '1px solid #f5f5f5',
    }}>
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: valueColor, textAlign: 'right', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ── Change Password Modal ─────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (form.next !== form.confirm) { toast.error('Passwords do not match.'); return; }
    if (form.next.length < 8) { toast.error('Minimum 8 characters.'); return; }
    setSaving(true);
    try {
      await api.put('/api/v1/users/me/password', { currentPassword: form.current, newPassword: form.next });
      toast.success('Password updated successfully.');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message ?? 'Failed to update password.'); }
    finally { setSaving(false); }
  };

  const EyeBtn = ({ k }) => (
    <button type="button" onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}
      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
      <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {show[k]
          ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
      </svg>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', padding: '24px 26px', margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
            <IcLock />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Change Password</h2>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Choose a strong, unique password</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <IcX />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[['current','Current Password'],['next','New Password'],['confirm','Confirm Password']].map(([k, lbl]) => (
            <div key={k}>
              <FieldLabel label={lbl} />
              <div style={{ position: 'relative' }}>
                <input type={show[k] ? 'text' : 'password'} value={form[k]} placeholder="••••••••"
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ ...INP_STYLE, paddingRight: 36 }} onFocus={onFocIn} onBlur={onFocOut} />
                <EyeBtn k={k} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}>
            {saving && <Spinner size={13} light />}
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Dropdown ─────────────────────────────────────────
function ProfileDropdown({ profile, photoSrc, imgError, setImgError, onClose }) {
  const navigate = useNavigate();
  const ini = initials(profile);
  const bg  = avColor(profile?.id);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 220, zIndex: 91, overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: photoSrc && !imgError ? 'transparent' : bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden' }}>
            {photoSrc && !imgError
              ? <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
              : ini}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(profile)}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || ''}</p>
          </div>
        </div>
        <button onClick={() => { onClose(); navigate('/profile'); }}
          style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IcUserNav /> My Profile
        </button>
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 16px' }} />
        <button onClick={() => { onClose(); logout(); }}
          style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IcLogout /> Logout
        </button>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();

  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editingInfo,  setEditingInfo]  = useState(false);
  const [editingPro,   setEditingPro]   = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [imgError,     setImgError]     = useState(false);
  const [profOpen,     setProfOpen]     = useState(false);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

  const fileRef = useRef(null);
  const [formInfo, setFormInfo] = useState({ prenom: '', nom: '', telephone: '', adresse: '' });
  const [formPro,  setFormPro]  = useState({ telephoneProfessionnel: '', dateEmbauche: '', anneesExperience: '' });

  // ── Load ─────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/api/v1/users/me')
      .then(({ data }) => {
        setProfile(data);
        setFormInfo({ prenom: data.prenom ?? '', nom: data.nom ?? '', telephone: data.telephone ?? '', adresse: data.adresse ?? '' });
        setFormPro({ telephoneProfessionnel: data.telephoneProfessionnel ?? '', dateEmbauche: data.dateEmbauche ?? '', anneesExperience: data.anneesExperience ?? '' });
      })
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Photo ─────────────────────────────────────────────────────
  const handlePhotoChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size: 2 MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Image file required'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/api/v1/users/me/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, photoUrl: data.photoUrl }));
      setImgError(false);
      toast.success('Profile photo updated.');
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); }
  };

  // ── Save personal ─────────────────────────────────────────────
  const saveInfo = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/api/v1/users/me', formInfo);
      setProfile(p => ({ ...p, ...data }));
      setFormInfo({ prenom: data.prenom ?? '', nom: data.nom ?? '', telephone: data.telephone ?? '', adresse: data.adresse ?? '' });
      setEditingInfo(false);
      toast.success('Profile updated.');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  // ── Save professional ─────────────────────────────────────────
  const savePro = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/api/v1/users/me', formPro);
      setProfile(p => ({ ...p, ...data }));
      setEditingPro(false);
      toast.success('Professional information updated.');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  // ── Derived ───────────────────────────────────────────────────
  const isAdmin  = profile?.role === 'ADMIN';
  const photoSrc = resolvePhoto(profile?.photoUrl);
  const hasPhoto = !!(photoSrc && !imgError);
  const bg       = avColor(profile?.id);
  const ini      = initials(profile);
  const dn       = displayName(profile);

  const sidebarItems = isAdmin ? [
    { Icon: IcHome,    label: 'Dashboard',    path: '/admin' },
    { Icon: IcUsers,   label: 'Users',        path: '/admin/users' },
    { Icon: IcLink,    label: 'Associations', path: '/admin/associations' },
    { Icon: IcBar,     label: 'Reports',      path: '/admin/reports' },
    { Icon: IcUserNav, label: 'My Profile',   path: '/profile' },
  ] : [
    { Icon: IcHome,    label: 'Dashboard',    path: '/dashboard' },
    { Icon: IcBell,    label: 'Alerts',       path: '/map' },
    { Icon: IcHistory, label: 'History',      path: '/history' },
    { Icon: IcUserNav, label: 'My Profile',   path: '/profile' },
  ];

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'row',
      background: '#f8fafc', overflow: 'hidden',
      fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => toggleSidebar()}
        items={sidebarItems}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── HEADER ── */}
        <header style={{
          height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0, zIndex: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.2px' }}>
              My Profile
            </span>
          </div>

          {/* Profile pill */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setProfOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: '1px solid #e5e7eb', borderRadius: 9, padding: '5px 10px 5px 6px',
              cursor: 'pointer', background: profOpen ? '#f9fafb' : '#fff',
            }}
              onMouseEnter={e => !profOpen && (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => !profOpen && (e.currentTarget.style.background = '#fff')}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: hasPhoto ? 'transparent' : bg, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 9 }}>
                {hasPhoto ? <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} /> : ini}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dn}</span>
              <span style={{ color: '#9ca3af', display: 'flex' }}><IcChevD /></span>
            </button>
            {profOpen && (
              <ProfileDropdown profile={profile} photoSrc={photoSrc} imgError={imgError}
                setImgError={setImgError} onClose={() => setProfOpen(false)} />
            )}
          </div>
        </header>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 40px' }}>

          {/* ── Compact Profile Header ── */}
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '18px 22px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 18,
          }}>
            {/* Avatar with upload */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
                background: bg, border: '2.5px solid #fff',
                boxShadow: `0 0 0 2px ${bg}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 18,
              }}>
                {hasPhoto
                  ? <img src={photoSrc} alt={dn} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : ini}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                title="Change photo"
                style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#2563eb', border: '2px solid #fff',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                {uploading ? <Spinner size={9} light /> : <IcCamera />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>{dn}</h2>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, color: '#15803d',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 20, padding: '2px 8px',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                  Active
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
                {profile?.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                    <IcMail /> {profile.email}
                  </span>
                )}
                {profile?.telephone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                    <IcPhone /> {profile.telephone}
                  </span>
                )}
                {profile?.adresse && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af' }}>
                    <IcPin /> {profile.adresse}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setShowPwdModal(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid #e5e7eb', background: '#fff',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <IcLock /> Change Password
              </button>
              <button onClick={() => { setEditingInfo(true); setEditingPro(false); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: '#2563eb', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#fff',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}>
                <IcEdit /> Edit Profile
              </button>
            </div>
          </div>

          {/* ── 2-column grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>

            {/* ══ LEFT ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Personal Information */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <IcUserNav />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>Personal Information</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Basic account details</p>
                    </div>
                  </div>
                  {editingInfo ? (
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={() => setEditingInfo(false)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Cancel</button>
                      <button onClick={saveInfo} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}>
                        {saving && <Spinner size={12} light />}
                        {saving ? 'Saving…' : <><IcSave /> Save</>}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingInfo(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#eff6ff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2563eb' }}>
                      <IcEdit /> Edit
                    </button>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 18px' }}>
                  {editingInfo ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <FieldLabel label="First Name" />
                          <input value={formInfo.prenom} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} placeholder="First name" onChange={e => setFormInfo(f => ({ ...f, prenom: e.target.value }))} />
                        </div>
                        <div>
                          <FieldLabel label="Last Name" />
                          <input value={formInfo.nom} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} placeholder="Last name" onChange={e => setFormInfo(f => ({ ...f, nom: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <FieldLabel label="Email" />
                          <input value={profile?.email ?? ''} style={{ ...INP_STYLE, background: '#f9fafb', color: '#9ca3af' }} disabled />
                        </div>
                        <div>
                          <FieldLabel label="Phone" />
                          <input value={formInfo.telephone} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} placeholder="+212 6xx xxx xxx" onChange={e => setFormInfo(f => ({ ...f, telephone: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <FieldLabel label="Address" />
                        <input value={formInfo.adresse} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} placeholder="City, Street" onChange={e => setFormInfo(f => ({ ...f, adresse: e.target.value }))} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <InfoRow label="First Name" value={profile?.prenom} />
                      <InfoRow label="Last Name"  value={profile?.nom} />
                      <InfoRow label="Email"      value={profile?.email}     Icon={IcMail} />
                      <InfoRow label="Phone"      value={profile?.telephone} Icon={IcPhone} />
                      <div style={{ gridColumn: '1/-1' }}>
                        <InfoRow label="Address" value={profile?.adresse} Icon={IcPin} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Companion Professional Info */}
              {profile?.role === 'COMPANION' && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                        <IcBriefcase />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>Professional Information</p>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Companion profile details</p>
                      </div>
                    </div>
                    {editingPro ? (
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button onClick={() => setEditingPro(false)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Cancel</button>
                        <button onClick={savePro} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: saving ? '#86efac' : '#16a34a', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}>
                          {saving && <Spinner size={12} light />}
                          {saving ? 'Saving…' : <><IcSave /> Save</>}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPro(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#f0fdf4', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                        <IcEdit /> Edit
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    {editingPro ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <FieldLabel label="Professional Phone" />
                          <input value={formPro.telephoneProfessionnel} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} placeholder="+212 6xx xxx xxx" onChange={e => setFormPro(f => ({ ...f, telephoneProfessionnel: e.target.value }))} />
                        </div>
                        <div>
                          <FieldLabel label="Hire Date" />
                          <input type="date" value={formPro.dateEmbauche} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} onChange={e => setFormPro(f => ({ ...f, dateEmbauche: e.target.value }))} />
                        </div>
                        <div>
                          <FieldLabel label="Years of Experience" />
                          <input type="number" min="0" max="50" value={formPro.anneesExperience} style={INP_STYLE} onFocus={onFocIn} onBlur={onFocOut} placeholder="e.g. 3" onChange={e => setFormPro(f => ({ ...f, anneesExperience: e.target.value }))} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <InfoRow label="Professional Phone"   value={profile?.telephoneProfessionnel} Icon={IcPhone} />
                        <InfoRow label="Hire Date"            value={fmtDate(profile?.dateEmbauche)} Icon={IcCal} />
                        <InfoRow label="Years of Experience"  value={profile?.anneesExperience != null ? `${profile.anneesExperience} yrs` : null} Icon={IcBriefcase} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VI Medical Info (read-only) */}
              {profile?.role === 'VISUAL_IMPAIRED' && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <IcShield />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>Medical Information</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Emergency and health profile</p>
                    </div>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <InfoRow label="Emergency Phone" value={profile?.telephoneUrgence} Icon={IcPhone} />
                      <InfoRow label="Blood Type"      value={profile?.groupeSanguin} />
                      <InfoRow label="Impairment Level" value={profile?.niveauDeficience} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ══ RIGHT COLUMN ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0, alignSelf: 'start' }}>

              {/* Account Summary */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                    <IcShield />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>Account Summary</p>
                </div>
                <div style={{ padding: '4px 16px 8px' }}>
                  <AccountRow label="Status" value="Active" valueColor="#15803d" />
                  <AccountRow label="Role"   value={roleLabel(profile?.role)} />
                  <AccountRow label="Member since" value={fmtDate(profile?.createdAt)} />
                  <AccountRow label="Last login"   value={fmtDateTime(profile?.derniereConnexion)} />
                  <AccountRow label="Password"     value="Protected" valueColor="#15803d" last />
                </div>
              </div>

              {/* Security Settings */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <IcLock />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 }}>Security Settings</p>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>Password</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
                        {profile?.passwordChangedAt ? `Updated ${fmtDate(profile.passwordChangedAt)}` : 'Last update not recorded'}
                      </p>
                    </div>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  </div>
                  <button onClick={() => setShowPwdModal(true)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px', borderRadius: 9, border: '1px solid #e5e7eb',
                    background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <IcLock /> Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}

      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600 } }} />
      <style>{`
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
