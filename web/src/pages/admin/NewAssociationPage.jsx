/**
 * NewAssociationPage.jsx — AssistWalk Admin
 * Premium enterprise healthcare workflow design
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

// ── Helpers ───────────────────────────────────────────────────
const AV_COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777','#059669'];
function avColor(id) { return AV_COLORS[(id||0) % AV_COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return ((p+' '+n).trim()||u?.email||'?').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || '—';
}
const API_BASE = 'http://localhost:8081';
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}
function todayLabel() {
  return new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}

// ── Icons ─────────────────────────────────────────────────────
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
const IcUser    = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcSearch  = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, 14, 14);
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcCheck   = ic(<polyline points="20,6 9,17 4,12"/>, 11, 11);
const IcX       = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, 14, 14);
const IcPlus    = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 15, 15);
const IcMenu    = ic(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, 17, 17);
const IcChevD   = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcPhone   = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>, 12, 12);
const IcStar    = ic(<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>, 12, 12);
const IcArrow   = ic(<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="14,7 19,12 14,17"/></>, 18, 18);
const IcCal     = ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, 14, 14);

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
function UserAvatar({ user, size=40, ring=false }) {
  const photo = resolvePhoto(user?.photoUrl);
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background: photo ? 'transparent' : avColor(user?.id),
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700,
      fontSize: size>54?20:size>38?15:12,
      overflow:'hidden',
      boxShadow: ring ? `0 0 0 2.5px #fff, 0 0 0 4px ${avColor(user?.id)}` : 'none',
    }}>
      {photo
        ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}
               onError={e => { e.currentTarget.style.display='none'; }}/>
        : initials(user)
      }
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

// ── Horizontal Stepper ────────────────────────────────────────
function Stepper({ step }) {
  const steps = ['Select User','Select Companion','Review & Confirm'];
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
      {steps.map((label, i) => {
        const n      = i + 1;
        const done   = step > n;
        const active = step === n;
        return (
          <div key={n} style={{display:'flex',alignItems:'center',flex: i < steps.length-1 ? 1 : 'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <div style={{
                width:28,height:28,borderRadius:'50%',flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',
                background: done?'#16a34a':active?'#2563eb':'#e5e7eb',
                color: done||active?'#fff':'#9ca3af',
                fontWeight:700,fontSize:12,
                boxShadow: active?'0 0 0 4px rgba(37,99,235,0.15)':done?'0 0 0 4px rgba(22,163,74,0.12)':'none',
                transition:'all 0.2s',
              }}>
                {done ? <IcCheck/> : n}
              </div>
              <span style={{
                fontSize:12,fontWeight:active||done?600:400,
                color: done?'#16a34a':active?'#2563eb':'#9ca3af',
                whiteSpace:'nowrap',transition:'color 0.2s',
              }}>{label}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{flex:1,height:1.5,margin:'0 12px',
                           background: step > n+1 ? '#bbf7d0' : step > n ? '#bfdbfe' : '#e5e7eb',
                           transition:'background 0.3s'}}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Selectable User Card ──────────────────────────────────────
function SelectCard({ user, selected, onSelect, companion=false }) {
  const isSel = selected?.id === user.id;
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => !isSel && onSelect(user)}
      onMouseEnter={() => !isSel && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'relative',
        border:`${isSel?'2px':'1.5px'} solid ${isSel?'#2563eb':hov?'#93c5fd':'#e5e7eb'}`,
        borderRadius:12,padding:'14px',
        background: isSel?'#eff6ff':hov?'#f9fafb':'#fff',
        cursor: isSel?'default':'pointer',
        transition:'all 0.15s',
        boxShadow: isSel?'0 0 0 4px rgba(37,99,235,0.08)':hov?'0 2px 8px rgba(0,0,0,0.06)':'0 1px 3px rgba(0,0,0,0.04)',
      }}>
      {/* Selected checkmark */}
      {isSel && (
        <div style={{
          position:'absolute',top:10,right:10,
          width:20,height:20,borderRadius:'50%',
          background:'#2563eb',display:'flex',alignItems:'center',
          justifyContent:'center',color:'#fff',
        }}>
          <IcCheck/>
        </div>
      )}

      {/* Avatar + basic info */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <UserAvatar user={user} size={40}/>
        <div style={{minWidth:0,flex:1}}>
          <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                     overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {displayName(user)}
          </p>
          <p style={{fontSize:11,color:'#6b7280',margin:'1px 0 0',
                     overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {user.email||'—'}
          </p>
        </div>
      </div>

      {/* Details row */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        {user.telephone && (
          <span style={{display:'flex',alignItems:'center',gap:4,
                        fontSize:11,color:'#6b7280'}}>
            <IcPhone/>{user.telephone}
          </span>
        )}
        {companion && user.anneesExperience != null && (
          <span style={{display:'flex',alignItems:'center',gap:4,
                        fontSize:11,color:'#6b7280'}}>
            <IcStar/>{user.anneesExperience} yrs exp.
          </span>
        )}
        <span style={{
          marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:4,
          padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,
          background:'#f0fdf4',color:'#15803d',border:'1px solid #bbf7d0',flexShrink:0,
        }}>
          <span style={{width:5,height:5,borderRadius:'50%',background:'#22c55e'}}/>
          Active
        </span>
      </div>
    </div>
  );
}

// ── Selected User Banner (compact, shown when chosen) ─────────
function SelectedBanner({ user, label, onClear, color='#2563eb', bg='#eff6ff', border='#bfdbfe' }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:12,
      padding:'12px 14px',borderRadius:12,
      background:bg,border:`1.5px solid ${border}`,
    }}>
      <UserAvatar user={user} size={40} ring/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:10,fontWeight:700,color,margin:'0 0 1px',
                   textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>
        <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                   overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {displayName(user)}
        </p>
        <p style={{fontSize:11,color:'#6b7280',margin:0,
                   overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {user.email||'—'}
        </p>
      </div>
      <button onClick={onClear} style={{
        display:'flex',alignItems:'center',gap:5,
        padding:'5px 10px',borderRadius:7,border:`1px solid ${border}`,
        background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,
        color:'#6b7280',flexShrink:0,
      }}
        onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <IcX/> Change
      </button>
    </div>
  );
}

// ── Step Section wrapper ──────────────────────────────────────
function StepSection({ n, total, label, sub, done, children }) {
  return (
    <div style={{marginBottom: n < total ? 20 : 0}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{
          width:24,height:24,borderRadius:'50%',flexShrink:0,
          background: done?'#16a34a':'#2563eb',
          display:'flex',alignItems:'center',justifyContent:'center',
          color:'#fff',fontWeight:700,fontSize:11,
        }}>
          {done ? <IcCheck/> : n}
        </div>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0}}>{label}</p>
          <p style={{fontSize:11,color:'#9ca3af',margin:0}}>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function NewAssociationPage() {
  const navigate  = useNavigate();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [selMal,   setSelMal]   = useState(null);
  const [selComp,  setSelComp]  = useState(null);
  const [searchMal,setSearchMal]= useState('');
  const [searchCmp,setSearchCmp]= useState('');
  const [profile,  setProfile]  = useState(null);
  const [profOpen, setProfOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

  useEffect(() => {
    api.get('/api/v1/admin/users')
      .then(({ data }) => setUsers(data))
      .catch(() => toast.error('Failed to load users.'))
      .finally(() => setLoading(false));
    api.get('/api/v1/users/me')
      .then(({ data }) => setProfile(data))
      .catch(() => {});
  }, []);

  const malvoyants = useMemo(() => users.filter(u => u.role === 'VISUAL_IMPAIRED'), [users]);
  const companions  = useMemo(() => users.filter(u => u.role === 'COMPANION'),       [users]);

  const filteredMal = useMemo(() => {
    if (!searchMal) return malvoyants;
    const q = searchMal.toLowerCase();
    return malvoyants.filter(u =>
      displayName(u).toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
    );
  }, [malvoyants, searchMal]);

  const filteredCmp = useMemo(() => {
    if (!searchCmp) return companions;
    const q = searchCmp.toLowerCase();
    return companions.filter(u =>
      displayName(u).toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
    );
  }, [companions, searchCmp]);

  const handleCreate = async () => {
    if (!selMal || !selComp) { toast.error('Please select both a user and a companion.'); return; }
    setCreating(true);
    try {
      await api.post('/api/v1/admin/associations', {
        malvoyantId:      selMal.id,
        accompagnateurId: selComp.id,
      });
      toast.success('Association created successfully.');
      setTimeout(() => navigate('/admin/associations'), 800);
    } catch (err) {
      if (err.response?.status === 409) toast.error('This association already exists.');
      else toast.error(err.response?.data?.message ?? 'Failed to create association.');
    } finally { setCreating(false); }
  };

  const both  = !!selMal && !!selComp;
  const step  = both ? 3 : selMal ? 2 : 1;

  // ── Render ─────────────────────────────────────────────────
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
          height:56, background:'#fff', borderBottom:'1px solid #e5e7eb',
          padding:'0 22px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)', zIndex:20,
        }}>
          {/* Breadcrumb */}
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
            <nav style={{display:'flex',alignItems:'center',gap:6}}>
              {[
                {label:'Dashboard',    path:'/admin'},
                {label:'Associations', path:'/admin/associations'},
                {label:'New Association', path:null},
              ].map((c,i,arr) => (
                <span key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                  {c.path
                    ? <button onClick={() => navigate(c.path)} style={{
                        background:'none',border:'none',cursor:'pointer',
                        fontSize:13,color:'#6b7280',fontWeight:500,padding:0,
                      }}
                        onMouseEnter={e=>e.currentTarget.style.color='#374151'}
                        onMouseLeave={e=>e.currentTarget.style.color='#6b7280'}>
                        {c.label}
                      </button>
                    : <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>{c.label}</span>
                  }
                  {i < arr.length-1 && (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13,color:'#d1d5db'}}
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Profile pill */}
          <div style={{position:'relative'}}>
            <button onClick={() => setProfOpen(v => !v)} style={{
              display:'flex',alignItems:'center',gap:8,
              border:'1px solid #e5e7eb',borderRadius:9,
              padding:'5px 10px 5px 6px',cursor:'pointer',
              background: profOpen?'#f9fafb':'#fff',transition:'background 0.15s',
            }}
              onMouseEnter={e=>!profOpen&&(e.currentTarget.style.background='#f9fafb')}
              onMouseLeave={e=>!profOpen&&(e.currentTarget.style.background='#fff')}>
              <UserAvatar user={profile} size={24}/>
              <span style={{fontSize:13,fontWeight:600,color:'#111827',
                            maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {displayName(profile)||'Admin'}
              </span>
              <span style={{color:'#9ca3af'}}><IcChevD/></span>
            </button>
            {profOpen && <ProfileDropdown profile={profile} onClose={() => setProfOpen(false)}/>}
          </div>
        </header>

        {/* ════ BODY ════ */}
        <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

          {/* ── LEFT / MAIN ── */}
          <div style={{flex:1,overflowY:'auto',padding:'22px 24px 80px'}}>
            <div style={{maxWidth:900,margin:'0 auto'}}>

              {/* Title */}
              <div style={{marginBottom:22}}>
                <h1 style={{fontSize:20,fontWeight:800,color:'#111827',margin:'0 0 2px',letterSpacing:'-0.4px'}}>
                  New Association
                </h1>
                <p style={{fontSize:13,color:'#6b7280',margin:0}}>
                  Create a care relationship between a visually impaired user and a companion.
                </p>
              </div>

              {/* Horizontal Stepper */}
              <Stepper step={step}/>

              {/* STEP 1 — Select Visually Impaired User */}
              <StepSection n={1} total={3} label="Select Visually Impaired User"
                sub="Choose the person who will receive care and navigation assistance."
                done={!!selMal}>
                {selMal ? (
                  <SelectedBanner user={selMal} label="Visually Impaired User"
                    onClear={() => setSelMal(null)}
                    color="#7c3aed" bg="#f5f3ff" border="#ddd6fe"/>
                ) : (
                  <>
                    <div style={{position:'relative',marginBottom:10}}>
                      <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',
                                    pointerEvents:'none',color:'#9ca3af'}}><IcSearch/></span>
                      <input value={searchMal} onChange={e => setSearchMal(e.target.value)}
                        placeholder="Search visually impaired user..."
                        style={{
                          width:'100%',padding:'9px 12px 9px 32px',fontSize:13,
                          border:'1.5px solid #e5e7eb',borderRadius:9,background:'#fff',
                          color:'#374151',outline:'none',boxSizing:'border-box',fontFamily:'inherit',
                        }}
                        onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.08)';}}
                        onBlur={e=>{e.target.style.borderColor='#e5e7eb';e.target.style.boxShadow='none';}}/>
                    </div>
                    {loading ? (
                      <div style={{display:'flex',justifyContent:'center',padding:28}}>
                        <Spinner size={26}/>
                      </div>
                    ) : filteredMal.length === 0 ? (
                      <div style={{textAlign:'center',padding:'24px 0',color:'#9ca3af',fontSize:13,
                                   background:'#fff',borderRadius:12,border:'1px solid #e5e7eb'}}>
                        No visually impaired users found.
                      </div>
                    ) : (
                      <div style={{
                        display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,
                        maxHeight:230,overflowY:'auto',paddingRight:2,
                      }}>
                        {filteredMal.map(u => (
                          <SelectCard key={u.id} user={u} selected={selMal} onSelect={setSelMal}/>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </StepSection>

              {/* Divider */}
              <div style={{height:1,background:'#f1f5f9',margin:'20px 0'}}/>

              {/* STEP 2 — Select Companion */}
              <StepSection n={2} total={3} label="Select Companion"
                sub="Choose the healthcare professional who will monitor and assist."
                done={!!selComp}>
                {selComp ? (
                  <SelectedBanner user={selComp} label="Companion"
                    onClear={() => setSelComp(null)}
                    color="#2563eb" bg="#eff6ff" border="#bfdbfe"/>
                ) : (
                  <>
                    <div style={{position:'relative',marginBottom:10}}>
                      <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',
                                    pointerEvents:'none',color:'#9ca3af'}}><IcSearch/></span>
                      <input value={searchCmp} onChange={e => setSearchCmp(e.target.value)}
                        placeholder="Search companion..."
                        style={{
                          width:'100%',padding:'9px 12px 9px 32px',fontSize:13,
                          border:'1.5px solid #e5e7eb',borderRadius:9,background:'#fff',
                          color:'#374151',outline:'none',boxSizing:'border-box',fontFamily:'inherit',
                        }}
                        onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.08)';}}
                        onBlur={e=>{e.target.style.borderColor='#e5e7eb';e.target.style.boxShadow='none';}}/>
                    </div>
                    {loading ? (
                      <div style={{display:'flex',justifyContent:'center',padding:28}}>
                        <Spinner size={26}/>
                      </div>
                    ) : filteredCmp.length === 0 ? (
                      <div style={{textAlign:'center',padding:'24px 0',color:'#9ca3af',fontSize:13,
                                   background:'#fff',borderRadius:12,border:'1px solid #e5e7eb'}}>
                        No companions found.
                      </div>
                    ) : (
                      <div style={{
                        display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,
                        maxHeight:230,overflowY:'auto',paddingRight:2,
                      }}>
                        {filteredCmp.map(u => (
                          <SelectCard key={u.id} user={u} selected={selComp} onSelect={setSelComp} companion/>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </StepSection>

              {/* Divider */}
              <div style={{height:1,background:'#f1f5f9',margin:'20px 0'}}/>

              {/* STEP 3 — Review */}
              <StepSection n={3} total={3} label="Review & Confirm"
                sub="Verify the association before creating." done={both}>
                <div style={{
                  borderRadius:14,border:`1.5px solid ${both?'#2563eb':'#e5e7eb'}`,
                  background: both?'#fff':'#f9fafb',
                  boxShadow: both?'0 0 0 4px rgba(37,99,235,0.06)':'none',
                  padding:'20px',transition:'all 0.25s',
                }}>
                  {!both ? (
                    <p style={{textAlign:'center',color:'#9ca3af',fontSize:13,margin:0,padding:'8px 0'}}>
                      Select both a user and a companion above to preview the association.
                    </p>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:0}}>

                      {/* VI User */}
                      <div style={{
                        flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                        gap:10,padding:'16px',background:'#f5f3ff',borderRadius:12,
                        border:'1px solid #ddd6fe',
                      }}>
                        <UserAvatar user={selMal} size={56} ring/>
                        <div style={{textAlign:'center'}}>
                          <span style={{
                            display:'inline-block',padding:'2px 8px',borderRadius:20,
                            fontSize:10,fontWeight:700,background:'#f5f3ff',
                            color:'#7c3aed',border:'1px solid #ddd6fe',marginBottom:4,
                          }}>Visually Impaired</span>
                          <p style={{fontSize:14,fontWeight:800,color:'#111827',margin:0,letterSpacing:'-0.2px'}}>
                            {displayName(selMal)}
                          </p>
                          <p style={{fontSize:11,color:'#6b7280',margin:'2px 0 0'}}>
                            {selMal.email||'—'}
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div style={{
                        display:'flex',flexDirection:'column',alignItems:'center',
                        gap:6,padding:'0 16px',flexShrink:0,
                      }}>
                        <div style={{
                          width:36,height:36,borderRadius:'50%',
                          background:'#eff6ff',border:'1.5px solid #bfdbfe',
                          display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb',
                        }}>
                          <IcArrow/>
                        </div>
                        <span style={{fontSize:10,fontWeight:600,color:'#9ca3af',letterSpacing:'0.04em'}}>
                          ASSIGNED TO
                        </span>
                      </div>

                      {/* Companion */}
                      <div style={{
                        flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                        gap:10,padding:'16px',background:'#eff6ff',borderRadius:12,
                        border:'1px solid #bfdbfe',
                      }}>
                        <UserAvatar user={selComp} size={56} ring/>
                        <div style={{textAlign:'center'}}>
                          <span style={{
                            display:'inline-block',padding:'2px 8px',borderRadius:20,
                            fontSize:10,fontWeight:700,background:'#eff6ff',
                            color:'#2563eb',border:'1px solid #bfdbfe',marginBottom:4,
                          }}>Companion</span>
                          <p style={{fontSize:14,fontWeight:800,color:'#111827',margin:0,letterSpacing:'-0.2px'}}>
                            {displayName(selComp)}
                          </p>
                          <p style={{fontSize:11,color:'#6b7280',margin:'2px 0 0'}}>
                            {selComp.email||'—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </StepSection>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{
            width:280,background:'#fff',borderLeft:'1px solid #e5e7eb',
            flexShrink:0,overflowY:'auto',padding:'22px 18px',
            display:'flex',flexDirection:'column',gap:14,
          }}>

            {/* Association Summary */}
            <div>
              <p style={{fontSize:11,fontWeight:700,color:'#6b7280',margin:'0 0 12px',
                         textTransform:'uppercase',letterSpacing:'0.07em'}}>
                Association Summary
              </p>

              {/* User slot */}
              <div style={{
                padding:'12px',borderRadius:10,marginBottom:8,
                background: selMal?'#f5f3ff':'#f9fafb',
                border:`1px solid ${selMal?'#ddd6fe':'#e5e7eb'}`,
                transition:'all 0.2s',
              }}>
                <p style={{fontSize:10,fontWeight:700,color:selMal?'#7c3aed':'#9ca3af',
                           margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  Visually Impaired User
                </p>
                {selMal ? (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <UserAvatar user={selMal} size={30}/>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'#111827',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {displayName(selMal)}
                      </p>
                      <p style={{fontSize:10,color:'#6b7280',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {selMal.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{fontSize:12,color:'#9ca3af',margin:0,fontStyle:'italic'}}>
                    Not selected yet
                  </p>
                )}
              </div>

              {/* Companion slot */}
              <div style={{
                padding:'12px',borderRadius:10,marginBottom:8,
                background: selComp?'#eff6ff':'#f9fafb',
                border:`1px solid ${selComp?'#bfdbfe':'#e5e7eb'}`,
                transition:'all 0.2s',
              }}>
                <p style={{fontSize:10,fontWeight:700,color:selComp?'#2563eb':'#9ca3af',
                           margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  Companion
                </p>
                {selComp ? (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <UserAvatar user={selComp} size={30}/>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'#111827',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {displayName(selComp)}
                      </p>
                      <p style={{fontSize:10,color:'#6b7280',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {selComp.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{fontSize:12,color:'#9ca3af',margin:0,fontStyle:'italic'}}>
                    Not selected yet
                  </p>
                )}
              </div>

              {/* Date + Status */}
              <div style={{
                display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,
              }}>
                <div style={{padding:'10px 12px',borderRadius:10,background:'#f8fafc',border:'1px solid #f1f5f9'}}>
                  <p style={{fontSize:10,fontWeight:700,color:'#9ca3af',margin:'0 0 3px',
                             textTransform:'uppercase',letterSpacing:'0.05em'}}>Date</p>
                  <p style={{fontSize:11,fontWeight:600,color:'#374151',margin:0}}>{todayLabel()}</p>
                </div>
                <div style={{padding:'10px 12px',borderRadius:10,
                             background: both?'#f0fdf4':'#f9fafb',
                             border:`1px solid ${both?'#bbf7d0':'#f1f5f9'}`,transition:'all 0.2s'}}>
                  <p style={{fontSize:10,fontWeight:700,color:'#9ca3af',margin:'0 0 3px',
                             textTransform:'uppercase',letterSpacing:'0.05em'}}>Status</p>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{width:6,height:6,borderRadius:'50%',flexShrink:0,
                                  background:both?'#22c55e':'#d1d5db'}}/>
                    <p style={{fontSize:11,fontWeight:600,color:both?'#15803d':'#9ca3af',margin:0}}>
                      {both ? 'Ready' : 'Incomplete'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{height:1,background:'#f1f5f9'}}/>

            {/* Progress checklist */}
            <div>
              <p style={{fontSize:11,fontWeight:700,color:'#6b7280',margin:'0 0 10px',
                         textTransform:'uppercase',letterSpacing:'0.07em'}}>Progress</p>
              {[
                {label:'Select a visually impaired user', done:!!selMal},
                {label:'Select a companion',              done:!!selComp},
                {label:'Review association',              done:both},
              ].map((item,i) => (
                <div key={i} style={{
                  display:'flex',alignItems:'center',gap:8,
                  padding:'7px 0',
                  borderBottom: i < 2 ? '1px solid #f9fafb' : 'none',
                }}>
                  <div style={{
                    width:18,height:18,borderRadius:'50%',flexShrink:0,
                    background: item.done?'#16a34a':'#e5e7eb',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'background 0.2s',
                  }}>
                    {item.done && <IcCheck/>}
                  </div>
                  <span style={{fontSize:12,color:item.done?'#15803d':'#6b7280',
                                fontWeight:item.done?600:400,transition:'color 0.2s'}}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Tip */}
            {!both && (
              <div style={{
                padding:'12px',borderRadius:10,background:'#fffbeb',border:'1px solid #fde68a',
              }}>
                <p style={{fontSize:11,fontWeight:600,color:'#b45309',margin:'0 0 4px'}}>
                  Tip
                </p>
                <p style={{fontSize:11,color:'#78350f',margin:0,lineHeight:1.5}}>
                  {!selMal
                    ? 'Start by selecting the person who needs assistance.'
                    : 'Now select a companion to monitor this user.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ════ STICKY FOOTER ════ */}
        <div style={{
          flexShrink:0,
          background:'rgba(248,250,252,0.97)',backdropFilter:'blur(8px)',
          borderTop:'1px solid #e5e7eb',padding:'12px 24px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
        }}>
          <button onClick={() => navigate('/admin/associations')} style={{
            padding:'9px 20px',borderRadius:9,border:'1px solid #e5e7eb',
            background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
            onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={creating || !both} style={{
            display:'flex',alignItems:'center',gap:8,
            padding:'9px 24px',borderRadius:9,border:'none',
            background: creating || !both ? '#93c5fd' : '#2563eb',
            color:'#fff',cursor: creating || !both ? 'not-allowed' : 'pointer',
            fontSize:13,fontWeight:700,
            boxShadow: both ? '0 2px 10px rgba(37,99,235,0.25)' : 'none',
            transition:'all 0.15s',
          }}
            onMouseEnter={e=>{ if (both && !creating) e.currentTarget.style.background='#1d4ed8'; }}
            onMouseLeave={e=>{ if (both && !creating) e.currentTarget.style.background='#2563eb'; }}>
            {creating ? <Spinner size={15} light/> : <IcPlus/>}
            {creating ? 'Creating…' : 'Create Association'}
          </button>
        </div>
      </div>

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
