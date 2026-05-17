/**
 * AddUserPage.jsx — AssistWalk Admin — Add / Edit User
 * Professional — SVG icons only
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';

// ── Permissions per role ──────────────────────────────────────
const ROLE_PERMISSIONS = {
  VISUAL_IMPAIRED: [
    { label:'Real-time Navigation', desc:'Obstacle detection and navigation assistance',    color:'#2563eb', bg:'#eff6ff' },
    { label:'SOS Alerts',           desc:'Send emergency alerts to assigned companions',    color:'#dc2626', bg:'#fef2f2' },
    { label:'OCR Reading',          desc:'Document and text reading via camera',            color:'#7c3aed', bg:'#f5f3ff' },
  ],
  COMPANION: [
    { label:'Alert Dashboard',   desc:'View and manage alerts from assigned users',         color:'#2563eb', bg:'#eff6ff' },
    { label:'Push Notifications',desc:'Receive real-time SOS notifications',               color:'#16a34a', bg:'#f0fdf4' },
    { label:'Alert History',     desc:'Access to resolved alert history',                  color:'#d97706', bg:'#fffbeb' },
  ],
  ADMIN: [
    { label:'User Management',   desc:'Create, edit and delete all user accounts',         color:'#2563eb', bg:'#eff6ff' },
    { label:'Associations',      desc:'Link companions to visually impaired users',        color:'#7c3aed', bg:'#f5f3ff' },
    { label:'Full Analytics',    desc:'Access to all reports and system data',             color:'#16a34a', bg:'#f0fdf4' },
    { label:'System Settings',   desc:'Configure platform-wide settings',                  color:'#d97706', bg:'#fffbeb' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────
const COLORS = ['#2563eb','#7c3aed','#dc2626','#d97706','#16a34a','#0891b2','#db2777'];
function avColor(id) { return COLORS[(id || 0) % COLORS.length]; }
function initials(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return ((p+' '+n).trim() || u?.email || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function displayName(u) {
  const p = u?.prenom ?? u?.firstName ?? '';
  const n = u?.nom    ?? u?.lastName  ?? '';
  return (p+' '+n).trim() || u?.email?.split('@')[0] || ('User #'+u?.id);
}

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
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>, 15, 15);
const IcHelp    = ic(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, 17, 17);
const IcBack    = ic(<polyline points="10,4 6,8 10,12"/>, 14, 14);
const IcEye     = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>);
const IcEyeOff  = ic(<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>);
const IcUser    = ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>);
const IcPhone   = ic(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.61A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>, 14, 14);
const IcMail    = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></>, 14, 14);
const IcLock    = ic(<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>, 14, 14);
const IcMapPin  = ic(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, 14, 14);
const IcCheck   = ic(<polyline points="20,6 9,17 4,12"/>, 13, 13);
const IcSave    = ic(<><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></>, 16, 16);
const IcPlus    = ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 16, 16);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size=18, light=false }) {
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
    <div style={{width:size, height:size, borderRadius:'50%', background:avColor(user?.id),
      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:700, fontSize:12}}>
      {initials(user)}
    </div>
  );
}

// ── Sidebar NavItem ───────────────────────────────────────────
function NavItem({ Icon, label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:'100%', display:'flex', alignItems:'center', gap:10,
        padding:'10px 13px', borderRadius:10, border:'none', cursor:'pointer',
        background:active?'#2563eb':hov?'#f3f4f6':'transparent',
        color:active?'#fff':hov?'#111827':'#6b7280',
        fontWeight:600, fontSize:14, textAlign:'left', transition:'all 0.15s',
        boxShadow:active?'0 2px 8px rgba(37,99,235,0.22)':'none'}}>
      <Icon />
      <span style={{flex:1}}>{label}</span>
    </button>
  );
}

// ── Form Field ────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label style={{display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6}}>
        {label}{required && <span style={{color:'#ef4444'}}> *</span>}
      </label>
      {children}
      {error && (
        <p style={{fontSize:11, color:'#dc2626', margin:'5px 0 0',
                   display:'flex', alignItems:'center', gap:4}}>
          <svg viewBox="0 0 16 16" fill="none" style={{width:11,height:11}} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="8" cy="8" r="7"/><line x1="8" y1="5" x2="8" y2="9"/><line x1="8" y1="11" x2="8.01" y2="11"/>
          </svg>
          {error}
        </p>
      )}
      {hint && !error && <p style={{fontSize:11, color:'#9ca3af', margin:'5px 0 0'}}>{hint}</p>}
    </div>
  );
}

// ── Input styles ──────────────────────────────────────────────
function Inp({ hasError=false, ...props }) {
  return (
    <input
      {...props}
      style={{
        width:'100%', padding:'10px 14px', fontSize:13,
        border:`1.5px solid ${hasError?'#fca5a5':'#e5e7eb'}`,
        borderRadius:10, background:'#fff', color:'#111827',
        outline:'none', boxSizing:'border-box', fontFamily:'inherit',
        transition:'border-color 0.15s, box-shadow 0.15s',
        ...(props.style||{}),
      }}
      onFocus={e => {
        e.target.style.borderColor = hasError?'#dc2626':'#2563eb';
        e.target.style.boxShadow   = hasError
          ?'0 0 0 3px rgba(220,38,38,0.1)'
          :'0 0 0 3px rgba(37,99,235,0.1)';
        if (props.onFocus) props.onFocus(e);
      }}
      onBlur={e => {
        e.target.style.borderColor = hasError?'#fca5a5':'#e5e7eb';
        e.target.style.boxShadow   = 'none';
        if (props.onBlur) props.onBlur(e);
      }}
    />
  );
}

// ── Card section ──────────────────────────────────────────────
function Section({ Icon, iconBg, iconColor, title, sub, children }) {
  return (
    <div style={{background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
                 boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:'24px'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:22,
                   paddingBottom:16, borderBottom:'1px solid #f3f4f6'}}>
        <div style={{width:38, height:38, borderRadius:11, background:iconBg,
                     display:'flex', alignItems:'center', justifyContent:'center',
                     color:iconColor, flexShrink:0}}>
          <Icon />
        </div>
        <div>
          <h2 style={{fontSize:15, fontWeight:700, color:'#111827', margin:0}}>{title}</h2>
          <p style={{fontSize:12, color:'#9ca3af', margin:0}}>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function AddUserPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const editUser  = location.state?.user ?? null;
  const editing   = !!editUser?.id;

  const [form, setForm] = useState({
    prenom:'', nom:'', email:'', telephone:'', adresse:'',
    password:'', confirmPwd:'', role:'', active:true,
    telephoneUrgence:'', dateNaissance:'', groupeSanguin:'', niveauDeficience:'',
    telephoneProfessionnel:'', dateEmbauche:'', anneesExperience:'',
    companionId:'',
    ...(editUser ? {
      prenom: editUser.prenom??'', nom: editUser.nom??'',
      email: editUser.email??'', telephone: editUser.telephone??'',
      adresse: editUser.adresse??'', role: editUser.role??'',
    } : {}),
  });
  const [showPwd,    setShowPwd]    = useState(false);
  const [showCPwd,   setShowCPwd]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [companions, setCompanions] = useState([]);
  const [errors,     setErrors]     = useState({});

  const set = (k, v) => setForm(f => ({...f, [k]:v}));

  useEffect(() => {
    api.get('/api/v1/admin/users')
      .then(({ data }) => setCompanions(data.filter(u => u.role==='COMPANION')))
      .catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.role)  e.role  = 'Role is required';
    if (!editing) {
      if (!form.password)             e.password    = 'Password is required';
      else if (form.password.length<8)e.password    = 'Minimum 8 characters';
      if (form.password!==form.confirmPwd) e.confirmPwd = 'Passwords do not match';
    } else if (form.password && form.password!==form.confirmPwd) {
      e.confirmPwd = 'Passwords do not match';
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
        email:    form.email,
        role:     form.role,
        nom:      form.nom      || null,
        prenom:   form.prenom   || null,
        telephone:form.telephone|| null,
        adresse:  form.adresse  || null,
      };
      if (!editing || form.password) payload.password = form.password;
      if (editing) await api.put('/api/v1/admin/users/' + editUser.id, payload);
      else          await api.post('/api/v1/admin/users', payload);
      toast.success(editing ? 'User updated.' : 'User created.');
      setTimeout(() => navigate('/admin/users'), 800);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'An error occurred.');
    } finally { setSaving(false); }
  };

  const perms = ROLE_PERMISSIONS[form.role] ?? [];

  const selectStyle = {
    width:'100%', padding:'10px 36px 10px 14px', fontSize:13,
    border:'1.5px solid #e5e7eb', borderRadius:10, background:'#fff',
    color:'#111827', appearance:'none', outline:'none', cursor:'pointer',
    fontFamily:'inherit', transition:'border-color 0.15s',
  };

  return (
    <div style={{minHeight:'100vh', display:'flex', flexDirection:'column',
                 background:'#f8fafc',
                 fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>

      {/* HEADER */}
      <header style={{height:62, background:'#fff', borderBottom:'1px solid #e5e7eb',
                      padding:'0 24px', display:'flex', alignItems:'center',
                      justifyContent:'space-between', flexShrink:0,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.05)', position:'sticky', top:0, zIndex:20}}>
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
        <button onClick={logout} style={{display:'flex', alignItems:'center', gap:6,
          border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 14px',
          background:'none', cursor:'pointer', color:'#6b7280', fontSize:13, fontWeight:600}}>
          <IcLogout /> Logout
        </button>
      </header>

      <div style={{flex:1, display:'flex', minHeight:0}}>

        {/* SIDEBAR */}
        <aside style={{width:200, background:'#fff', borderRight:'1px solid #e5e7eb',
                       display:'flex', flexDirection:'column', flexShrink:0,
                       padding:'14px 10px', gap:2,
                       position:'sticky', top:62, height:'calc(100vh - 62px)', overflowY:'auto'}}>
          <NavItem Icon={IcHome}  label="Dashboard"    active={false} onClick={() => navigate('/admin')}/>
          <NavItem Icon={IcUsers} label="Users"        active={true}  onClick={() => navigate('/admin/users')}/>
          <NavItem Icon={IcLink}  label="Associations" active={false} onClick={() => navigate('/admin/associations')}/>
          <NavItem Icon={IcBar}   label="Reports"      active={false} onClick={() => navigate('/admin/reports')}/>
          <NavItem Icon={IcGear}  label="Settings"     active={false} onClick={() => {}}/>
          <div style={{flex:1}}/>
          <div style={{background:'#eff6ff', borderRadius:14, padding:'12px',
                       display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:'50%', background:'#2563eb',
                         flexShrink:0, display:'flex', alignItems:'center',
                         justifyContent:'center', color:'#fff'}}>
              <IcHelp />
            </div>
            <div>
              <p style={{fontSize:12, fontWeight:700, color:'#1e40af', margin:0}}>Need help?</p>
              <a href="#" style={{fontSize:11, color:'#3b82f6', textDecoration:'none'}}>Contact support</a>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1, overflowY:'auto', padding:'28px 32px 100px'}}>

          {/* Back */}
          <button onClick={() => navigate('/admin/users')}
            style={{display:'flex', alignItems:'center', gap:6, background:'none',
                    border:'none', cursor:'pointer', color:'#2563eb', fontSize:13,
                    fontWeight:600, padding:0, marginBottom:20}}>
            <IcBack /> Back to Users
          </button>

          {/* Title */}
          <div style={{marginBottom:28}}>
            <h1 style={{fontSize:26, fontWeight:800, color:'#111827', margin:'0 0 4px', letterSpacing:'-0.5px'}}>
              {editing ? 'Edit User' : 'Add New User'}
            </h1>
            <p style={{fontSize:14, color:'#6b7280', margin:0}}>
              {editing
                ? 'Update user account information and permissions.'
                : 'Create a new user account and set their role and permissions.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start'}}>

              {/* ── LEFT ── */}
              <div style={{display:'flex', flexDirection:'column', gap:16}}>

                {/* User Information */}
                <Section Icon={IcUser} iconBg="#eff6ff" iconColor="#2563eb"
                  title="User Information" sub="Basic profile details">
                  <div style={{display:'flex', flexDirection:'column', gap:16}}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                      <Field label="First Name">
                        <Inp value={form.prenom} placeholder="First name"
                          onChange={e => set('prenom', e.target.value)}/>
                      </Field>
                      <Field label="Last Name">
                        <Inp value={form.nom} placeholder="Last name"
                          onChange={e => set('nom', e.target.value)}/>
                      </Field>
                    </div>

                    <Field label="Email Address" required error={errors.email}>
                      <div style={{position:'relative'}}>
                        <span style={{position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
                                      pointerEvents:'none', color:'#9ca3af'}}>
                          <IcMail />
                        </span>
                        <Inp type="email" value={form.email} placeholder="user@example.com"
                          hasError={!!errors.email} required
                          style={{paddingLeft:38}}
                          onChange={e => set('email', e.target.value)}/>
                      </div>
                    </Field>

                    <Field label="Phone Number">
                      <div style={{display:'flex', gap:8}}>
                        <div style={{display:'flex', alignItems:'center', gap:6,
                                     padding:'10px 12px', border:'1.5px solid #e5e7eb',
                                     borderRadius:10, background:'#fff', flexShrink:0}}>
                          <svg viewBox="0 0 20 14" style={{width:20,height:14}}>
                            <rect width="20" height="14" fill="#c1272d"/>
                            <rect width="20" height="4.67" fill="#006233"/>
                            <rect y="4.67" width="20" height="4.67" fill="#fff"/>
                          </svg>
                          <span style={{fontSize:13, color:'#374151', fontWeight:600}}>+212</span>
                        </div>
                        <div style={{position:'relative', flex:1}}>
                          <span style={{position:'absolute', left:13, top:'50%',
                                        transform:'translateY(-50%)', pointerEvents:'none', color:'#9ca3af'}}>
                            <IcPhone />
                          </span>
                          <Inp value={form.telephone} placeholder="6xx xxx xxx"
                            style={{paddingLeft:36}}
                            onChange={e => set('telephone', e.target.value)}/>
                        </div>
                      </div>
                    </Field>

                    <Field label="Password" required={!editing} error={errors.password}
                      hint={editing ? 'Leave blank to keep current password' : 'Minimum 8 characters'}>
                      <div style={{position:'relative'}}>
                        <span style={{position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
                                      pointerEvents:'none', color:'#9ca3af'}}>
                          <IcLock />
                        </span>
                        <Inp type={showPwd?'text':'password'} value={form.password}
                          hasError={!!errors.password}
                          placeholder={editing?'Leave blank to keep current':'Enter password'}
                          required={!editing} style={{paddingLeft:38, paddingRight:44}}
                          onChange={e => set('password', e.target.value)}/>
                        <button type="button" onClick={() => setShowPwd(v=>!v)}
                          style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                  background:'none', border:'none', cursor:'pointer',
                                  color:'#9ca3af', display:'flex', padding:0}}>
                          {showPwd ? <IcEyeOff /> : <IcEye />}
                        </button>
                      </div>
                    </Field>

                    <Field label="Confirm Password"
                      required={!editing && !!form.password} error={errors.confirmPwd}>
                      <div style={{position:'relative'}}>
                        <span style={{position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
                                      pointerEvents:'none', color:'#9ca3af'}}>
                          <IcLock />
                        </span>
                        <Inp type={showCPwd?'text':'password'} value={form.confirmPwd}
                          hasError={!!errors.confirmPwd}
                          placeholder="Confirm password"
                          required={!editing && !!form.password}
                          style={{paddingLeft:38, paddingRight:44}}
                          onChange={e => set('confirmPwd', e.target.value)}/>
                        <button type="button" onClick={() => setShowCPwd(v=>!v)}
                          style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                  background:'none', border:'none', cursor:'pointer',
                                  color:'#9ca3af', display:'flex', padding:0}}>
                          {showCPwd ? <IcEyeOff /> : <IcEye />}
                        </button>
                      </div>
                    </Field>

                    <Field label="Address">
                      <div style={{position:'relative'}}>
                        <span style={{position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
                                      pointerEvents:'none', color:'#9ca3af'}}>
                          <IcMapPin />
                        </span>
                        <Inp value={form.adresse} placeholder="Enter address (optional)"
                          style={{paddingLeft:36}}
                          onChange={e => set('adresse', e.target.value)}/>
                      </div>
                    </Field>
                  </div>
                </Section>

                {/* Role-specific fields */}
                {form.role === 'VISUAL_IMPAIRED' && (
                  <Section Icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )} iconBg="#f5f3ff" iconColor="#7c3aed"
                  title="Visual Impairment Details" sub="Additional medical information">
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                      <Field label="Emergency Phone">
                        <Inp value={form.telephoneUrgence} placeholder="+212 6xx xxx xxx"
                          onChange={e => set('telephoneUrgence', e.target.value)}/>
                      </Field>
                      <Field label="Date of Birth">
                        <Inp type="date" value={form.dateNaissance}
                          onChange={e => set('dateNaissance', e.target.value)}/>
                      </Field>
                      <Field label="Blood Group">
                        <div style={{position:'relative'}}>
                          <select value={form.groupeSanguin}
                            onChange={e => set('groupeSanguin', e.target.value)}
                            style={selectStyle}>
                            <option value="">Select blood group</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                          <span style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                        pointerEvents:'none', color:'#9ca3af', fontSize:12}}>▾</span>
                        </div>
                      </Field>
                      <Field label="Deficiency Level">
                        <div style={{position:'relative'}}>
                          <select value={form.niveauDeficience}
                            onChange={e => set('niveauDeficience', e.target.value)}
                            style={selectStyle}>
                            <option value="">Select level</option>
                            <option value="partial">Partial</option>
                            <option value="severe">Severe</option>
                            <option value="total">Total (blind)</option>
                          </select>
                          <span style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                        pointerEvents:'none', color:'#9ca3af', fontSize:12}}>▾</span>
                        </div>
                      </Field>
                    </div>
                  </Section>
                )}

                {form.role === 'COMPANION' && (
                  <Section Icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}}
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                      <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  )} iconBg="#eff6ff" iconColor="#2563eb"
                  title="Companion Details" sub="Professional information">
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                      <Field label="Professional Phone">
                        <Inp value={form.telephoneProfessionnel} placeholder="+212 6xx xxx xxx"
                          onChange={e => set('telephoneProfessionnel', e.target.value)}/>
                      </Field>
                      <Field label="Years of Experience">
                        <Inp type="number" min="0" max="50" value={form.anneesExperience}
                          placeholder="e.g. 3"
                          onChange={e => set('anneesExperience', e.target.value)}/>
                      </Field>
                      <Field label="Hire Date">
                        <Inp type="date" value={form.dateEmbauche}
                          onChange={e => set('dateEmbauche', e.target.value)}/>
                      </Field>
                    </div>
                  </Section>
                )}

                {/* Permissions Preview */}
                <Section Icon={IcShield}
                  iconBg={form.role ? '#f0fdf4' : '#f3f4f6'}
                  iconColor={form.role ? '#16a34a' : '#9ca3af'}
                  title="Permissions Preview"
                  sub={form.role ? 'Permissions enabled for this role' : 'Select a role to preview permissions'}>
                  {perms.length > 0 ? (
                    <div style={{display:'flex', flexDirection:'column', gap:8}}>
                      {perms.map((p, i) => (
                        <div key={i} style={{display:'flex', alignItems:'center', gap:12,
                                             padding:'11px 14px', borderRadius:10,
                                             background:'#f8fafc', border:'1px solid #e5e7eb'}}>
                          <div style={{width:8, height:8, borderRadius:'50%',
                                       background:p.color, flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <p style={{fontSize:13, fontWeight:600, color:'#111827', margin:0}}>{p.label}</p>
                            <p style={{fontSize:12, color:'#6b7280', margin:'2px 0 0'}}>{p.desc}</p>
                          </div>
                          <span style={{fontSize:11, fontWeight:700, color:'#16a34a',
                                        background:'#dcfce7', padding:'3px 10px', borderRadius:20,
                                        display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                            <IcCheck /> Enabled
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{textAlign:'center', padding:'20px 0', color:'#9ca3af', fontSize:13}}>
                      Select a role on the right to see permissions.
                    </div>
                  )}
                </Section>
              </div>

              {/* ── RIGHT ── */}
              <div style={{display:'flex', flexDirection:'column', gap:16}}>

                {/* Account Details */}
                <Section Icon={IcShield} iconBg="#f5f3ff" iconColor="#7c3aed"
                  title="Account Details" sub="Role and access settings">
                  <div style={{display:'flex', flexDirection:'column', gap:18}}>

                    {/* Role */}
                    <Field label="Role" required error={errors.role}>
                      <div style={{position:'relative'}}>
                        <select value={form.role} onChange={e => set('role', e.target.value)}
                          style={{...selectStyle,
                            borderColor:errors.role?'#fca5a5':'#e5e7eb',
                            color:form.role?'#111827':'#9ca3af'}}>
                          <option value="">Select a role</option>
                          <option value="VISUAL_IMPAIRED">User — Visually Impaired</option>
                          <option value="COMPANION">Companion</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                        <span style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                      pointerEvents:'none', color:'#9ca3af', fontSize:12}}>▾</span>
                      </div>
                      <p style={{fontSize:11, color:'#9ca3af', margin:'6px 0 0'}}>
                        Choose the appropriate role for this user.
                      </p>
                    </Field>

                    {/* Status */}
                    <div>
                      <label style={{display:'block', fontSize:13, fontWeight:600,
                                     color:'#374151', marginBottom:10}}>
                        Status <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      {[
                        { val:true,  label:'Active',   desc:'User can access the system',
                          color:'#16a34a', bg:'#f0fdf4', brd:'#bbf7d0' },
                        { val:false, label:'Inactive', desc:'User account will be disabled',
                          color:'#d97706', bg:'#fffbeb', brd:'#fde68a' },
                      ].map(opt => (
                        <div key={String(opt.val)} onClick={() => set('active', opt.val)}
                          style={{display:'flex', alignItems:'center', gap:12,
                            padding:'12px 14px', borderRadius:10, cursor:'pointer', marginBottom:8,
                            border:`1.5px solid ${form.active===opt.val?opt.brd:'#e5e7eb'}`,
                            background:form.active===opt.val?opt.bg:'#fff',
                            transition:'all 0.15s'}}>
                          <div style={{width:18, height:18, borderRadius:'50%', flexShrink:0,
                            border:`2px solid ${form.active===opt.val?opt.color:'#d1d5db'}`,
                            background:form.active===opt.val?opt.color:'#fff',
                            display:'flex', alignItems:'center', justifyContent:'center'}}>
                            {form.active===opt.val && (
                              <div style={{width:6, height:6, borderRadius:'50%', background:'#fff'}}/>
                            )}
                          </div>
                          <div>
                            <p style={{fontWeight:700, fontSize:13, margin:0,
                                       color:form.active===opt.val?opt.color:'#374151'}}>
                              {opt.label}
                            </p>
                            <p style={{fontSize:11, color:'#9ca3af', margin:'2px 0 0'}}>{opt.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Companion Assignment */}
                    <Field label="Companion Assignment"
                      hint="Optionally assign a companion to monitor this user.">
                      <div style={{position:'relative'}}>
                        <select value={form.companionId}
                          onChange={e => set('companionId', e.target.value)}
                          style={{...selectStyle, color:form.companionId?'#111827':'#9ca3af'}}>
                          <option value="">Select companion (optional)</option>
                          {companions.map(c => (
                            <option key={c.id} value={c.id}>{displayName(c)} — {c.email}</option>
                          ))}
                        </select>
                        <span style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                      pointerEvents:'none', color:'#9ca3af', fontSize:12}}>▾</span>
                      </div>
                    </Field>
                  </div>
                </Section>

                {/* Role badge */}
                {form.role && (
                  <div style={{background:'#fff', borderRadius:14, border:'1px solid #e5e7eb',
                               padding:'16px 18px'}}>
                    <p style={{fontSize:11, fontWeight:700, color:'#6b7280', margin:'0 0 12px',
                               textTransform:'uppercase', letterSpacing:'0.06em'}}>Selected Role</p>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <div style={{
                        width:44, height:44, borderRadius:12, flexShrink:0,
                        background: form.role==='VISUAL_IMPAIRED'?'#f5f3ff':form.role==='COMPANION'?'#eff6ff':'#fffbeb',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: form.role==='VISUAL_IMPAIRED'?'#7c3aed':form.role==='COMPANION'?'#2563eb':'#d97706',
                      }}>
                        {form.role==='VISUAL_IMPAIRED' ? (
                          <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        ) : form.role==='COMPANION' ? (
                          <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20}} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p style={{fontWeight:700, fontSize:14, color:'#111827', margin:0}}>
                          {form.role==='VISUAL_IMPAIRED'?'Visually Impaired User':
                           form.role==='COMPANION'?'Companion':'Administrator'}
                        </p>
                        <p style={{fontSize:12, color:'#9ca3af', margin:'2px 0 0'}}>
                          {perms.length} permission{perms.length!==1?'s':''} enabled
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer */}
            <div style={{position:'sticky', bottom:0,
                         background:'rgba(248,250,252,0.96)', backdropFilter:'blur(8px)',
                         borderTop:'1px solid #e5e7eb', padding:'14px 0', marginTop:24,
                         display:'flex', alignItems:'center', justifyContent:'flex-end', gap:12}}>
              <button type="button" onClick={() => navigate('/admin/users')} style={{
                padding:'10px 24px', borderRadius:10, border:'1px solid #e5e7eb',
                background:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, color:'#374151'}}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'10px 28px', borderRadius:10, border:'none',
                background:saving?'#93c5fd':'#2563eb', color:'#fff',
                cursor:saving?'not-allowed':'pointer', fontSize:14, fontWeight:700,
                boxShadow:'0 2px 10px rgba(37,99,235,0.28)'}}>
                {saving ? <Spinner size={16} light/> : (editing ? <IcSave /> : <IcPlus />)}
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </main>
      </div>

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