/**
 * AssociationsPage.jsx — AssistWalk Admin
 * Premium SaaS healthcare design
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api, { API_BASE } from '../../api/axiosInstance';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function isThisMonth(d) {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getMonth() === n.getMonth() && dt.getFullYear() === n.getFullYear();
}
const AV_COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777','#059669'];
function avColor(id) { return AV_COLORS[(id || 0) % AV_COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return ((p+' '+n).trim() || u?.email || '?').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || '—';
}
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}
const PAGE_SIZE = 10;

// ── Icons ─────────────────────────────────────────────────────
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
const IcPlus    = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 15, 15);
const IcTrash   = ic(<><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>, 14, 14);
const IcEdit    = ic(<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>, 14, 14);
const IcSearch  = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, 15, 15);
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcChevL   = ic(<polyline points="10,4 6,8 10,12"/>, 13, 13);
const IcChevR   = ic(<polyline points="6,4 10,8 6,12"/>, 13, 13);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcDownload= ic(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>, 15, 15);
const IcMenu    = ic(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, 17, 17);
const IcArrow   = ic(<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="14,7 19,12 14,17"/></>, 14, 14);
const IcX       = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, 16, 16);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=24, light=false }) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="4"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar with photo ─────────────────────────────────────────
function UserAvatar({ user, size=36, ring=false }) {
  const photo = resolvePhoto(user?.photoUrl);
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background: photo ? 'transparent' : avColor(user?.id),
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700,
      fontSize: size>50?18:size>36?14:12,
      overflow:'hidden',
      boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 3.5px ${avColor(user?.id)}` : 'none',
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
        <Icon/>
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

// ── Action Icon Button ────────────────────────────────────────
function ActionBtn({ Icon, title, onClick, danger=false }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width:28, height:28, borderRadius:6, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        border:`1px solid ${hov&&danger?'#fecaca':hov?'#d1d5db':'#e5e7eb'}`,
        background:hov?(danger?'#fef2f2':'#f9fafb'):'#fff',
        color:hov?(danger?'#dc2626':'#374151'):'#9ca3af',
        transition:'all 0.12s',
      }}>
      <Icon/>
    </button>
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
        <div style={{padding:'14px 16px',borderBottom:'1px solid #f1f5f9',
                     display:'flex',alignItems:'center',gap:10}}>
          <UserAvatar user={profile} size={38} ring/>
          <div style={{minWidth:0}}>
            <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                       overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {displayName(profile)||'Administrator'}
            </p>
            <p style={{fontSize:12,color:'#9ca3af',margin:0,
                       overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {profile?.email||''}
            </p>
          </div>
        </div>
        <button onClick={() => { onClose(); navigate('/profile'); }}
          style={{width:'100%',padding:'10px 16px',border:'none',background:'none',
                  cursor:'pointer',textAlign:'left',fontSize:13,color:'#374151',
                  fontWeight:500,display:'flex',alignItems:'center',gap:9}}
          onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IcUser/> My Profile
        </button>
        <div style={{height:1,background:'#f1f5f9',margin:'0 16px'}}/>
        <button onClick={() => { onClose(); logout(); }}
          style={{width:'100%',padding:'10px 16px',border:'none',background:'none',
                  cursor:'pointer',textAlign:'left',fontSize:13,color:'#dc2626',
                  fontWeight:500,display:'flex',alignItems:'center',gap:9,margin:'4px 0'}}
          onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IcLogout/> Logout
        </button>
      </div>
    </>
  );
}

// ── Delete Modal ──────────────────────────────────────────────
function DeleteModal({ assoc, onClose, onConfirm, deleting }) {
  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:200,backdropFilter:'blur(4px)',
    }}>
      <div style={{
        background:'#fff',borderRadius:20,width:'100%',maxWidth:420,
        boxShadow:'0 24px 64px rgba(0,0,0,0.18)',padding:'28px',margin:'0 16px',
      }}>
        <div style={{
          width:48,height:48,borderRadius:'50%',background:'#fef2f2',
          border:'1px solid #fecaca',display:'flex',alignItems:'center',
          justifyContent:'center',margin:'0 auto 16px',color:'#dc2626',
        }}>
          <IcTrash/>
        </div>
        <h2 style={{textAlign:'center',fontSize:16,fontWeight:800,color:'#111827',margin:'0 0 6px'}}>
          Remove Association
        </h2>
        <p style={{textAlign:'center',fontSize:13,color:'#6b7280',margin:'0 0 16px'}}>
          Are you sure you want to remove this care relationship?
        </p>

        {/* Users preview */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          padding:'14px',background:'#f8fafc',borderRadius:12,border:'1px solid #f1f5f9',
          marginBottom:20,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1,justifyContent:'flex-end'}}>
            <div style={{textAlign:'right',minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,color:'#111827',margin:0,
                         overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {displayName(assoc?.malvoyant)}
              </p>
              <p style={{fontSize:10,color:'#9ca3af',margin:0}}>Vis. Impaired</p>
            </div>
            <UserAvatar user={assoc?.malvoyant} size={34}/>
          </div>
          <div style={{
            width:28,height:28,borderRadius:'50%',background:'#eff6ff',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#2563eb',
          }}>
            <IcArrow/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}}>
            <UserAvatar user={assoc?.accompagnateur} size={34}/>
            <div style={{minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,color:'#111827',margin:0,
                         overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {displayName(assoc?.accompagnateur)}
              </p>
              <p style={{fontSize:10,color:'#9ca3af',margin:0}}>Companion</p>
            </div>
          </div>
        </div>

        <p style={{textAlign:'center',fontSize:12,color:'#9ca3af',margin:'0 0 20px'}}>
          This action cannot be undone.
        </p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{
            flex:1,padding:'10px',borderRadius:9,border:'1px solid #e5e7eb',
            background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
            onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex:1,padding:'10px',borderRadius:9,border:'none',
            background:deleting?'#fca5a5':'#dc2626',color:'#fff',
            cursor:deleting?'not-allowed':'pointer',fontSize:13,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            {deleting && <Spinner size={14} light/>}
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState({ filtered, navigate }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'56px 0',gap:12}}>
      {/* Illustration */}
      <div style={{position:'relative',marginBottom:4}}>
        <div style={{
          width:72,height:72,borderRadius:'50%',background:'#eff6ff',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          <svg viewBox="0 0 24 24" fill="none" style={{width:32,height:32,color:'#2563eb'}}
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div style={{
          position:'absolute',bottom:-2,right:-2,
          width:24,height:24,borderRadius:'50%',background:'#2563eb',
          border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',
        }}>
          <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12}}
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
      <p style={{fontWeight:700,fontSize:15,color:'#111827',margin:0}}>
        {filtered ? 'No associations found' : 'No associations yet'}
      </p>
      <p style={{color:'#9ca3af',fontSize:13,margin:0,textAlign:'center',maxWidth:280}}>
        {filtered
          ? 'Try adjusting your search or filters.'
          : 'Create the first companion-user care relationship.'}
      </p>
      {!filtered && (
        <button onClick={() => navigate('/admin/associations/new')} style={{
          marginTop:4,display:'flex',alignItems:'center',gap:6,
          border:'none',borderRadius:9,padding:'9px 18px',
          background:'#2563eb',cursor:'pointer',fontSize:13,fontWeight:700,color:'#fff',
          boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='#1d4ed8'}
          onMouseLeave={e=>e.currentTarget.style.background='#2563eb'}>
          <IcPlus/> Create Association
        </button>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AssociationsPage() {
  const navigate = useNavigate();

  const [assocs,   setAssocs]   = useState([]);
  const [users,    setUsers]    = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [delModal, setDelModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search,   setSearch]   = useState('');
  const [filterComp, setFilterComp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page,     setPage]     = useState(0);
  const [profOpen, setProfOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

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
    finally  { setLoading(false); }
    try { const { data } = await api.get('/api/v1/users/me'); setProfile(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const companions = users.filter(u => u.role === 'COMPANION');
  const thisMonth  = assocs.filter(a => isThisMonth(a.createdAt)).length;
  const userById   = id => users.find(u => u.id === id) || null;

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
        displayName(a.malvoyant).toLowerCase().includes(q) ||
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

  const exportCsv = () => {
    const header = ['VI User', 'VI Email', 'Companion', 'Companion Email', 'Created'];
    const rows = enriched.map(a => [
      displayName(a.malvoyant),
      a.malvoyant?.email ?? '',
      displayName(a.accompagnateur),
      a.accompagnateur?.email ?? '',
      fmtDate(a.createdAt),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    el.download = `associations-${new Date().toISOString().slice(0,10)}.csv`;
    el.click();
    toast.success('CSV exported.');
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      height:'100vh', display:'flex', flexDirection:'row',
      background:'#f8fafc', overflow:'hidden',
      fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
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

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* ════ HEADER ════ */}
        <header style={{
          height:56,background:'#fff',borderBottom:'1px solid #e5e7eb',
          padding:'0 22px',display:'flex',alignItems:'center',
          justifyContent:'space-between',flexShrink:0,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)',zIndex:20,
        }}>
          {/* Left */}
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={() => toggleSidebar()} style={{
              width:32,height:32,borderRadius:7,border:'1px solid #e5e7eb',
              background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',color:'#6b7280',flexShrink:0,
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <IcMenu/>
            </button>
            <nav style={{display:'flex',alignItems:'center',gap:7}}>
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
              <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>Associations</span>
            </nav>
          </div>

          {/* Right: profile pill */}
          <div style={{position:'relative'}}>
            <button onClick={() => setProfOpen(v => !v)} style={{
              display:'flex',alignItems:'center',gap:8,
              border:'1px solid #e5e7eb',borderRadius:9,
              padding:'5px 10px 5px 6px',cursor:'pointer',
              background: profOpen?'#f9fafb':'#fff',transition:'background 0.15s',
            }}
              onMouseEnter={e=>!profOpen&&(e.currentTarget.style.background='#f9fafb')}
              onMouseLeave={e=>!profOpen&&(e.currentTarget.style.background='#fff')}>
              <UserAvatar user={profile} size={26}/>
              <span style={{fontSize:13,fontWeight:600,color:'#111827',
                            maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {displayName(profile)||'Admin'}
              </span>
              <span style={{color:'#9ca3af'}}><IcChevD/></span>
            </button>
            {profOpen && <ProfileDropdown profile={profile} onClose={() => setProfOpen(false)}/>}
          </div>
        </header>

        {/* ════ MAIN ════ */}
        <main style={{flex:1,overflowY:'auto',padding:'22px 24px 48px'}}>

          {/* Page heading + action */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:800,color:'#111827',margin:'0 0 2px',letterSpacing:'-0.4px'}}>
                Associations
              </h1>
              <p style={{fontSize:13,color:'#6b7280',margin:0}}>
                Manage care relationships between visually impaired users and their companions.
              </p>
            </div>
            <button onClick={() => navigate('/admin/associations/new')} style={{
              display:'flex',alignItems:'center',gap:6,
              border:'none',borderRadius:9,padding:'9px 16px',
              background:'#2563eb',cursor:'pointer',fontSize:13,fontWeight:700,color:'#fff',
              boxShadow:'0 2px 8px rgba(37,99,235,0.25)',flexShrink:0,
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#1d4ed8'}
              onMouseLeave={e=>e.currentTarget.style.background='#2563eb'}>
              <IcPlus/> New Association
            </button>
          </div>

          {/* KPI row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
            <KpiCard Icon={() => (
              <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            )} label="Total" value={assocs.length} iconColor="#2563eb" iconBg="#eff6ff" loading={loading}/>
            <KpiCard Icon={() => (
              <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            )} label="Active" value={assocs.length} iconColor="#15803d" iconBg="#f0fdf4" loading={loading}/>
            <KpiCard Icon={() => (
              <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )} label="New this month" value={thisMonth} iconColor="#7c3aed" iconBg="#f5f3ff" loading={loading}/>
            <KpiCard Icon={IcUsers} label="Companions" value={companions.length} iconColor="#d97706" iconBg="#fffbeb" loading={loading}/>
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
              <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',
                            color:'#9ca3af',pointerEvents:'none'}}><IcSearch/></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search associations..."
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

            {/* Companion filter */}
            <div style={{position:'relative'}}>
              <select value={filterComp} onChange={e => setFilterComp(e.target.value)} style={{
                padding:'8px 28px 8px 11px',fontSize:12,
                border:`1px solid ${filterComp?'#bfdbfe':'#e5e7eb'}`,borderRadius:8,
                background:filterComp?'#eff6ff':'#fff',
                color:filterComp?'#2563eb':'#6b7280',
                appearance:'none',outline:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500,
              }}>
                <option value="">All Companions</option>
                {companions.map(c => (
                  <option key={c.id} value={String(c.id)}>{displayName(c)}</option>
                ))}
              </select>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                            pointerEvents:'none',color:'#9ca3af'}}><IcChevD/></span>
            </div>

            {/* Reset */}
            {(search || filterComp) && (
              <button onClick={() => { setSearch(''); setFilterComp(''); }} style={{
                padding:'7px 12px',borderRadius:7,border:'none',background:'none',
                cursor:'pointer',fontSize:12,color:'#6b7280',fontWeight:500,flexShrink:0,
              }}
                onMouseEnter={e=>e.currentTarget.style.background='#f3f4f6'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                Reset
              </button>
            )}

            {/* Export */}
            <button onClick={exportCsv} style={{
              marginLeft:'auto',display:'flex',alignItems:'center',gap:6,
              padding:'8px 14px',borderRadius:8,border:'1px solid #e5e7eb',
              background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151',
              flexShrink:0,
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <IcDownload/> Export
            </button>
          </div>

          {/* Table */}
          <div style={{
            background:'#fff',borderRadius:14,border:'1px solid #e5e7eb',
            boxShadow:'0 1px 4px rgba(0,0,0,0.04)',overflow:'hidden',marginBottom:14,
          }}>
            {/* Sticky header */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'2fr 2fr 130px 110px 80px',
              padding:'10px 20px',background:'#f9fafb',
              borderBottom:'1px solid #e5e7eb',
              position:'sticky',top:0,zIndex:1,
            }}>
              {['Visually Impaired User','Companion','Created','Status','Actions'].map((h,i) => (
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
              <EmptyState filtered={!!(search || filterComp)} navigate={navigate}/>
            ) : pageData.map((a, idx) => {
              const even = idx % 2 === 0;
              return (
                <div key={a.id}
                  style={{
                    display:'grid',
                    gridTemplateColumns:'2fr 2fr 130px 110px 80px',
                    padding:'13px 20px',alignItems:'center',
                    borderBottom: idx < pageData.length-1 ? '1px solid #f3f4f6' : 'none',
                    background: even?'#fff':'#fafafa',
                    transition:'background 0.1s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                  onMouseLeave={e=>e.currentTarget.style.background=even?'#fff':'#fafafa'}>

                  {/* Visually Impaired User */}
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                    <UserAvatar user={a.malvoyant} size={34}/>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:600,color:'#111827',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {displayName(a.malvoyant)}
                      </p>
                      <p style={{fontSize:11,color:'#9ca3af',margin:'1px 0 0',
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {a.malvoyant?.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Companion */}
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                    <UserAvatar user={a.accompagnateur} size={34}/>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:600,color:'#111827',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {displayName(a.accompagnateur)}
                      </p>
                      <p style={{fontSize:11,color:'#9ca3af',margin:'1px 0 0',
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {a.accompagnateur?.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Created */}
                  <span style={{fontSize:12,color:'#6b7280'}}>{fmtDate(a.createdAt)}</span>

                  {/* Status — always active (no status field in API) */}
                  <span style={{
                    display:'inline-flex',alignItems:'center',gap:5,
                    padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                    background:'#f0fdf4',color:'#15803d',border:'1px solid #bbf7d0',
                    width:'fit-content',
                  }}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',flexShrink:0}}/>
                    Active
                  </span>

                  {/* Actions */}
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <ActionBtn Icon={IcEdit}  title="Edit association"   onClick={() => navigate('/admin/associations/new', {state:{assoc:a}})}/>
                    <ActionBtn Icon={IcTrash} title="Remove association" onClick={() => setDelModal(a)} danger/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontSize:12,color:'#9ca3af',margin:0}}>
                {curPage*PAGE_SIZE+1}–{Math.min((curPage+1)*PAGE_SIZE, filtered.length)} of {filtered.length} association{filtered.length!==1?'s':''}
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

      {delModal && (
        <DeleteModal assoc={delModal} onClose={() => setDelModal(null)}
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
