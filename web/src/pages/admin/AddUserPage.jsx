/**
 * AddUserPage.jsx — AssistWalk Admin
 * Premium enterprise healthcare design
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api, { API_BASE } from '../../api/axiosInstance';
import { logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

// ── Role data ─────────────────────────────────────────────────
const ROLE_CONFIG = {
  VISUAL_IMPAIRED: {
    label: 'Visually Impaired User',
    desc:  'End-user who receives navigation and SOS assistance.',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    perms: ['Real-time Navigation','SOS Alerts','OCR Reading','Companion Monitoring'],
  },
  COMPANION: {
    label: 'Companion',
    desc:  'Healthcare professional who monitors assigned users.',
    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
    perms: ['Alert Dashboard','Push Notifications','Alert History','User Location'],
  },
  ADMIN: {
    label: 'Administrator',
    desc:  'Full system access — user management and configuration.',
    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    perms: ['User Management','Associations','Full Analytics','System Settings'],
  },
};

// ── Helpers ───────────────────────────────────────────────────
const AV_COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return AV_COLORS[(id||0) % AV_COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return ((p+' '+n).trim()||u?.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? ''; const n = u?.nom ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || ('User #'+u?.id);
}
function resolvePhoto(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}

// ── Icons ─────────────────────────────────────────────────────
const ic = (d, w=18, h=18) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{width:w,height:h,flexShrink:0}}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcHome   = ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>);
const IcUsers  = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>);
const IcLink   = ic(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>);
const IcBar    = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
const IcUser   = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcEye    = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>);
const IcEyeOff = ic(<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>);
const IcMail   = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></>, 14, 14);
const IcLock   = ic(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>, 14, 14);
const IcMapPin = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, 14, 14);
const IcPhone  = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>, 14, 14);
const IcLogout = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcChevD  = ic(<polyline points="4,6 8,10 12,6"/>, 13, 13);
const IcPlus   = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 16, 16);
const IcSave   = ic(<><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></>, 15, 15);
const IcBack   = ic(<><polyline points="15,18 9,12 15,6"/></>, 16, 16);
const IcCheck  = ic(<polyline points="20,6 9,17 4,12"/>, 12, 12);
const IcMenu   = ic(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, 17, 17);
const IcShield = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, 16, 16);
const IcAlert  = ic(<><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></>, 11, 11);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=16, light=false }) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite',flexShrink:0}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="4"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function UserAvatar({ user, size=32 }) {
  const photo = resolvePhoto(user?.photoUrl);
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: photo ? 'transparent' : avColor(user?.id),
      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700, fontSize:size>40?15:12,
      overflow:'hidden',
    }}>
      {photo
        ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}
               onError={e => { e.currentTarget.style.display='none'; }}/>
        : initials(user)
      }
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:5,letterSpacing:'0.01em'}}>
        {label}{required && <span style={{color:'#ef4444',marginLeft:2}}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{fontSize:11,color:'#dc2626',margin:'4px 0 0',display:'flex',alignItems:'center',gap:4}}>
          <IcAlert/> {error}
        </p>
      )}
      {hint && !error && <p style={{fontSize:11,color:'#9ca3af',margin:'4px 0 0'}}>{hint}</p>}
    </div>
  );
}

// ── Text Input ────────────────────────────────────────────────
function Inp({ hasError=false, ...props }) {
  return (
    <input
      {...props}
      style={{
        width:'100%', padding:'9px 12px', fontSize:13,
        border:`1.5px solid ${hasError?'#fca5a5':'#e5e7eb'}`,
        borderRadius:9, background:'#fff', color:'#111827',
        outline:'none', boxSizing:'border-box', fontFamily:'inherit',
        transition:'border-color 0.15s, box-shadow 0.15s',
        ...(props.style||{}),
      }}
      onFocus={e => {
        e.target.style.borderColor = hasError?'#dc2626':'#2563eb';
        e.target.style.boxShadow   = hasError?'0 0 0 3px rgba(220,38,38,0.08)':'0 0 0 3px rgba(37,99,235,0.08)';
        props.onFocus?.(e);
      }}
      onBlur={e => {
        e.target.style.borderColor = hasError?'#fca5a5':'#e5e7eb';
        e.target.style.boxShadow   = 'none';
        props.onBlur?.(e);
      }}
    />
  );
}

// ── Select ────────────────────────────────────────────────────
function Sel({ hasError=false, empty=false, children, ...props }) {
  return (
    <div style={{position:'relative'}}>
      <select
        {...props}
        style={{
          width:'100%', padding:'9px 30px 9px 12px', fontSize:13,
          border:`1.5px solid ${hasError?'#fca5a5':'#e5e7eb'}`,
          borderRadius:9, background:'#fff',
          color: empty?'#9ca3af':'#111827',
          appearance:'none', outline:'none', cursor:'pointer',
          fontFamily:'inherit', transition:'border-color 0.15s',
          ...(props.style||{}),
        }}
        onFocus={e => { e.target.style.borderColor='#2563eb'; e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.08)'; }}
        onBlur={e  => { e.target.style.borderColor=hasError?'#fca5a5':'#e5e7eb'; e.target.style.boxShadow='none'; }}>
        {children}
      </select>
      <span style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',
                    pointerEvents:'none',color:'#9ca3af'}}><IcChevD/></span>
    </div>
  );
}

// ── Shared form style helpers ──────────────────────────────────
const tallInput = { height:52, borderRadius:14 };
const iconLeft  = { position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
                     pointerEvents:'none', color:'#9ca3af' };
const eyeBtn    = { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                     background:'none', border:'none', cursor:'pointer', color:'#9ca3af',
                     display:'flex', padding:0 };
const subLabel  = { fontSize:11, fontWeight:700, color:'#6b7280', margin:'0 0 8px',
                     textTransform:'uppercase', letterSpacing:'0.06em' };

// ── Option card (compact toggle / info card) ───────────────────
function OptionCard({ checked, locked, title, subtitle, onClick }) {
  return (
    <div onClick={!locked ? onClick : undefined} style={{
      display:'flex', alignItems:'flex-start', gap:10,
      padding:'12px 14px', borderRadius:14,
      cursor: locked ? 'default' : 'pointer',
      background: checked ? '#eff6ff' : '#f9fafb',
      border:`1.5px solid ${checked ? '#bfdbfe' : '#e5e7eb'}`,
      transition:'all 0.15s',
    }}>
      <div style={{
        width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
        background: checked ? '#2563eb' : '#fff',
        border:`2px solid ${checked ? '#2563eb' : '#d1d5db'}`,
        display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
      }}>
        {checked && <IcCheck/>}
      </div>
      <div style={{minWidth:0}}>
        <p style={{fontSize:12,fontWeight:600,color:'#374151',margin:0}}>{title}</p>
        <p style={{fontSize:10.5,color:'#9ca3af',margin:'2px 0 0',lineHeight:1.35}}>{subtitle}</p>
        {locked && (
          <span style={{
            display:'inline-block', marginTop:4, fontSize:9.5, fontWeight:700,
            color:'#2563eb', background:'#dbeafe', borderRadius:5, padding:'1px 6px',
            letterSpacing:'0.04em', textTransform:'uppercase',
          }}>Automatic</span>
        )}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
function Card({ title, sub, iconColor, iconBg, Icon, children, compact=false }) {
  return (
    <div style={{
      background:'#fff', borderRadius:20, border:'1px solid #e5e7eb',
      boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
      padding: compact ? '16px 18px' : '20px 24px',
    }}>
      {(title || Icon) && (
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,
                     paddingBottom:12,borderBottom:'1px solid #f3f4f6'}}>
          {Icon && (
            <div style={{width:32,height:32,borderRadius:9,background:iconBg,
                         display:'flex',alignItems:'center',justifyContent:'center',
                         color:iconColor,flexShrink:0}}>
              <Icon/>
            </div>
          )}
          <div>
            <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0}}>{title}</p>
            {sub && <p style={{fontSize:11,color:'#9ca3af',margin:0}}>{sub}</p>}
          </div>
        </div>
      )}
      {children}
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
        boxShadow:'0 8px 30px rgba(0,0,0,0.12)',minWidth:220,zIndex:91,overflow:'hidden',
      }}>
        <div style={{padding:'13px 16px',borderBottom:'1px solid #f1f5f9',
                     display:'flex',alignItems:'center',gap:10}}>
          <UserAvatar user={profile} size={36}/>
          <div style={{minWidth:0}}>
            <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,
                       overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {displayName(profile)||'Administrator'}
            </p>
            <p style={{fontSize:11,color:'#9ca3af',margin:0,
                       overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {profile?.email||''}
            </p>
          </div>
        </div>
        <button onClick={() => { onClose(); navigate('/profile'); }}
          style={{width:'100%',padding:'10px 16px',border:'none',background:'none',
                  cursor:'pointer',textAlign:'left',fontSize:13,color:'#374151',
                  fontWeight:500,display:'flex',alignItems:'center',gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IcUser/> My Profile
        </button>
        <div style={{height:1,background:'#f1f5f9',margin:'0 16px'}}/>
        <button onClick={() => { onClose(); logout(); }}
          style={{width:'100%',padding:'10px 16px',border:'none',background:'none',
                  cursor:'pointer',textAlign:'left',fontSize:13,color:'#dc2626',
                  fontWeight:500,display:'flex',alignItems:'center',gap:8,marginBottom:4}}
          onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IcLogout/> Logout
        </button>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AddUserPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editUser = location.state?.user ?? null;
  const editing  = !!editUser?.id;

  const [form, setForm] = useState({
    prenom:'', nom:'', email:'', telephone:'', adresse:'',
    password:'', confirmPwd:'', role:'', active:true,
    mustChangePassword: true,
    telephoneUrgence:'', groupeSanguin:'', niveauDeficience:'',
    telephoneProfessionnel:'', dateEmbauche:'', anneesExperience:'',
    companionId:'',
    ...(editUser ? {
      prenom:    editUser.prenom??'',
      nom:       editUser.nom??'',
      email:     editUser.email??'',
      telephone: editUser.telephone??'',
      adresse:   editUser.adresse??'',
      role:      editUser.role??'',
    } : {}),
  });
  const [showPwd,  setShowPwd]  = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [companions, setCompanions] = useState([]);
  const [errors,   setErrors]   = useState({});
  const [profile,  setProfile]  = useState(null);
  const [profOpen, setProfOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

  const set = (k, v) => setForm(f => ({...f, [k]:v}));

  useEffect(() => {
    api.get('/api/v1/admin/users')
      .then(({ data }) => setCompanions(data.filter(u => u.role==='COMPANION')))
      .catch(() => {});
    api.get('/api/v1/users/me')
      .then(({ data }) => setProfile(data))
      .catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.role)  e.role  = 'Role is required';
    if (editing && form.password) {
      if (form.password.length<8) e.password = 'Minimum 8 characters';
      if (form.password !== form.confirmPwd) e.confirmPwd = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        email:     form.email,
        role:      form.role,
        nom:       form.nom       || null,
        prenom:    form.prenom    || null,
        telephone: form.telephone || null,
        adresse:   form.adresse   || null,
      };
      if (editing && form.password) payload.password = form.password;
      if (!editing && form.role === 'VISUAL_IMPAIRED') {
        payload.telephoneUrgence = form.telephoneUrgence || null;
        payload.groupeSanguin    = form.groupeSanguin    || null;
        payload.niveauDeficience = form.niveauDeficience || null;
      }
      if (!editing && form.role === 'COMPANION') {
        payload.telephoneProfessionnel = form.telephoneProfessionnel || null;
        payload.dateEmbauche           = form.dateEmbauche           || null;
        payload.anneesExperience       = form.anneesExperience ? Number(form.anneesExperience) : null;
      }
      if (editing) await api.put('/api/v1/admin/users/' + editUser.id, payload);
      else         await api.post('/api/v1/admin/users', payload);
      toast.success(editing ? 'User updated.' : 'User created.');
      setTimeout(() => navigate('/admin/users'), 800);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'An error occurred.');
    } finally { setSaving(false); }
  };

  const roleConf = ROLE_CONFIG[form.role];
  const showRoleDetails = form.role === 'VISUAL_IMPAIRED' || form.role === 'COMPANION';

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

        {/* ── HEADER ── */}
        <header style={{
          height:56, background:'#fff', borderBottom:'1px solid #e5e7eb',
          padding:'0 24px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)', zIndex:20,
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
            {/* Breadcrumb */}
            <nav style={{display:'flex',alignItems:'center',gap:6}}>
              {[
                {label:'Dashboard', path:'/admin'},
                {label:'Users',     path:'/admin/users'},
                {label: editing ? 'Edit User' : 'Add User', path:null},
              ].map((crumb, i, arr) => (
                <span key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                  {crumb.path ? (
                    <button onClick={() => navigate(crumb.path)} style={{
                      background:'none',border:'none',cursor:'pointer',
                      fontSize:13,color:'#6b7280',fontWeight:500,padding:0,
                    }}
                      onMouseEnter={e=>e.currentTarget.style.color='#374151'}
                      onMouseLeave={e=>e.currentTarget.style.color='#6b7280'}>
                      {crumb.label}
                    </button>
                  ) : (
                    <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>{crumb.label}</span>
                  )}
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

          {/* Right: profile */}
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

        {/* ── MAIN ── */}
        <main style={{flex:1, overflowY:'auto', padding:'16px 24px 20px'}}>
          <div style={{maxWidth:1280,margin:'0 auto'}}>

            {/* Page title */}
            <div style={{marginBottom:14}}>
              <button onClick={() => navigate('/admin/users')} style={{
                display:'flex',alignItems:'center',gap:6,background:'none',border:'none',
                cursor:'pointer',color:'#6b7280',fontSize:12,fontWeight:500,padding:0,marginBottom:6,
              }}
                onMouseEnter={e=>e.currentTarget.style.color='#374151'}
                onMouseLeave={e=>e.currentTarget.style.color='#6b7280'}>
                <IcBack/> Back to Users
              </button>
              <h1 style={{fontSize:19,fontWeight:800,color:'#111827',margin:0,letterSpacing:'-0.4px'}}>
                {editing ? 'Edit User' : 'Add New User'}
              </h1>
              <p style={{fontSize:12,color:'#6b7280',margin:'2px 0 0'}}>
                {editing ? 'Update account details and permissions.' : 'Create a new AssistWalk account.'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'7fr 3fr',gap:24,alignItems:'start'}}>

                {/* ══ LEFT: User Information + Security ══ */}
                <Card Icon={IcUser} iconBg="#eff6ff" iconColor="#2563eb"
                  title="User Information" sub="Basic profile details & account security">
                  <div style={{display:'flex',flexDirection:'column',gap:14}}>

                    {/* Row 1: Name */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                      <Field label="First Name">
                        <Inp value={form.prenom} placeholder="First name" style={tallInput}
                          onChange={e => set('prenom', e.target.value)}/>
                      </Field>
                      <Field label="Last Name">
                        <Inp value={form.nom} placeholder="Last name" style={tallInput}
                          onChange={e => set('nom', e.target.value)}/>
                      </Field>
                    </div>

                    {/* Row 2: Email + Phone */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                      <Field label="Email Address" required error={errors.email}>
                        <div style={{position:'relative'}}>
                          <span style={iconLeft}><IcMail/></span>
                          <Inp type="email" value={form.email} placeholder="user@example.com"
                            hasError={!!errors.email} style={{...tallInput,paddingLeft:38}}
                            onChange={e => set('email', e.target.value)}/>
                        </div>
                      </Field>
                      <Field label="Phone Number">
                        <div style={{display:'flex',gap:8}}>
                          <div style={{
                            display:'flex',alignItems:'center',gap:5,flexShrink:0,
                            padding:'0 10px',border:'1.5px solid #e5e7eb',
                            borderRadius:14,background:'#f9fafb',height:52,
                          }}>
                            <svg viewBox="0 0 20 14" style={{width:20,height:14,borderRadius:2,flexShrink:0,display:'block'}}>
                              <rect width="20" height="14" fill="#C1272D"/>
                              {/* Moroccan green pentagram — center (10,7) */}
                              <polygon
                                points="10,4 10.68,6.07 12.85,6.07 11.09,7.36 11.76,9.43 10,8.15 8.24,9.43 8.91,7.36 7.15,6.07 9.32,6.07"
                                fill="#006233" fillRule="evenodd"
                              />
                            </svg>
                            <span style={{fontSize:12,color:'#374151',fontWeight:600,whiteSpace:'nowrap'}}>+212</span>
                          </div>
                          <div style={{position:'relative',flex:1}}>
                            <span style={iconLeft}><IcPhone/></span>
                            <Inp value={form.telephone} placeholder="6xx xxx xxx" style={{...tallInput,paddingLeft:34}}
                              onChange={e => set('telephone', e.target.value)}/>
                          </div>
                        </div>
                      </Field>
                    </div>

                    {/* Row 3: Address */}
                    <Field label="Address">
                      <div style={{position:'relative'}}>
                        <span style={iconLeft}><IcMapPin/></span>
                        <Inp value={form.adresse} placeholder="City, Street (optional)" style={{...tallInput,paddingLeft:38}}
                          onChange={e => set('adresse', e.target.value)}/>
                      </div>
                    </Field>

                    {/* Security Settings */}
                    <div>
                      <p style={subLabel}>Security Settings</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        <OptionCard checked locked
                          title="Temporary password"
                          subtitle="Generated automatically and emailed to the user"/>
                        <OptionCard checked={form.mustChangePassword}
                          onClick={() => set('mustChangePassword', !form.mustChangePassword)}
                          title="Require password change"
                          subtitle="User must set a new password at first login"/>
                      </div>
                    </div>

                    {/* Edit mode: reset password */}
                    {editing && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                        <Field label="New Password" error={errors.password} hint="Leave blank to keep current">
                          <div style={{position:'relative'}}>
                            <span style={iconLeft}><IcLock/></span>
                            <Inp type={showPwd?'text':'password'} value={form.password}
                              hasError={!!errors.password}
                              placeholder="New password (optional)"
                              style={{...tallInput,paddingLeft:38,paddingRight:42}}
                              onChange={e => set('password', e.target.value)}/>
                            <button type="button" onClick={() => setShowPwd(v=>!v)} style={eyeBtn}>
                              {showPwd ? <IcEyeOff/> : <IcEye/>}
                            </button>
                          </div>
                        </Field>
                        <Field label="Confirm Password" required={!!form.password} error={errors.confirmPwd}>
                          <div style={{position:'relative'}}>
                            <span style={iconLeft}><IcLock/></span>
                            <Inp type={showCPwd?'text':'password'} value={form.confirmPwd}
                              hasError={!!errors.confirmPwd}
                              placeholder="Confirm password"
                              style={{...tallInput,paddingLeft:38,paddingRight:42}}
                              onChange={e => set('confirmPwd', e.target.value)}/>
                            <button type="button" onClick={() => setShowCPwd(v=>!v)} style={eyeBtn}>
                              {showCPwd ? <IcEyeOff/> : <IcEye/>}
                            </button>
                          </div>
                        </Field>
                      </div>
                    )}
                  </div>
                </Card>

                {/* ══ RIGHT: Account Configuration ══ */}
                <Card Icon={IcShield} iconBg="#f5f3ff" iconColor="#7c3aed"
                  title="Account Configuration" sub="Role and access">
                  <div style={{display:'flex',flexDirection:'column',gap:14}}>

                    {/* Role */}
                    <Field label="Role" required error={errors.role}>
                      <Sel empty={!form.role} hasError={!!errors.role}
                        value={form.role} onChange={e => set('role', e.target.value)}
                        style={{height:48,borderRadius:12}}>
                        <option value="">Select role…</option>
                        <option value="VISUAL_IMPAIRED">Visually Impaired</option>
                        <option value="COMPANION">Companion</option>
                        <option value="ADMIN">Administrator</option>
                      </Sel>
                    </Field>

                    {/* Status segmented control */}
                    <div>
                      <p style={subLabel}>Status</p>
                      <div style={{display:'flex',gap:4,padding:4,background:'#f3f4f6',borderRadius:12}}>
                        {[
                          {val:true,  label:'Active',   color:'#15803d'},
                          {val:false, label:'Inactive', color:'#6b7280'},
                        ].map(opt => (
                          <button key={String(opt.val)} type="button"
                            onClick={() => set('active', opt.val)}
                            style={{
                              flex:1,padding:'8px 10px',borderRadius:9,cursor:'pointer',border:'none',
                              background:form.active===opt.val?'#fff':'transparent',
                              boxShadow:form.active===opt.val?'0 1px 4px rgba(0,0,0,0.08)':'none',
                              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                              transition:'all 0.15s',
                            }}>
                            <span style={{width:7,height:7,borderRadius:'50%',
                              background:form.active===opt.val?opt.color:'#d1d5db',flexShrink:0}}/>
                            <span style={{fontSize:12,fontWeight:600,
                              color:form.active===opt.val?opt.color:'#9ca3af'}}>
                              {opt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions preview */}
                    <div>
                      <p style={subLabel}>Permissions Preview</p>
                      {roleConf ? (
                        <div style={{display:'flex',flexDirection:'column',gap:5}}>
                          <div style={{display:'inline-flex',alignSelf:'flex-start',alignItems:'center',gap:6,
                            padding:'3px 10px',borderRadius:999,background:roleConf.bg,
                            border:`1px solid ${roleConf.border}`,marginBottom:2}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:roleConf.color}}/>
                            <span style={{fontSize:11,fontWeight:700,color:roleConf.color}}>{roleConf.label}</span>
                          </div>
                          {roleConf.perms.map((p,i) => (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                              padding:'6px 9px',borderRadius:8,background:roleConf.bg,border:`1px solid ${roleConf.border}`}}>
                              <span style={{width:15,height:15,borderRadius:'50%',flexShrink:0,
                                background:roleConf.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>
                                <IcCheck/>
                              </span>
                              <span style={{fontSize:11.5,fontWeight:500,color:'#374151'}}>{p}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{padding:'14px 0',textAlign:'center',color:'#9ca3af',fontSize:11.5}}>
                          Select a role to preview permissions
                        </div>
                      )}
                    </div>

                    {/* Role Details (conditional, animated) */}
                    <div style={{
                      maxHeight: showRoleDetails ? 220 : 0,
                      opacity:   showRoleDetails ? 1 : 0,
                      overflow:'hidden', transition:'max-height 0.35s ease, opacity 0.25s ease',
                    }}>
                      <p style={subLabel}>Role Details</p>

                      {form.role === 'VISUAL_IMPAIRED' && (
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          <Field label="Emergency Phone">
                            <Inp value={form.telephoneUrgence} placeholder="+212 6xx xxx xxx"
                              onChange={e => set('telephoneUrgence', e.target.value)}/>
                          </Field>
                          <Field label="Blood Type">
                            <Sel empty={!form.groupeSanguin} value={form.groupeSanguin}
                              onChange={e => set('groupeSanguin', e.target.value)}>
                              <option value="">Select</option>
                              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </Sel>
                          </Field>
                          <Field label="Impairment Level">
                            <Sel empty={!form.niveauDeficience} value={form.niveauDeficience}
                              onChange={e => set('niveauDeficience', e.target.value)}>
                              <option value="">Select</option>
                              <option value="partial">Partial</option>
                              <option value="severe">Severe</option>
                              <option value="total">Total (blind)</option>
                            </Sel>
                          </Field>
                          <Field label="Assigned Companion">
                            <Sel empty={!form.companionId} value={form.companionId}
                              onChange={e => set('companionId', e.target.value)}>
                              <option value="">No companion</option>
                              {companions.map(c => (
                                <option key={c.id} value={c.id}>{displayName(c)}</option>
                              ))}
                            </Sel>
                          </Field>
                        </div>
                      )}

                      {form.role === 'COMPANION' && (
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          <Field label="Professional Phone">
                            <Inp value={form.telephoneProfessionnel} placeholder="+212 6xx"
                              onChange={e => set('telephoneProfessionnel', e.target.value)}/>
                          </Field>
                          <Field label="Hire Date">
                            <Inp type="date" value={form.dateEmbauche}
                              onChange={e => set('dateEmbauche', e.target.value)}/>
                          </Field>
                          <div style={{gridColumn:'1 / -1'}}>
                            <Field label="Years of Experience">
                              <Inp type="number" min="0" max="50" value={form.anneesExperience}
                                placeholder="e.g. 3"
                                onChange={e => set('anneesExperience', e.target.value)}/>
                            </Field>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── STICKY ACTION BAR ── */}
              <div style={{
                position:'sticky',bottom:0,marginTop:16,
                background:'rgba(248,250,252,0.97)',backdropFilter:'blur(8px)',
                borderTop:'1px solid #e5e7eb',padding:'12px 0',
                display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,
              }}>
                <button type="button" onClick={() => navigate('/admin/users')} style={{
                  padding:'10px 22px',borderRadius:12,border:'1.5px solid #e5e7eb',
                  background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{
                  display:'flex',alignItems:'center',gap:8,
                  padding:'10px 26px',borderRadius:12,border:'none',
                  background:saving?'#93c5fd':'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',
                  cursor:saving?'not-allowed':'pointer',fontSize:13,fontWeight:700,
                  boxShadow:'0 4px 14px rgba(37,99,235,0.3)',
                  transition:'opacity 0.15s',
                }}
                  onMouseEnter={e=>!saving&&(e.currentTarget.style.opacity='0.9')}
                  onMouseLeave={e=>!saving&&(e.currentTarget.style.opacity='1')}>
                  {saving ? <Spinner size={15} light/> : (editing ? <IcSave/> : <IcPlus/>)}
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </main>
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
