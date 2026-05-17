/**
 * NewAssociationPage.jsx — AssistWalk Admin
 * Professional — SVG icons only
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';

// ── Helpers ───────────────────────────────────────────────────
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return COLORS[(id||0) % COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return ((p+' '+n).trim()||u?.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || ('User #'+u?.id);
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'; }
function nowDT() {
  const n = new Date();
  return [
    n.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
  ];
}

// ── SVG icon factory ──────────────────────────────────────────
const ic = (d,w=18,h=18) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{width:w,height:h,flexShrink:0}}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcHome   = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcUsers  = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink   = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar    = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcGear   = ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>);
const IcSearch = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,16,16);
const IcBack   = ic(<polyline points="10,4 6,8 10,12"/>,14,14);
const IcLogout = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,15,15);
const IcHelp   = ic(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,17,17);
const IcCheck  = ic(<polyline points="20,6 9,17 4,12"/>,10,10);
const IcClose  = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,15,15);
const IcPhone  = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>,13,13);
const IcCal    = ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,13,13);
const IcUser   = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,20,20);
const IcLink2  = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,20,20);
const IcUserGr = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,20,20);
const IcShield = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>,14,14);
const IcCreate = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,16,16);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({size=24, light=false}) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="4"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({user, size=38}) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:avColor(user?.id),
      flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
      color:'#fff',fontWeight:700,fontSize:size>42?15:12,letterSpacing:'-0.5px'}}>
      {initials(user)}
    </div>
  );
}

// ── Sidebar NavItem ───────────────────────────────────────────
function NavItem({Icon, label, active, onClick}) {
  const [hov,setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:'100%',display:'flex',alignItems:'center',gap:10,
        padding:'10px 13px',borderRadius:10,border:'none',cursor:'pointer',
        background:active?'#2563eb':hov?'#f3f4f6':'transparent',
        color:active?'#fff':hov?'#111827':'#6b7280',
        fontWeight:600,fontSize:14,textAlign:'left',transition:'all 0.15s',
        boxShadow:active?'0 2px 8px rgba(37,99,235,0.22)':'none'}}>
      <Icon/><span style={{flex:1}}>{label}</span>
    </button>
  );
}

// ── Step badge ────────────────────────────────────────────────
function StepBadge({n, done}) {
  return (
    <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,
      background:done?'#16a34a':'#2563eb',
      display:'flex',alignItems:'center',justifyContent:'center',
      color:'#fff',fontWeight:800,fontSize:13,
      boxShadow:'0 2px 8px rgba(37,99,235,0.2)'}}>
      {done ? <IcCheck/> : n}
    </div>
  );
}

// ── Selectable user card ──────────────────────────────────────
function UserCard({user, selected, onSelect, onClear, extraFields}) {
  const isSel = !!selected && selected.id === user.id;
  return (
    <div onClick={()=>isSel?null:onSelect(user)}
      style={{border:`${isSel?'2px solid #2563eb':'1.5px solid #e5e7eb'}`,
        borderRadius:12,padding:'14px 16px',
        background:isSel?'#eff6ff':'#fff',
        cursor:isSel?'default':'pointer',transition:'all 0.15s',
        boxShadow:isSel?'0 0 0 4px rgba(37,99,235,0.08)':'0 1px 3px rgba(0,0,0,0.04)'}}
      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.borderColor='#93c5fd';}}
      onMouseLeave={e=>{if(!isSel)e.currentTarget.style.borderColor='#e5e7eb';}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,
                   marginBottom:isSel&&extraFields?.length>0?12:0}}>
        <Avatar user={user} size={42}/>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:700,fontSize:14,color:'#111827',margin:0}}>{displayName(user)}</p>
          <p style={{fontSize:12,color:'#6b7280',margin:'2px 0 0'}}>{user.email}</p>
        </div>
        {user.telephone && (
          <div style={{display:'flex',alignItems:'center',gap:4,color:'#6b7280',
                       fontSize:12,flexShrink:0}}>
            <IcPhone/> {user.telephone}
          </div>
        )}
        <span style={{display:'inline-flex',alignItems:'center',gap:4,
          padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
          background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',flexShrink:0}}>
          <IcCheck/> Active
        </span>
        {isSel && (
          <button onClick={e=>{e.stopPropagation();onClear();}}
            style={{width:26,height:26,borderRadius:'50%',border:'1px solid #e5e7eb',
              background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',color:'#6b7280',flexShrink:0,padding:0}}>
            <IcClose/>
          </button>
        )}
      </div>

      {/* Extra details */}
      {isSel && extraFields && extraFields.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px 20px',
          paddingTop:12,borderTop:'1px solid #dbeafe'}}>
          {extraFields.map((f,i) => f ? (
            <div key={i}>
              <p style={{fontSize:11,color:'#6b7280',fontWeight:500,margin:'0 0 2px'}}>{f.label}</p>
              <p style={{fontSize:13,fontWeight:600,color:'#111827',margin:0}}>{f.value||'—'}</p>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────
function SearchInput({value, onChange, placeholder}) {
  return (
    <div style={{position:'relative',flex:1}}>
      <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',
                    pointerEvents:'none',color:'#9ca3af'}}>
        <IcSearch/>
      </span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'10px 12px 10px 38px',fontSize:13,
          border:'1.5px solid #e5e7eb',borderRadius:10,background:'#fff',
          color:'#374151',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
        onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';}}
        onBlur={e=>{e.target.style.borderColor='#e5e7eb';e.target.style.boxShadow='none';}}/>
    </div>
  );
}

// ── Progress step ─────────────────────────────────────────────
function ProgressStep({n, label, done}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,
                 marginBottom:n<3?10:0}}>
      <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,
        background:done?'#16a34a':'#e5e7eb',
        display:'flex',alignItems:'center',justifyContent:'center',
        transition:'background 0.2s'}}>
        {done
          ? <IcCheck/>
          : <span style={{fontSize:10,fontWeight:700,color:'#9ca3af'}}>{n}</span>}
      </div>
      <span style={{fontSize:13,fontWeight:600,color:done?'#16a34a':'#6b7280',
                    transition:'color 0.2s'}}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function NewAssociationPage() {
  const navigate = useNavigate();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [selMal,   setSelMal]   = useState(null);
  const [selComp,  setSelComp]  = useState(null);
  const [searchMal,setSearchMal]= useState('');
  const [searchCmp,setSearchCmp]= useState('');

  useEffect(()=>{
    api.get('/api/v1/admin/users')
      .then(({data})=>setUsers(data))
      .catch(()=>toast.error('Failed to load users.'))
      .finally(()=>setLoading(false));
  },[]);

  const malvoyants = useMemo(()=>users.filter(u=>u.role==='VISUAL_IMPAIRED'),[users]);
  const companions  = useMemo(()=>users.filter(u=>u.role==='COMPANION'),[users]);

  const filteredMal = useMemo(()=>{
    if (!searchMal) return malvoyants;
    const q=searchMal.toLowerCase();
    return malvoyants.filter(u=>displayName(u).toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q));
  },[malvoyants,searchMal]);

  const filteredCmp = useMemo(()=>{
    if (!searchCmp) return companions;
    const q=searchCmp.toLowerCase();
    return companions.filter(u=>displayName(u).toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q));
  },[companions,searchCmp]);

  const handleCreate = async()=>{
    if (!selMal||!selComp){toast.error('Please select both a malvoyant and a companion.');return;}
    setCreating(true);
    try{
      await api.post('/api/v1/admin/associations',{
        malvoyantId:      selMal.id,
        accompagnateurId: selComp.id,
      });
      toast.success('Association created!');
      setTimeout(()=>navigate('/admin/associations'),800);
    }catch(err){
      if(err.response?.status===409) toast.error('This association already exists.');
      else toast.error(err.response?.data?.message??'Failed to create association.');
    }finally{setCreating(false);}
  };

  const dt = nowDT();
  const both = !!selMal && !!selComp;

  const malFields = selMal?[
    {label:'Date of Birth',          value:fmtDate(selMal.dateNaissance)},
    {label:'Emergency Phone',        value:selMal.telephoneUrgence||selMal.telephone},
    {label:'Blood Group',            value:selMal.groupeSanguin},
    {label:'Deficiency Level',       value:selMal.niveauDeficience},
    {label:'Address',                value:selMal.adresse},
  ]:[];

  const cmpFields = selComp?[
    {label:'Professional Phone',  value:selComp.telephoneProfessionnel||selComp.telephone},
    {label:'Hire Date',           value:fmtDate(selComp.dateEmbauche)},
    {label:'Experience',          value:selComp.anneesExperience!=null?selComp.anneesExperience+' yrs':null},
    {label:'Address',             value:selComp.adresse},
  ]:[];

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
                 background:'#f8fafc',fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>

      {/* HEADER */}
      <header style={{height:62,background:'#fff',borderBottom:'1px solid #e5e7eb',
                      padding:'0 24px',display:'flex',alignItems:'center',
                      justifyContent:'space-between',flexShrink:0,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.05)',position:'sticky',top:0,zIndex:20}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:'#2563eb',
                       display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" fill="white" style={{width:22,height:22}}>
              <circle cx="12" cy="4.5" r="2.2"/>
              <path d="M8.5 11.5l-1.5 4h2l1-2.5 1.5 1.5V20h2v-5.5l-2-2 .8-2.5 1.7 1.5H17V9.5h-2.5L13 8l-1 1-1-1-2 3.5z"/>
            </svg>
          </div>
          <span style={{fontWeight:800,fontSize:18,color:'#111827',letterSpacing:'-0.4px'}}>
            Assist<span style={{color:'#2563eb'}}>Walk</span>
          </span>
          <span style={{color:'#e5e7eb',margin:'0 10px'}}>|</span>
          <span style={{color:'#9ca3af',fontSize:14,fontWeight:500}}>Admin Dashboard</span>
        </div>
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:6,
          border:'1px solid #e5e7eb',borderRadius:8,padding:'7px 14px',
          background:'none',cursor:'pointer',color:'#6b7280',fontSize:13,fontWeight:600}}>
          <IcLogout/> Logout
        </button>
      </header>

      <div style={{flex:1,display:'flex',minHeight:0}}>

        {/* SIDEBAR */}
        <aside style={{width:200,background:'#fff',borderRight:'1px solid #e5e7eb',
                       display:'flex',flexDirection:'column',flexShrink:0,padding:'14px 10px',gap:2,
                       position:'sticky',top:62,height:'calc(100vh - 62px)'}}>
          <NavItem Icon={IcHome}  label="Dashboard"    active={false} onClick={()=>navigate('/admin')}/>
          <NavItem Icon={IcUsers} label="Users"        active={false} onClick={()=>navigate('/admin/users')}/>
          <NavItem Icon={IcLink}  label="Associations" active={true}  onClick={()=>navigate('/admin/associations')}/>
          <NavItem Icon={IcBar}   label="Reports"      active={false} onClick={()=>navigate('/admin/reports')}/>
          <NavItem Icon={IcGear}  label="Settings"     active={false} onClick={()=>{}}/>
          <div style={{flex:1}}/>
          <div style={{background:'#eff6ff',borderRadius:14,padding:'12px',
                       display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#2563eb',
                         flexShrink:0,display:'flex',alignItems:'center',
                         justifyContent:'center',color:'#fff'}}>
              <IcHelp/>
            </div>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:'#1e40af',margin:0}}>Need help?</p>
              <a href="#" style={{fontSize:11,color:'#3b82f6',textDecoration:'none'}}>Contact support</a>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

          {/* Scrollable left */}
          <div style={{flex:1,overflowY:'auto',padding:'28px 28px 100px'}}>

            {/* Back */}
            <button onClick={()=>navigate('/admin/associations')}
              style={{display:'flex',alignItems:'center',gap:6,background:'none',
                      border:'none',cursor:'pointer',color:'#2563eb',fontSize:13,
                      fontWeight:600,padding:0,marginBottom:20}}>
              <IcBack/> Back to Associations
            </button>

            <h1 style={{fontSize:26,fontWeight:800,color:'#111827',margin:'0 0 4px',letterSpacing:'-0.5px'}}>
              New Association
            </h1>
            <p style={{fontSize:14,color:'#6b7280',margin:'0 0 32px'}}>
              Create a new association between a visually impaired user and a companion.
            </p>

            {/* STEP 1 */}
            <div style={{marginBottom:28}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <StepBadge n={1} done={!!selMal}/>
                <div>
                  <h2 style={{fontSize:16,fontWeight:700,color:'#111827',margin:0}}>Select Malvoyant</h2>
                  <p style={{fontSize:13,color:'#6b7280',margin:0}}>Choose a visually impaired user to associate.</p>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginBottom:12}}>
                <SearchInput value={searchMal} onChange={setSearchMal}
                  placeholder="Search by name or email..."/>
              </div>
              {selMal ? (
                <UserCard user={selMal} selected={selMal}
                  onSelect={()=>{}} onClear={()=>setSelMal(null)} extraFields={malFields}/>
              ) : loading ? (
                <div style={{display:'flex',justifyContent:'center',padding:32}}><Spinner size={28}/></div>
              ) : filteredMal.length===0 ? (
                <div style={{textAlign:'center',padding:32,color:'#9ca3af',
                             background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',fontSize:13}}>
                  No visually impaired users found.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto',paddingRight:2}}>
                  {filteredMal.map(u=>(
                    <UserCard key={u.id} user={u} selected={null}
                      onSelect={setSelMal} onClear={()=>{}} extraFields={[]}/>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 2 */}
            <div style={{marginBottom:28}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <StepBadge n={2} done={!!selComp}/>
                <div>
                  <h2 style={{fontSize:16,fontWeight:700,color:'#111827',margin:0}}>Select Companion</h2>
                  <p style={{fontSize:13,color:'#6b7280',margin:0}}>Choose a companion to associate.</p>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginBottom:12}}>
                <SearchInput value={searchCmp} onChange={setSearchCmp}
                  placeholder="Search by name or email..."/>
              </div>
              {selComp ? (
                <UserCard user={selComp} selected={selComp}
                  onSelect={()=>{}} onClear={()=>setSelComp(null)} extraFields={cmpFields}/>
              ) : loading ? (
                <div style={{display:'flex',justifyContent:'center',padding:32}}><Spinner size={28}/></div>
              ) : filteredCmp.length===0 ? (
                <div style={{textAlign:'center',padding:32,color:'#9ca3af',
                             background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',fontSize:13}}>
                  No companions found.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto',paddingRight:2}}>
                  {filteredCmp.map(u=>(
                    <UserCard key={u.id} user={u} selected={null}
                      onSelect={setSelComp} onClear={()=>{}} extraFields={[]}/>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 3 — Review */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <StepBadge n={3} done={both}/>
                <div>
                  <h2 style={{fontSize:16,fontWeight:700,color:'#111827',margin:0}}>Review Association</h2>
                  <p style={{fontSize:13,color:'#6b7280',margin:0}}>Please review before creating.</p>
                </div>
              </div>

              <div style={{background:'#fff',borderRadius:16,padding:'20px 24px',transition:'all 0.2s',
                border:`1.5px solid ${both?'#2563eb':'#e5e7eb'}`,
                boxShadow:both?'0 0 0 4px rgba(37,99,235,0.08)':'none'}}>
                {!both ? (
                  <p style={{textAlign:'center',color:'#9ca3af',fontSize:13,margin:0,padding:'12px 0'}}>
                    Select both a malvoyant and a companion above to see the review.
                  </p>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 60px 1fr 60px 1fr',
                               alignItems:'center',gap:12}}>

                    {/* Malvoyant */}
                    <div style={{display:'flex',alignItems:'center',gap:12,
                                 background:'#f8fafc',borderRadius:12,padding:'14px',
                                 border:'1px solid #e5e7eb'}}>
                      <div style={{width:40,height:40,borderRadius:11,background:'#eff6ff',
                                   display:'flex',alignItems:'center',justifyContent:'center',
                                   color:'#2563eb',flexShrink:0}}>
                        <IcUser/>
                      </div>
                      <div style={{minWidth:0}}>
                        <p style={{fontSize:10,color:'#6b7280',fontWeight:600,margin:'0 0 2px',
                                   textTransform:'uppercase',letterSpacing:'0.05em'}}>Malvoyant</p>
                        <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                                   overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {displayName(selMal)}
                        </p>
                        <p style={{fontSize:11,color:'#6b7280',margin:'1px 0 0',
                                   overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {selMal.email}
                        </p>
                      </div>
                    </div>

                    {/* Link */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:'#eff6ff',
                                   display:'flex',alignItems:'center',justifyContent:'center',
                                   color:'#2563eb'}}>
                        <IcLink2/>
                      </div>
                    </div>

                    {/* Companion */}
                    <div style={{display:'flex',alignItems:'center',gap:12,
                                 background:'#f8fafc',borderRadius:12,padding:'14px',
                                 border:'1px solid #e5e7eb'}}>
                      <div style={{width:40,height:40,borderRadius:11,background:'#f0fdf4',
                                   display:'flex',alignItems:'center',justifyContent:'center',
                                   color:'#16a34a',flexShrink:0}}>
                        <IcUserGr/>
                      </div>
                      <div style={{minWidth:0}}>
                        <p style={{fontSize:10,color:'#6b7280',fontWeight:600,margin:'0 0 2px',
                                   textTransform:'uppercase',letterSpacing:'0.05em'}}>Companion</p>
                        <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                                   overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {displayName(selComp)}
                        </p>
                        <p style={{fontSize:11,color:'#6b7280',margin:'1px 0 0',
                                   overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {selComp.email}
                        </p>
                      </div>
                    </div>

                    {/* Calendar icon */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:'#f5f3ff',
                                   display:'flex',alignItems:'center',justifyContent:'center',
                                   color:'#7c3aed'}}>
                        <IcCal/>
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{background:'#f8fafc',borderRadius:12,padding:'14px',
                                 border:'1px solid #e5e7eb'}}>
                      <p style={{fontSize:10,color:'#6b7280',fontWeight:600,margin:'0 0 4px',
                                 textTransform:'uppercase',letterSpacing:'0.05em'}}>Association Date</p>
                      <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0}}>{dt[0]}</p>
                      <p style={{fontSize:11,color:'#6b7280',margin:'1px 0 0'}}>{dt[1]}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT INFO PANEL */}
          <div style={{width:290,background:'#fff',borderLeft:'1px solid #e5e7eb',
                       flexShrink:0,overflowY:'auto',padding:'28px 20px',
                       display:'flex',flexDirection:'column',gap:16}}>

            {/* About */}
            <div style={{background:'#f8fafc',borderRadius:14,border:'1px solid #e5e7eb',padding:'18px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:34,height:34,borderRadius:10,background:'#eff6ff',
                             display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb'}}>
                  <IcShield/>
                </div>
                <h2 style={{fontSize:14,fontWeight:700,color:'#111827',margin:0}}>About Associations</h2>
              </div>
              <p style={{fontSize:13,color:'#6b7280',margin:'0 0 14px',lineHeight:1.6}}>
                Associations link a visually impaired user with a companion who can receive and resolve their SOS alerts.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  'Each malvoyant can have multiple companions.',
                  'A companion can be associated with multiple malvoyants.',
                  'Duplicate associations are not allowed.',
                  'Manage all associations from the associations list.',
                ].map((txt,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8}}>
                    <div style={{width:18,height:18,borderRadius:'50%',background:'#16a34a',
                                 flexShrink:0,display:'flex',alignItems:'center',
                                 justifyContent:'center',marginTop:2}}>
                      <IcCheck/>
                    </div>
                    <p style={{fontSize:12,color:'#374151',margin:0,lineHeight:1.55}}>{txt}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div style={{background:'#f8fafc',borderRadius:14,border:'1px solid #e5e7eb',padding:'16px'}}>
              <p style={{fontSize:11,fontWeight:700,color:'#374151',margin:'0 0 12px',
                         textTransform:'uppercase',letterSpacing:'0.06em'}}>Progress</p>
              <ProgressStep n={1} label="Select Malvoyant" done={!!selMal}/>
              <ProgressStep n={2} label="Select Companion" done={!!selComp}/>
              <ProgressStep n={3} label="Review & Create"  done={both}/>
            </div>

            {/* Selection summary */}
            {(selMal||selComp) && (
              <div style={{background:'#eff6ff',borderRadius:14,border:'1px solid #bfdbfe',padding:'16px'}}>
                <p style={{fontSize:11,fontWeight:700,color:'#1e40af',margin:'0 0 12px',
                           textTransform:'uppercase',letterSpacing:'0.06em'}}>Selection</p>
                {selMal && (
                  <div style={{display:'flex',alignItems:'center',gap:8,
                               marginBottom:selComp?8:0}}>
                    <Avatar user={selMal} size={28}/>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'#1e40af',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {displayName(selMal)}
                      </p>
                      <p style={{fontSize:10,color:'#3b82f6',margin:0}}>Malvoyant</p>
                    </div>
                  </div>
                )}
                {selMal && selComp && (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',
                               margin:'4px 0',color:'#3b82f6'}}>
                    <IcLink/>
                  </div>
                )}
                {selComp && (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <Avatar user={selComp} size={28}/>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'#1e40af',margin:0,
                                 overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {displayName(selComp)}
                      </p>
                      <p style={{fontSize:10,color:'#3b82f6',margin:0}}>Companion</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* STICKY FOOTER */}
      <div style={{position:'sticky',bottom:0,background:'rgba(248,250,252,0.97)',
                   backdropFilter:'blur(8px)',borderTop:'1px solid #e5e7eb',
                   padding:'14px 28px',display:'flex',alignItems:'center',
                   justifyContent:'flex-end',gap:12,zIndex:10}}>
        <button onClick={()=>navigate('/admin/associations')}
          style={{padding:'10px 24px',borderRadius:10,border:'1px solid #e5e7eb',
                  background:'#fff',cursor:'pointer',fontSize:14,fontWeight:600,color:'#374151'}}>
          Cancel
        </button>
        <button onClick={handleCreate} disabled={creating||!both}
          style={{display:'flex',alignItems:'center',gap:8,
            padding:'10px 28px',borderRadius:10,border:'none',
            background:creating||!both?'#93c5fd':'#2563eb',
            color:'#fff',cursor:creating||!both?'not-allowed':'pointer',
            fontSize:14,fontWeight:700,
            boxShadow:both?'0 2px 10px rgba(37,99,235,0.28)':'none',
            transition:'all 0.15s'}}>
          {creating ? <Spinner size={16} light/> : <IcCreate/>}
          {creating ? 'Creating…' : 'Create Association'}
        </button>
      </div>

      <Toaster position="top-right"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>
    </div>
  );
}