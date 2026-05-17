/**
 * UsersPage.jsx — AssistWalk Admin
 * Professional — SVG icons only, clean design
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return s + 's ago';
  if (s < 3600)  return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
const ROLE_META = {
  COMPANION:       { label:'Companion', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
  VISUAL_IMPAIRED: { label:'User',      color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  ADMIN:           { label:'Admin',     color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
};
function roleMeta(r) { return ROLE_META[r] ?? { label:r||'Unknown', color:'#6b7280', bg:'#f3f4f6', border:'#e5e7eb' }; }
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return COLORS[(id || 0) % COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return ((p + ' ' + n).trim() || u?.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return (p + ' ' + n).trim() || u?.email?.split('@')[0] || ('User #' + u?.id);
}
const PAGE_SIZE = 8;

// ── SVG Icons ─────────────────────────────────────────────────
const ic = (d, w=18, h=18) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{width:w,height:h,flexShrink:0}}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcHome    = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcUsers   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink    = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar     = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcGear    = ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>);
const IcSearch  = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, 16, 16);
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 14, 14);
const IcPlus    = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 16, 16);
const IcDownload= ic(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>, 15, 15);
const IcEdit    = ic(<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>, 14, 14);
const IcTrash   = ic(<><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>, 14, 14);
const IcEye     = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>, 14, 14);
const IcDotsV   = ic(<><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></>, 14, 14);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcHelp    = ic(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 17, 17);
const IcChevL   = ic(<polyline points="10,4 6,8 10,12"/>, 14, 14);
const IcChevR   = ic(<polyline points="6,4 10,8 6,12"/>, 14, 14);
const IcFilter  = ic(<><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></>, 15, 15);
const IcReset   = ic(<><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>, 14, 14);
const IcCheck   = ic(<polyline points="20,6 9,17 4,12"/>, 13, 13);

// KPI-specific icons (24px)
const KicUsers  = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, 24, 24);
const KicActive = ic(<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></>, 24, 24);
const KicLink   = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>, 24, 24);
const KicInactive = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>, 24, 24);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=24, light=false }) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="4"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, size=36 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:avColor(user?.id),
      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700, fontSize:size>40?15:12, letterSpacing:'-0.5px',
    }}>
      {initials(user)}
    </div>
  );
}

// ── Sidebar NavItem ───────────────────────────────────────────
function NavItem({ Icon, label, active, badge, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width:'100%', display:'flex', alignItems:'center', gap:10,
        padding:'10px 13px', borderRadius:10, border:'none', cursor:'pointer',
        background: active?'#2563eb': hov?'#f3f4f6':'transparent',
        color: active?'#fff': hov?'#111827':'#6b7280',
        fontWeight:600, fontSize:14, textAlign:'left', transition:'all 0.15s',
        boxShadow: active?'0 2px 8px rgba(37,99,235,0.22)':'none',
      }}>
      <Icon />
      <span style={{flex:1}}>{label}</span>
      {badge > 0 && (
        <span style={{background:active?'#fff':'#ef4444', color:active?'#2563eb':'#fff',
          fontSize:11, fontWeight:800, width:20, height:20, borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center'}}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ Icon, iconColor, bgIcon, label, value, sub, trend, loading }) {
  const up = trend >= 0;
  return (
    <div style={{background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
                 boxShadow:'0 1px 4px rgba(0,0,0,0.05)', padding:'20px 22px'}}>
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
        <div style={{width:52, height:52, borderRadius:14, background:bgIcon,
                     display:'flex', alignItems:'center', justifyContent:'center',
                     color:iconColor, flexShrink:0}}>
          <Icon />
        </div>
        <div>
          <p style={{fontSize:11, color:'#6b7280', fontWeight:600, margin:'0 0 4px',
                     textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</p>
          {loading
            ? <div style={{height:26, width:44, background:'#f3f4f6', borderRadius:6}}/>
            : <p style={{fontSize:26, fontWeight:800, color:'#111827', margin:0, lineHeight:1}}>{value}</p>
          }
        </div>
      </div>
      {!loading && (
        <div style={{display:'flex', alignItems:'center', gap:6,
                     paddingTop:12, borderTop:'1px solid #f3f4f6'}}>
          <span style={{fontSize:11, fontWeight:700,
            color:up?'#16a34a':'#dc2626', background:up?'#f0fdf4':'#fef2f2',
            padding:'2px 7px', borderRadius:20}}>
            {up?'↑':'↓'} {Math.abs(trend)}%
          </span>
          <span style={{fontSize:11, color:'#9ca3af'}}>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────
function DeleteModal({ user, onClose, onConfirm, deleting }) {
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
                 display:'flex', alignItems:'center', justifyContent:'center',
                 zIndex:100, backdropFilter:'blur(3px)'}}>
      <div style={{background:'#fff', borderRadius:20, width:'100%', maxWidth:440,
                   boxShadow:'0 24px 64px rgba(0,0,0,0.16)', padding:'32px', margin:'0 16px'}}>
        <div style={{width:56, height:56, borderRadius:'50%', background:'#fef2f2',
                     border:'1px solid #fecaca',
                     display:'flex', alignItems:'center', justifyContent:'center',
                     margin:'0 auto 20px', color:'#dc2626'}}>
          <IcTrash />
        </div>
        <h2 style={{textAlign:'center', fontSize:18, fontWeight:800, color:'#111827',
                    margin:'0 0 10px', letterSpacing:'-0.3px'}}>Delete User</h2>
        <p style={{textAlign:'center', fontSize:13, color:'#6b7280', margin:'0 0 6px'}}>
          Are you sure you want to delete
        </p>
        <p style={{textAlign:'center', fontSize:14, fontWeight:700, color:'#374151', margin:'0 0 6px'}}>
          {displayName(user)}
        </p>
        <p style={{textAlign:'center', fontSize:12, color:'#9ca3af', margin:'0 0 28px'}}>
          This action cannot be undone.
        </p>
        <div style={{display:'flex', gap:10}}>
          <button onClick={onClose} style={{flex:1, padding:'11px', borderRadius:10,
            border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer',
            fontSize:14, fontWeight:600, color:'#374151'}}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{flex:1, padding:'11px',
            borderRadius:10, border:'none',
            background:deleting?'#fca5a5':'#dc2626', color:'#fff',
            cursor:deleting?'not-allowed':'pointer', fontSize:14, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 2px 8px rgba(220,38,38,0.25)'}}>
            {deleting && <Spinner size={16} light/>}
            {deleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Icon button ───────────────────────────────────────────────
function IconBtn({ Icon, onClick, title, danger=false }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width:30, height:30, borderRadius:7, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        border: hov && danger ? '1px solid #fecaca' : '1px solid #e5e7eb',
        background: hov ? (danger?'#fef2f2':'#f9fafb') : '#fff',
        color: hov ? (danger?'#dc2626':'#374151') : '#9ca3af',
        transition:'all 0.15s',
      }}>
      <Icon />
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function UsersPage() {
  const navigate = useNavigate();
  const [users,     setUsers]     = useState([]);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterRole,setFilterRole]= useState('');
  const [page,      setPage]      = useState(0);
  const [delModal,  setDelModal]  = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(null);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/api/v1/admin/users'); setUsers(data); }
    catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
    try { const { data } = await api.get('/api/v1/users/me'); setProfile(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const companions  = users.filter(u => u.role === 'COMPANION').length;
  const inactive    = users.filter(u => !u.derniereConnexion ||
    (Date.now() - new Date(u.derniereConnexion)) > 30*24*3600*1000).length;
  const activeCount = users.length - inactive;

  const filtered = useMemo(() => {
    let list = [...users];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => displayName(u).toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q));
    }
    if (filterRole) list = list.filter(u => u.role === filterRole);
    return list;
  }, [users, search, filterRole]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage    = Math.min(page, totalPages - 1);
  const pageData   = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  useEffect(() => setPage(0), [search, filterRole]);

  const handleDelete = async () => {
    if (!delModal) return;
    setDeleting(true);
    try {
      await api.delete('/api/v1/admin/users/' + delModal.id);
      toast.success('User deleted.');
      setDelModal(null);
      load();
    } catch (err) {
      if (err.response?.status === 409) toast.error('Cannot delete: user has linked data.');
      else toast.error('Failed to delete user.');
    } finally { setDeleting(false); }
  };

  const exportCsv = () => {
    const rows = [['ID','Name','Email','Role','Phone','Created'],
      ...users.map(u => [u.id, displayName(u), u.email??'', u.role??'', u.telephone??'', fmtDate(u.createdAt)])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = 'users.csv';
    a.click();
    toast.success('CSV exported.');
  };

  const adminName = displayName(profile) || 'Administrator';
  const adminInit = adminName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'A';

  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column',
                 background:'#f8fafc', overflow:'hidden',
                 fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>

      {/* HEADER */}
      <header style={{height:62, background:'#fff', borderBottom:'1px solid #e5e7eb',
                      padding:'0 24px', display:'flex', alignItems:'center',
                      justifyContent:'space-between', flexShrink:0,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.05)', zIndex:20}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{width:38, height:38, borderRadius:10, background:'#2563eb',
                       display:'flex', alignItems:'center', justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" fill="white" style={{width:22,height:22}}>
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
          <Avatar user={profile} size={36}/>
          <div>
            <p style={{fontSize:13, fontWeight:700, color:'#111827', margin:0, lineHeight:1.2}}>{adminName}</p>
            <p style={{fontSize:11, color:'#9ca3af', margin:0}}>Administrator</p>
          </div>
          <button onClick={logout} style={{display:'flex', alignItems:'center', gap:6,
            border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 14px',
            background:'none', cursor:'pointer', color:'#6b7280', fontSize:13,
            fontWeight:600, marginLeft:8}}>
            <IcLogout /> Logout
          </button>
        </div>
      </header>

      <div style={{flex:1, display:'flex', minHeight:0}}>

        {/* SIDEBAR */}
        <aside style={{width:200, background:'#fff', borderRight:'1px solid #e5e7eb',
                       display:'flex', flexDirection:'column', flexShrink:0, padding:'14px 10px', gap:2}}>
          <NavItem Icon={IcHome}  label="Dashboard"    active={false} onClick={() => navigate('/admin')}/>
          <NavItem Icon={IcUsers} label="Users"        active={true}  onClick={() => {}}/>
          <NavItem Icon={IcLink}  label="Associations" active={false} onClick={() => navigate('/admin/associations')}/>
          <NavItem Icon={IcBar}   label="Reports"      active={false} onClick={() => navigate('/admin/reports')}/>
          <NavItem Icon={IcGear}  label="Settings"     active={false} onClick={() => {}}/>
          <div style={{flex:1}}/>
          <div style={{background:'#eff6ff', borderRadius:14, padding:'12px',
                       display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:'50%', background:'#2563eb',
                         flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                         color:'#fff'}}>
              <IcHelp />
            </div>
            <div>
              <p style={{fontSize:12, fontWeight:700, color:'#1e40af', margin:0}}>Need help?</p>
              <a href="#" style={{fontSize:11, color:'#3b82f6', textDecoration:'none'}}>Contact support</a>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1, overflowY:'auto', padding:'26px 28px 40px'}}>

          {/* Page header */}
          <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24}}>
            <div>
              <h1 style={{fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 4px', letterSpacing:'-0.5px'}}>
                Users
              </h1>
              <p style={{fontSize:14, color:'#6b7280', margin:0}}>
                Manage all registered users of the AssistWalk system.
              </p>
            </div>
            <div style={{display:'flex', gap:10}}>
              <button onClick={exportCsv} style={{display:'flex', alignItems:'center', gap:7,
                border:'1px solid #e5e7eb', borderRadius:9, padding:'9px 16px',
                background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                <IcDownload /> Export
              </button>
              <button onClick={() => navigate('/admin/users/add')}
                style={{display:'flex', alignItems:'center', gap:7,
                  border:'none', borderRadius:9, padding:'9px 18px',
                  background:'#2563eb', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff',
                  boxShadow:'0 2px 10px rgba(37,99,235,0.28)', transition:'background 0.15s'}}
                onMouseEnter={e => e.currentTarget.style.background='#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.background='#2563eb'}>
                <IcPlus /> Add User
              </button>
            </div>
          </div>

          {/* KPI row */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22}}>
            <KpiCard Icon={KicUsers}    iconColor="#2563eb" bgIcon="#eff6ff"
              label="Total Users"    value={users.length}  sub="All registered users"        trend={12}  loading={loading}/>
            <KpiCard Icon={KicActive}   iconColor="#16a34a" bgIcon="#f0fdf4"
              label="Active Users"   value={activeCount}   sub="Active in last 30 days"      trend={9}   loading={loading}/>
            <KpiCard Icon={KicLink}     iconColor="#7c3aed" bgIcon="#f5f3ff"
              label="Companions"     value={companions}    sub="Active companions"            trend={8}   loading={loading}/>
            <KpiCard Icon={KicInactive} iconColor="#d97706" bgIcon="#fffbeb"
              label="Inactive Users" value={inactive}      sub="No activity in 30 days"      trend={-20} loading={loading}/>
          </div>

          {/* Filter bar */}
          <div style={{background:'#fff', borderRadius:14, border:'1px solid #e5e7eb',
                       padding:'12px 16px', marginBottom:16,
                       display:'flex', alignItems:'center', gap:12,
                       boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{position:'relative', flex:1}}>
              <span style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                            pointerEvents:'none'}}>
                <IcSearch />
              </span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{width:'100%', padding:'9px 12px 9px 36px', fontSize:13,
                  border:'1px solid #e5e7eb', borderRadius:9, background:'#f9fafb',
                  color:'#374151', outline:'none', boxSizing:'border-box', fontFamily:'inherit'}}
                onFocus={e => { e.target.style.borderColor='#2563eb'; e.target.style.background='#fff'; }}
                onBlur={e  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}/>
            </div>
            <div style={{position:'relative', minWidth:150}}>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                style={{width:'100%', padding:'9px 32px 9px 13px', fontSize:13,
                  border:'1px solid #e5e7eb', borderRadius:9, background:'#fff',
                  color:filterRole?'#111827':'#9ca3af', appearance:'none',
                  outline:'none', cursor:'pointer', fontFamily:'inherit'}}>
                <option value="">All Roles</option>
                <option value="VISUAL_IMPAIRED">User (Visually Impaired)</option>
                <option value="COMPANION">Companion</option>
                <option value="ADMIN">Admin</option>
              </select>
              <span style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                            pointerEvents:'none', color:'#9ca3af'}}>
                <IcChevD />
              </span>
            </div>
            <button style={{display:'flex', alignItems:'center', gap:6,
              border:'1px solid #e5e7eb', borderRadius:9, padding:'9px 14px',
              background:'#fff', cursor:'pointer', fontSize:13, color:'#374151', fontWeight:500}}>
              <IcFilter /> Filters
            </button>
            {(search || filterRole) && (
              <button onClick={() => { setSearch(''); setFilterRole(''); }}
                style={{display:'flex', alignItems:'center', gap:5,
                  border:'none', background:'none', cursor:'pointer',
                  color:'#2563eb', fontSize:13, fontWeight:600}}>
                <IcReset /> Reset
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
                       boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden', marginBottom:16}}>
            {/* Header */}
            <div style={{display:'grid',
              gridTemplateColumns:'2.5fr 130px 2fr 130px 140px 120px 110px',
              padding:'11px 22px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb'}}>
              {['User','Role','Email','Status','Last Active','Joined','Actions'].map(h => (
                <span key={h} style={{fontSize:11, fontWeight:700, color:'#6b7280',
                  textTransform:'uppercase', letterSpacing:'0.07em'}}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:64}}>
                <Spinner size={36}/>
              </div>
            ) : pageData.length === 0 ? (
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'64px 0', gap:12}}>
                <div style={{width:56, height:56, borderRadius:'50%', background:'#eff6ff',
                             display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb'}}>
                  <IcSearch />
                </div>
                <p style={{fontWeight:700, fontSize:16, color:'#374151', margin:0}}>No users found</p>
                <p style={{color:'#9ca3af', fontSize:13, margin:0}}>Try adjusting your search or filters.</p>
              </div>
            ) : pageData.map((u, idx) => {
              const rm = roleMeta(u.role);
              const isInactive = !u.derniereConnexion ||
                (Date.now() - new Date(u.derniereConnexion)) > 30*24*3600*1000;
              return (
                <div key={u.id}
                  style={{display:'grid',
                    gridTemplateColumns:'2.5fr 130px 2fr 130px 140px 120px 110px',
                    padding:'14px 22px', alignItems:'center',
                    borderBottom: idx < pageData.length-1 ? '1px solid #f3f4f6' : 'none',
                    transition:'background 0.1s'}}
                  onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                  {/* User */}
                  <div style={{display:'flex', alignItems:'center', gap:11}}>
                    <Avatar user={u}/>
                    <div>
                      <p style={{fontWeight:700, fontSize:13, color:'#111827', margin:0}}>
                        {displayName(u)}
                      </p>
                      <p style={{fontSize:11, color:'#9ca3af', margin:'1px 0 0'}}>
                        {u.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Role */}
                  <span style={{display:'inline-block', padding:'4px 11px', borderRadius:20,
                    background:rm.bg, color:rm.color, fontSize:12, fontWeight:600,
                    border:`1px solid ${rm.border}`}}>
                    {rm.label}
                  </span>

                  {/* Email */}
                  <span style={{fontSize:13, color:'#6b7280', overflow:'hidden',
                                textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {u.email ?? '—'}
                  </span>

                  {/* Status */}
                  <span style={{display:'inline-flex', alignItems:'center', gap:5,
                    padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:600,
                    background:isInactive?'#fffbeb':'#f0fdf4',
                    color:isInactive?'#d97706':'#16a34a',
                    border:`1px solid ${isInactive?'#fde68a':'#bbf7d0'}`}}>
                    {isInactive
                      ? <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11}} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                      : <IcCheck />
                    }
                    {isInactive ? 'Inactive' : 'Active'}
                  </span>

                  {/* Last Active */}
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <div style={{width:7, height:7, borderRadius:'50%',
                                 background:isInactive?'#f59e0b':'#22c55e', flexShrink:0}}/>
                    <span style={{fontSize:12, color:'#6b7280'}}>
                      {u.derniereConnexion ? timeAgo(u.derniereConnexion) : 'Never'}
                    </span>
                  </div>

                  {/* Joined */}
                  <span style={{fontSize:12, color:'#6b7280'}}>{fmtDate(u.createdAt)}</span>

                  {/* Actions */}
                  <div style={{display:'flex', alignItems:'center', gap:4, position:'relative'}}>
                    <IconBtn Icon={IcEye}   title="View"   onClick={() => {}}/>
                    <IconBtn Icon={IcEdit}  title="Edit"   onClick={() => navigate('/admin/users/edit', {state:{user:u}})}/>
                    <div style={{position:'relative'}}>
                      <IconBtn Icon={IcDotsV} title="More" onClick={() => setMenuOpen(menuOpen===u.id?null:u.id)}/>
                      {menuOpen === u.id && (
                        <>
                          <div onClick={() => setMenuOpen(null)}
                               style={{position:'fixed', inset:0, zIndex:40}}/>
                          <div style={{position:'absolute', right:0, top:'calc(100% + 4px)',
                            background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
                            boxShadow:'0 8px 24px rgba(0,0,0,0.10)', minWidth:150, zIndex:50,
                            overflow:'hidden'}}>
                            {[
                              { Icon:IcEdit,  label:'Edit user',   color:'#374151', hbg:'#f9fafb',
                                action:() => { setMenuOpen(null); navigate('/admin/users/edit', {state:{user:u}}); } },
                              { Icon:IcTrash, label:'Delete user', color:'#dc2626', hbg:'#fef2f2',
                                action:() => { setMenuOpen(null); setDelModal(u); } },
                            ].map(item => (
                              <button key={item.label} onClick={item.action}
                                style={{width:'100%', padding:'10px 14px', border:'none',
                                  background:'none', cursor:'pointer', textAlign:'left',
                                  fontSize:13, color:item.color, fontWeight:500,
                                  display:'flex', alignItems:'center', gap:8}}
                                onMouseEnter={e => e.currentTarget.style.background=item.hbg}
                                onMouseLeave={e => e.currentTarget.style.background='none'}>
                                <item.Icon /> {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <p style={{fontSize:13, color:'#6b7280', margin:0}}>
                Showing {curPage * PAGE_SIZE + 1} to{' '}
                {Math.min((curPage + 1) * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length} user{filtered.length !== 1 ? 's' : ''}
              </p>
              <div style={{display:'flex', alignItems:'center', gap:5}}>
                <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={curPage===0}
                  style={{width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb',
                    background:'#fff', cursor:curPage===0?'not-allowed':'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity:curPage===0?0.4:1, color:'#374151'}}>
                  <IcChevL />
                </button>
                {Array.from({length:totalPages}, (_,i) => (
                  <button key={i} onClick={() => setPage(i)} style={{width:32, height:32,
                    borderRadius:8,
                    border:i===curPage?'none':'1px solid #e5e7eb',
                    background:i===curPage?'#2563eb':'#fff',
                    color:i===curPage?'#fff':'#374151',
                    cursor:'pointer', fontWeight:700, fontSize:13}}>
                    {i+1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                  disabled={curPage>=totalPages-1}
                  style={{width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb',
                    background:'#fff', cursor:curPage>=totalPages-1?'not-allowed':'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity:curPage>=totalPages-1?0.4:1, color:'#374151'}}>
                  <IcChevR />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {delModal && (
        <DeleteModal user={delModal} onClose={() => setDelModal(null)}
          onConfirm={handleDelete} deleting={deleting}/>
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