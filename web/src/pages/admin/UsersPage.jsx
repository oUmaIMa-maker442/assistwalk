/**
 * UsersPage.jsx — AssistWalk Admin
 * Premium SaaS design — Stripe / Clerk / Vercel inspired
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

// ── Helpers ──────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return 'Never';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return s + 's ago';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function displayName(u) {
  const p = u?.prenom ?? '';
  const n = u?.nom ?? '';
  return (p + ' ' + n).trim() || u?.email?.split('@')[0] || ('User #' + u?.id);
}
function initials(u) {
  return displayName(u).split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
const AV_COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777','#059669'];
function avColor(id) { return AV_COLORS[(id || 0) % AV_COLORS.length]; }

const API_BASE = 'http://localhost:8081';
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}

function userStatus(u) {
  if (u.mustChangePassword && !u.derniereConnexion) return 'pending';
  if (!u.derniereConnexion) return 'inactive';
  const days = (Date.now() - new Date(u.derniereConnexion)) / 86400000;
  return days <= 30 ? 'active' : 'inactive';
}

const STATUS_META = {
  active:   { label:'Active',   color:'#15803d', bg:'#f0fdf4', border:'#bbf7d0', dot:'#22c55e' },
  inactive: { label:'Inactive', color:'#6b7280', bg:'#f9fafb', border:'#e5e7eb', dot:'#9ca3af' },
  pending:  { label:'Pending',  color:'#b45309', bg:'#fffbeb', border:'#fde68a', dot:'#f59e0b' },
  blocked:  { label:'Blocked',  color:'#dc2626', bg:'#fef2f2', border:'#fecaca', dot:'#ef4444' },
};
const ROLE_META = {
  ADMIN:           { label:'Administrator',     color:'#dc2626', bg:'#fef2f2', border:'#fecaca' },
  COMPANION:       { label:'Companion',         color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
  VISUAL_IMPAIRED: { label:'Visually Impaired', color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
};
const PAGE_SIZE = 10;

// ── SVG Icons ────────────────────────────────────────────────
const ic = (d, w=18, h=18) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{width:w,height:h,flexShrink:0}}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcHome    = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcBell    = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>);
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink    = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar     = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcUser    = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcSearch  = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, 15, 15);
const IcPlus    = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 15, 15);
const IcDownload= ic(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>, 15, 15);
const IcEdit    = ic(<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>, 14, 14);
const IcTrash   = ic(<><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>, 14, 14);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcChevL   = ic(<polyline points="10,4 6,8 10,12"/>, 13, 13);
const IcChevR   = ic(<polyline points="6,4 10,8 6,12"/>, 13, 13);
const IcX       = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, 16, 16);
const IcPhone   = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>, 14, 14);
const IcMail    = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></>, 14, 14);
const IcMapPin  = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, 14, 14);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 14, 14);
const IcCal     = ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, 14, 14);
const IcMenu    = ic(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, 17, 17);
const IcEye     = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>, 14, 14);
const IcDots    = () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>;

// ── Spinner ──────────────────────────────────────────────────
function Spinner({ size=24, light=false }) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="4"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar ───────────────────────────────────────────────────
function UserAvatar({ user, size=36, onClick, ring=false }) {
  const [hov, setHov] = useState(false);
  const clickable = !!onClick;
  const photo = resolvePhoto(user?.photoUrl);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => clickable && setHov(true)}
      onMouseLeave={() => clickable && setHov(false)}
      style={{
        width:size, height:size, borderRadius:'50%',
        background: photo ? 'transparent' : avColor(user?.id),
        flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontWeight:700,
        fontSize: size>60?22:size>40?16:size>32?13:11,
        cursor: clickable?'pointer':'default',
        transition:'transform 0.15s, box-shadow 0.15s',
        transform: hov?'scale(1.06)':'scale(1)',
        boxShadow: ring?`0 0 0 2px #fff, 0 0 0 4px ${avColor(user?.id)}`:
                   hov?'0 0 0 3px rgba(37,99,235,0.2)':'none',
        overflow:'hidden', position:'relative',
      }}>
      {photo
        ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}
               onError={e => { e.currentTarget.style.display='none'; }}/>
        : initials(user)
      }
    </div>
  );
}

// ── Compact KPI Card ─────────────────────────────────────────
function KpiCard({ Icon, label, value, iconColor, iconBg, loading }) {
  return (
    <div style={{
      background:'#fff', borderRadius:12, border:'1px solid #e5e7eb',
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
      padding:'14px 18px', display:'flex', alignItems:'center', gap:14,
    }}>
      <div style={{
        width:40, height:40, borderRadius:10, background:iconBg,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:iconColor, flexShrink:0,
      }}>
        <Icon />
      </div>
      <div>
        <p style={{fontSize:11,color:'#9ca3af',fontWeight:600,margin:'0 0 2px',
                   textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>
        {loading
          ? <div style={{height:22,width:36,background:'#f3f4f6',borderRadius:5}}/>
          : <p style={{fontSize:22,fontWeight:800,color:'#111827',margin:0,lineHeight:1}}>{value}</p>
        }
      </div>
    </div>
  );
}

// ── Role Badge ───────────────────────────────────────────────
function RoleBadge({ role }) {
  const m = ROLE_META[role] ?? {label:role||'—',color:'#6b7280',bg:'#f3f4f6',border:'#e5e7eb'};
  return (
    <span style={{
      display:'inline-block',padding:'3px 10px',borderRadius:20,
      background:m.bg,color:m.color,fontSize:11,fontWeight:700,
      border:`1px solid ${m.border}`,whiteSpace:'nowrap',
    }}>{m.label}</span>
  );
}

// ── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.inactive;
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:5,
      padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
      background:m.bg,color:m.color,border:`1px solid ${m.border}`,whiteSpace:'nowrap',
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background:m.dot,flexShrink:0}}/>
      {m.label}
    </span>
  );
}

// ── Action Menu (three-dot dropdown) ─────────────────────────
function ActionMenu({ user, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items = [
    { label: 'View profile', Icon: IcEye,   action: () => onView(user),   danger: false },
    { label: 'Edit',         Icon: IcEdit,  action: () => onEdit(user),   danger: false },
    { label: 'Delete',       Icon: IcTrash, action: () => onDelete(user), danger: true  },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #e5e7eb', background: open ? '#f3f4f6' : '#fff',
          color: '#6b7280', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; } }}
      >
        <IcDots />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }}/>
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 99,
            background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 148, overflow: 'hidden',
            padding: '4px',
          }}>
            {items.map(({ label, Icon, action, danger }) => (
              <button key={label}
                onClick={e => { e.stopPropagation(); setOpen(false); action(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'none', textAlign: 'left',
                  fontSize: 13, fontWeight: 500,
                  color: danger ? '#dc2626' : '#374151',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = danger ? '#fef2f2' : '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ color: danger ? '#dc2626' : '#64748b', display: 'flex' }}><Icon /></span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Profile Dropdown ─────────────────────────────────────────
function ProfileDropdown({ profile, onClose }) {
  const navigate = useNavigate();
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:90}}/>
      <div style={{
        position:'absolute',top:'calc(100% + 8px)',right:0,
        background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',
        boxShadow:'0 8px 30px rgba(0,0,0,0.12)',minWidth:230,zIndex:91,overflow:'hidden',
      }}>
        {/* Identity header */}
        <div style={{padding:'14px 16px',borderBottom:'1px solid #f1f5f9',
                     display:'flex',alignItems:'center',gap:10}}>
          <UserAvatar user={profile} size={38} ring/>
          <div style={{minWidth:0}}>
            <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                       overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {displayName(profile) || 'Administrator'}
            </p>
            <p style={{fontSize:12,color:'#9ca3af',margin:0,
                       overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {profile?.email || ''}
            </p>
          </div>
        </div>

        {/* My Profile */}
        <button onClick={() => { onClose(); navigate('/profile'); }}
          style={{
            width:'100%',padding:'10px 16px',border:'none',background:'none',
            cursor:'pointer',textAlign:'left',fontSize:13,color:'#374151',
            fontWeight:500,display:'flex',alignItems:'center',gap:9,
          }}
          onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IcUser /> My Profile
        </button>

        <div style={{height:1,background:'#f1f5f9',margin:'0 16px'}}/>

        {/* Logout */}
        <button onClick={() => { onClose(); logout(); }}
          style={{
            width:'100%',padding:'10px 16px',border:'none',background:'none',
            cursor:'pointer',textAlign:'left',fontSize:13,color:'#dc2626',
            fontWeight:500,display:'flex',alignItems:'center',gap:9,
            margin:'4px 0',
          }}
          onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IcLogout /> Logout
        </button>
      </div>
    </>
  );
}

// ── Info Row (drawer) ─────────────────────────────────────────
function InfoRow({ Icon, label, value, action }) {
  if (!value) return null;
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'10px 14px',background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{color:'#6b7280',flexShrink:0}}><Icon/></span>
        <div>
          <p style={{fontSize:10,color:'#9ca3af',margin:0,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</p>
          <p style={{fontSize:13,fontWeight:600,color:'#111827',margin:0}}>{value}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Section label (drawer) ────────────────────────────────────
function DrawerSection({ title, children }) {
  return (
    <div style={{marginBottom:20}}>
      <p style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',
                 letterSpacing:'0.08em',margin:'0 0 10px'}}>{title}</p>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>{children}</div>
    </div>
  );
}

// ── User Detail Drawer ───────────────────────────────────────
function UserDrawer({ baseUser, onClose, onEdit, onDelete }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    api.get(`/api/v1/admin/users/${baseUser.id}/profile`)
      .then(({ data }) => setProfile(data))
      .catch(() => setProfile(baseUser))
      .finally(() => setLoading(false));
  }, [baseUser.id]);

  const user   = profile ?? baseUser;
  const status = userStatus(user);

  const isCompanion = user.role === 'COMPANION';
  const isVI        = user.role === 'VISUAL_IMPAIRED';

  const deficiencyLabel = (v) => ({
    partial: 'Partial impairment',
    severe:  'Severe impairment',
    total:   'Total blindness',
  }[v] || v);

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',
        zIndex:150,backdropFilter:'blur(2px)',
      }}/>
      <div style={{
        position:'fixed',top:0,right:0,width:400,height:'100vh',
        background:'#fff',zIndex:151,
        boxShadow:'-6px 0 40px rgba(0,0,0,0.10)',
        display:'flex',flexDirection:'column',overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px',borderBottom:'1px solid #f1f5f9',
          display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,
        }}>
          <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0}}>User Profile</p>
          <button onClick={onClose} style={{
            width:30,height:30,borderRadius:7,border:'1px solid #e5e7eb',
            background:'#fff',cursor:'pointer',display:'flex',
            alignItems:'center',justifyContent:'center',color:'#6b7280',
          }}><IcX/></button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'24px 20px'}}>

          {/* Hero */}
          <div style={{
            display:'flex',flexDirection:'column',alignItems:'center',
            gap:12,marginBottom:24,paddingBottom:22,borderBottom:'1px solid #f1f5f9',
          }}>
            {loading
              ? <div style={{width:72,height:72,borderRadius:'50%',background:'#f3f4f6'}}/>
              : <UserAvatar user={user} size={72} ring/>
            }
            <div style={{textAlign:'center'}}>
              {loading
                ? <div style={{height:20,width:120,background:'#f3f4f6',borderRadius:6,margin:'0 auto 8px'}}/>
                : <p style={{fontSize:18,fontWeight:800,color:'#111827',margin:'0 0 6px',letterSpacing:'-0.3px'}}>
                    {displayName(user)}
                  </p>
              }
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <RoleBadge role={user.role}/>
                <StatusBadge status={status}/>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{display:'flex',justifyContent:'center',padding:32}}>
              <Spinner size={28}/>
            </div>
          ) : (
            <>
              {/* Contact */}
              <DrawerSection title="Contact">
                <InfoRow Icon={IcMail} label="Email" value={user.email}
                  action={user.email && (
                    <a href={`mailto:${user.email}`} style={{
                      padding:'5px 12px',borderRadius:7,background:'#eff6ff',
                      color:'#2563eb',fontSize:12,fontWeight:700,textDecoration:'none',
                      border:'1px solid #bfdbfe',flexShrink:0,
                    }}>Send</a>
                  )}
                />
                <InfoRow Icon={IcPhone} label="Phone" value={user.telephone}
                  action={user.telephone && (
                    <a href={`tel:${user.telephone}`} style={{
                      padding:'5px 12px',borderRadius:7,background:'#f0fdf4',
                      color:'#15803d',fontSize:12,fontWeight:700,textDecoration:'none',
                      border:'1px solid #bbf7d0',flexShrink:0,
                    }}>Call</a>
                  )}
                />
                <InfoRow Icon={IcMapPin} label="Address" value={user.adresse}/>
              </DrawerSection>

              {/* Companion-specific */}
              {isCompanion && (
                <DrawerSection title="Professional Info">
                  <InfoRow Icon={IcPhone} label="Professional Phone"
                    value={user.telephoneProfessionnel}
                    action={user.telephoneProfessionnel && (
                      <a href={`tel:${user.telephoneProfessionnel}`} style={{
                        padding:'5px 12px',borderRadius:7,background:'#f0fdf4',
                        color:'#15803d',fontSize:12,fontWeight:700,textDecoration:'none',
                        border:'1px solid #bbf7d0',flexShrink:0,
                      }}>Call</a>
                    )}
                  />
                  <InfoRow Icon={IcCal} label="Hire Date"
                    value={user.dateEmbauche ? fmtDate(user.dateEmbauche) : null}/>
                  <InfoRow Icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  )} label="Years of Experience"
                    value={user.anneesExperience != null ? `${user.anneesExperience} year${user.anneesExperience !== 1 ? 's' : ''}` : null}
                  />
                </DrawerSection>
              )}

              {/* Visual Impaired-specific */}
              {isVI && (
                <DrawerSection title="Medical Info">
                  <InfoRow Icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  )} label="Emergency Phone"
                    value={user.telephoneUrgence}
                    action={user.telephoneUrgence && (
                      <a href={`tel:${user.telephoneUrgence}`} style={{
                        padding:'5px 12px',borderRadius:7,background:'#fef2f2',
                        color:'#dc2626',fontSize:12,fontWeight:700,textDecoration:'none',
                        border:'1px solid #fecaca',flexShrink:0,
                      }}>Call</a>
                    )}
                  />
                  <InfoRow Icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  )} label="Blood Type" value={user.groupeSanguin}/>
                  <InfoRow Icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  )} label="Impairment Level"
                    value={user.niveauDeficience ? deficiencyLabel(user.niveauDeficience) : null}
                  />
                </DrawerSection>
              )}

              {/* Account */}
              <DrawerSection title="Account">
                <div style={{background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9',overflow:'hidden'}}>
                  {[
                    { Icon:IcClock, label:'Last Activity', val: user.derniereConnexion ? timeAgo(user.derniereConnexion) : 'Never' },
                    { Icon:IcCal,   label:'Member since',  val: fmtDate(user.createdAt) },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{
                      display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
                      borderBottom: i < arr.length-1 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <span style={{color:'#9ca3af'}}><row.Icon/></span>
                      <span style={{fontSize:12,color:'#6b7280',flex:1}}>{row.label}</span>
                      <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </DrawerSection>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:'14px 20px',borderTop:'1px solid #f1f5f9',
          display:'flex',gap:10,flexShrink:0,
        }}>
          <button onClick={() => onDelete(baseUser)} style={{
            flex:1,padding:'10px',borderRadius:9,
            border:'1px solid #fecaca',background:'#fff',cursor:'pointer',
            fontSize:13,fontWeight:600,color:'#dc2626',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
            onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
            <IcTrash/> Delete
          </button>
          <button onClick={() => onEdit(baseUser)} style={{
            flex:2,padding:'10px',borderRadius:9,border:'none',
            background:'#2563eb',cursor:'pointer',fontSize:13,fontWeight:700,color:'#fff',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#1d4ed8'}
            onMouseLeave={e=>e.currentTarget.style.background='#2563eb'}>
            <IcEdit/> Edit User
          </button>
        </div>
      </div>
    </>
  );
}

// ── Delete Modal ─────────────────────────────────────────────
function DeleteModal({ user, onClose, onConfirm, deleting }) {
  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:200,backdropFilter:'blur(4px)',
    }}>
      <div style={{
        background:'#fff',borderRadius:20,width:'100%',maxWidth:420,
        boxShadow:'0 24px 64px rgba(0,0,0,0.18)',padding:'32px',margin:'0 16px',
      }}>
        <div style={{
          width:52,height:52,borderRadius:'50%',background:'#fef2f2',
          border:'1px solid #fecaca',display:'flex',alignItems:'center',
          justifyContent:'center',margin:'0 auto 18px',color:'#dc2626',
        }}>
          <IcTrash/>
        </div>
        <h2 style={{textAlign:'center',fontSize:17,fontWeight:800,color:'#111827',margin:'0 0 8px'}}>
          Delete User
        </h2>
        <p style={{textAlign:'center',fontSize:13,color:'#6b7280',margin:'0 0 4px'}}>
          You are about to permanently delete
        </p>
        <p style={{textAlign:'center',fontSize:14,fontWeight:700,color:'#374151',margin:'0 0 4px'}}>
          {displayName(user)}
        </p>
        <p style={{textAlign:'center',fontSize:12,color:'#9ca3af',margin:'0 0 24px'}}>
          This action cannot be undone.
        </p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{
            flex:1,padding:'11px',borderRadius:10,border:'1px solid #e5e7eb',
            background:'#fff',cursor:'pointer',fontSize:14,fontWeight:600,color:'#374151',
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex:1,padding:'11px',borderRadius:10,border:'none',
            background:deleting?'#fca5a5':'#dc2626',color:'#fff',
            cursor:deleting?'not-allowed':'pointer',fontSize:14,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            {deleting && <Spinner size={15} light/>}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function UsersPage() {
  const navigate = useNavigate();
  const [users,        setUsers]        = useState([]);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterRole,   setFilterRole]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page,         setPage]         = useState(0);
  const [delModal,     setDelModal]     = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [drawerUser,   setDrawerUser]   = useState(null);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

  // ── Data loading ─────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/admin/users');
      setUsers(data);
    } catch { toast.error('Failed to load users.'); }
    finally  { setLoading(false); }
    try {
      const { data } = await api.get('/api/v1/users/me');
      setProfile(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  // ── KPI ──────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const total      = users.length;
    const companions = users.filter(u => u.role === 'COMPANION').length;
    const active     = users.filter(u => userStatus(u) === 'active').length;
    const inactive   = users.filter(u => userStatus(u) !== 'active').length;
    return { total, companions, active, inactive };
  }, [users]);

  // ── Filtered list ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...users];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        displayName(u).toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    }
    if (filterRole)   list = list.filter(u => u.role === filterRole);
    if (filterStatus) list = list.filter(u => userStatus(u) === filterStatus);
    return list;
  }, [users, search, filterRole, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage    = Math.min(page, totalPages - 1);
  const pageData   = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  useEffect(() => setPage(0), [search, filterRole, filterStatus]);

  // ── Handlers ─────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delModal) return;
    setDeleting(true);
    try {
      await api.delete('/api/v1/admin/users/' + delModal.id);
      toast.success('User deleted.');
      setDelModal(null);
      setDrawerUser(null);
      load();
    } catch (err) {
      if (err.response?.status === 409) toast.error('Cannot delete: user has linked data.');
      else toast.error('Failed to delete user.');
    } finally { setDeleting(false); }
  };

  const exportCsv = () => {
    const header = ['ID','Name','Email','Role','Phone','Address'];
    const rows = users.map(u => [u.id, displayName(u), u.email??'', u.role??'', u.telephone??'', u.adresse??'']);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success('CSV exported.');
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      height:'100vh', display:'flex', flexDirection:'row',
      background:'#f8fafc', overflow:'hidden',
      fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => toggleSidebar()}
        items={[
          {Icon:IcHome,  label:'Dashboard',    path:'/admin'},
          {Icon:IcUsers, label:'Users',        path:'/admin/users'},
          {Icon:IcLink,  label:'Associations', path:'/admin/associations'},
          {Icon:IcBar,   label:'Reports',      path:'/admin/reports'},
          {Icon:IcUser,  label:'My Profile',   path:'/profile'},
        ]}
      />

      <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0}}>

        {/* ════ HEADER ════ */}
        <header style={{
          height:56, background:'#fff', borderBottom:'1px solid #e5e7eb',
          padding:'0 22px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)', zIndex:20,
        }}>
          {/* Left: hamburger + breadcrumb */}
          <div style={{display:'flex', alignItems:'center', gap:14}}>
            <button
              onClick={() => toggleSidebar()}
              style={{
                width:32,height:32,borderRadius:7,border:'1px solid #e5e7eb',
                background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
                justifyContent:'center',color:'#6b7280',flexShrink:0,
              }}
              onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <IcMenu/>
            </button>
            <nav style={{display:'flex', alignItems:'center', gap:7}}>
              <button onClick={() => navigate('/admin')} style={{
                background:'none',border:'none',cursor:'pointer',
                fontSize:13,color:'#6b7280',fontWeight:500,padding:0,
              }}
                onMouseEnter={e=>e.currentTarget.style.color='#374151'}
                onMouseLeave={e=>e.currentTarget.style.color='#6b7280'}>
                Dashboard
              </button>
              <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,color:'#d1d5db'}}
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
              <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>Users</span>
            </nav>
          </div>

          {/* Right: profile pill */}
          <div style={{position:'relative'}}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{
                display:'flex',alignItems:'center',gap:8,
                border:'1px solid #e5e7eb',borderRadius:9,
                padding:'5px 10px 5px 6px',cursor:'pointer',
                background: profileOpen?'#f9fafb':'#fff', transition:'background 0.15s',
              }}
              onMouseEnter={e=>!profileOpen&&(e.currentTarget.style.background='#f9fafb')}
              onMouseLeave={e=>!profileOpen&&(e.currentTarget.style.background='#fff')}>
              <UserAvatar user={profile} size={26}/>
              <span style={{
                fontSize:13,fontWeight:600,color:'#111827',
                maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              }}>
                {displayName(profile) || 'Admin'}
              </span>
              <span style={{color:'#9ca3af'}}><IcChevD/></span>
            </button>
            {profileOpen && (
              <ProfileDropdown profile={profile} onClose={() => setProfileOpen(false)}/>
            )}
          </div>
        </header>

        {/* ════ MAIN ════ */}
        <main style={{flex:1, overflowY:'auto', padding:'22px 24px 48px'}}>

          {/* Page heading */}
          <div style={{marginBottom:20}}>
            <h1 style={{
              fontSize:22,fontWeight:800,color:'#111827',
              margin:0,letterSpacing:'-0.4px',
            }}>Users</h1>
          </div>

          {/* KPI row */}
          <div style={{
            display:'grid',gridTemplateColumns:'repeat(4,1fr)',
            gap:12,marginBottom:18,
          }}>
            <KpiCard Icon={IcUsers}    label="Total Users"  value={kpi.total}      iconColor="#2563eb" iconBg="#eff6ff"  loading={loading}/>
            <KpiCard Icon={() => (
              <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            )}                         label="Active Users"  value={kpi.active}     iconColor="#15803d" iconBg="#f0fdf4"  loading={loading}/>
            <KpiCard Icon={() => (
              <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            )}                         label="Companions"    value={kpi.companions} iconColor="#7c3aed" iconBg="#f5f3ff"  loading={loading}/>
            <KpiCard Icon={IcClock}    label="Inactive"      value={kpi.inactive}   iconColor="#6b7280" iconBg="#f9fafb"  loading={loading}/>
          </div>

          {/* Toolbar */}
          <div style={{
            background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',
            padding:'10px 14px',marginBottom:14,
            display:'flex',alignItems:'center',gap:10,
            boxShadow:'0 1px 3px rgba(0,0,0,0.03)',
          }}>
            {/* Search */}
            <div style={{position:'relative',flex:1,minWidth:200}}>
              <span style={{
                position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',
                color:'#9ca3af',pointerEvents:'none',
              }}><IcSearch/></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search user..."
                style={{
                  width:'100%',padding:'8px 12px 8px 34px',fontSize:13,
                  border:'1px solid #e5e7eb',borderRadius:8,background:'#f9fafb',
                  color:'#374151',outline:'none',boxSizing:'border-box',fontFamily:'inherit',
                }}
                onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.background='#fff';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.08)';}}
                onBlur={e=>{e.target.style.borderColor='#e5e7eb';e.target.style.background='#f9fafb';e.target.style.boxShadow='none';}}
              />
            </div>

            <div style={{width:1,height:26,background:'#e5e7eb',flexShrink:0}}/>

            {/* Role filter */}
            <div style={{position:'relative'}}>
              <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} style={{
                padding:'8px 28px 8px 11px',fontSize:12,
                border:`1px solid ${filterRole?'#bfdbfe':'#e5e7eb'}`,borderRadius:8,
                background:filterRole?'#eff6ff':'#fff',
                color:filterRole?'#2563eb':'#6b7280',
                appearance:'none',outline:'none',cursor:'pointer',
                fontFamily:'inherit',fontWeight:500,
              }}>
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="COMPANION">Companion</option>
                <option value="VISUAL_IMPAIRED">Visually Impaired</option>
              </select>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                            pointerEvents:'none',color:'#9ca3af'}}><IcChevD/></span>
            </div>

            {/* Status filter */}
            <div style={{position:'relative'}}>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{
                padding:'8px 28px 8px 11px',fontSize:12,
                border:`1px solid ${filterStatus?'#bfdbfe':'#e5e7eb'}`,borderRadius:8,
                background:filterStatus?'#eff6ff':'#fff',
                color:filterStatus?'#2563eb':'#6b7280',
                appearance:'none',outline:'none',cursor:'pointer',
                fontFamily:'inherit',fontWeight:500,
              }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                            pointerEvents:'none',color:'#9ca3af'}}><IcChevD/></span>
            </div>

            {/* Reset filters */}
            {(search || filterRole || filterStatus) && (
              <button onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
                style={{
                  padding:'7px 12px',borderRadius:7,border:'none',background:'none',
                  cursor:'pointer',fontSize:12,color:'#6b7280',fontWeight:500,flexShrink:0,
                }}
                onMouseEnter={e=>e.currentTarget.style.background='#f3f4f6'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                Reset
              </button>
            )}

            {/* Right actions */}
            <div style={{marginLeft:'auto',display:'flex',gap:8}}>
              <button onClick={exportCsv} style={{
                display:'flex',alignItems:'center',gap:6,padding:'8px 14px',
                borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',
                cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <IcDownload/> Export
              </button>
              <button onClick={() => navigate('/admin/users/add')} style={{
                display:'flex',alignItems:'center',gap:6,padding:'8px 16px',
                borderRadius:8,border:'none',background:'#2563eb',
                cursor:'pointer',fontSize:12,fontWeight:700,color:'#fff',
                boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='#1d4ed8'}
                onMouseLeave={e=>e.currentTarget.style.background='#2563eb'}>
                <IcPlus/> Add User
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{
            background:'#fff',borderRadius:14,border:'1px solid #e5e7eb',
            boxShadow:'0 1px 4px rgba(0,0,0,0.04)',overflow:'hidden',marginBottom:14,
          }}>
            {/* Sticky header */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'40px 2fr 1.4fr 2fr 1fr 1.2fr 1fr 48px',
              padding:'10px 18px',background:'#f9fafb',borderBottom:'1px solid #e5e7eb',
              position:'sticky',top:0,zIndex:1,
            }}>
              {['','Full Name','Role','Email','Status','Last Activity','Created',''].map((h,i) => (
                <span key={i} style={{
                  fontSize:11,fontWeight:700,color:'#9ca3af',
                  textTransform:'uppercase',letterSpacing:'0.07em',
                }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <div style={{display:'flex',justifyContent:'center',padding:60}}>
                <Spinner size={32}/>
              </div>
            ) : pageData.length === 0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 0',gap:10}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'#f3f4f6',
                             display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}>
                  <IcSearch/>
                </div>
                <p style={{fontWeight:700,fontSize:15,color:'#374151',margin:0}}>No users found</p>
                <p style={{color:'#9ca3af',fontSize:13,margin:0}}>Try adjusting your search or filters.</p>
              </div>
            ) : pageData.map((u, idx) => {
              const status = userStatus(u);
              return (
                <div key={u.id}
                  style={{
                    display:'grid',
                    gridTemplateColumns:'40px 2fr 1.4fr 2fr 1fr 1.2fr 1fr 48px',
                    padding:'11px 18px',alignItems:'center',
                    borderBottom: idx < pageData.length-1 ? '1px solid #f3f4f6' : 'none',
                    background:'#fff', transition:'background 0.1s', cursor:'pointer',
                  }}
                  onClick={() => setDrawerUser(u)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>

                  {/* Avatar */}
                  <UserAvatar user={u} size={32}/>

                  {/* Full Name */}
                  <span style={{
                    fontSize:13,fontWeight:600,color:'#111827',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap', paddingRight:8,
                  }}>{displayName(u)}</span>

                  {/* Role */}
                  <div style={{ overflow:'hidden' }}><RoleBadge role={u.role}/></div>

                  {/* Email — ellipsis + tooltip */}
                  <span
                    title={u.email ?? ''}
                    style={{fontSize:12,color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>
                    {u.email ?? '—'}
                  </span>

                  {/* Status */}
                  <div style={{ overflow:'hidden' }}><StatusBadge status={status}/></div>

                  {/* Last Activity */}
                  <span style={{fontSize:12,color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {u.derniereConnexion ? timeAgo(u.derniereConnexion) : 'Never'}
                  </span>

                  {/* Created At */}
                  <span style={{fontSize:12,color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fmtDate(u.createdAt)}</span>

                  {/* Actions — stop propagation to prevent row click */}
                  <div onClick={e => e.stopPropagation()} style={{display:'flex',alignItems:'center',justifyContent:'flex-end'}}>
                    <ActionMenu
                      user={u}
                      onView={u => setDrawerUser(u)}
                      onEdit={u => navigate('/admin/users/edit',{state:{user:u}})}
                      onDelete={u => setDelModal(u)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontSize:12,color:'#9ca3af',margin:0}}>
                {curPage*PAGE_SIZE+1}–{Math.min((curPage+1)*PAGE_SIZE, filtered.length)} of {filtered.length} users
              </p>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={curPage===0}
                  style={{
                    width:30,height:30,borderRadius:7,border:'1px solid #e5e7eb',
                    background:'#fff',cursor:curPage===0?'not-allowed':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    opacity:curPage===0?0.4:1,color:'#374151',
                  }}><IcChevL/></button>
                {Array.from({length:totalPages},(_,i) => (
                  <button key={i} onClick={() => setPage(i)} style={{
                    width:30,height:30,borderRadius:7,fontWeight:700,fontSize:12,
                    border: i===curPage?'none':'1px solid #e5e7eb',
                    background: i===curPage?'#2563eb':'#fff',
                    color: i===curPage?'#fff':'#374151',cursor:'pointer',
                  }}>{i+1}</button>
                ))}
                <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={curPage>=totalPages-1}
                  style={{
                    width:30,height:30,borderRadius:7,border:'1px solid #e5e7eb',
                    background:'#fff',cursor:curPage>=totalPages-1?'not-allowed':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    opacity:curPage>=totalPages-1?0.4:1,color:'#374151',
                  }}><IcChevR/></button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Detail Drawer */}
      {drawerUser && (
        <UserDrawer
          baseUser={drawerUser}
          onClose={() => setDrawerUser(null)}
          onEdit={u => { setDrawerUser(null); navigate('/admin/users/edit',{state:{user:u}}); }}
          onDelete={u => { setDrawerUser(null); setDelModal(u); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {delModal && (
        <DeleteModal user={delModal} onClose={() => setDelModal(null)}
          onConfirm={handleDelete} deleting={deleting}/>
      )}

      <Toaster position="top-right" toastOptions={{style:{fontSize:13,fontWeight:600}}}/>
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
