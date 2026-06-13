/**
 * ChangePasswordPage.jsx — AssistWalk
 * Design fidèle au prototype
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosInstance';
import { getRole } from '../utils/auth';

// ── SVG icons ─────────────────────────────────────────────────
const ic = (d,w=20,h=20) => () => (
  <svg viewBox="0 0 24 24" fill="none" style={{width:w,height:h,flexShrink:0}}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcLock    = ic(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>);
const IcEye     = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>);
const IcEyeOff  = ic(<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>);
const IcCheck   = ic(<polyline points="20,6 9,17 4,12"/>,16,16);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>,28,28);

// ── Spinner ───────────────────────────────────────────────────
function Spinner({size=18,light=false}){
  return(
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light?'rgba(255,255,255,0.3)':'#bfdbfe'} strokeWidth="4"/>
      <path fill={light?'white':'#2563eb'} d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── Password strength ─────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label:'At least 8 characters',       ok: password.length >= 8 },
    { label:'One uppercase letter',         ok: /[A-Z]/.test(password) },
    { label:'One lowercase letter',         ok: /[a-z]/.test(password) },
    { label:'One number',                   ok: /\d/.test(password) },
    { label:'One special character (@!#…)', ok: /[@!#$%^&*]/.test(password) },
  ];
  const score  = checks.filter(c=>c.ok).length;
  const colors = ['#ef4444','#f97316','#f59e0b','#22c55e','#16a34a'];
  const labels = ['Very weak','Weak','Fair','Strong','Very strong'];
  return (
    <div style={{marginTop:8}}>
      <div style={{display:'flex',gap:3,marginBottom:5}}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{flex:1,height:3,borderRadius:2,
            background:i<=score?colors[score-1]:'#e5e7eb',transition:'background 0.3s'}}/>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontSize:11,color:score>0?colors[score-1]:'#9ca3af',fontWeight:600}}>
          {score>0?labels[score-1]:''}
        </span>
        <span style={{fontSize:11,color:'#9ca3af'}}>{score}/5</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px'}}>
        {checks.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:13,height:13,borderRadius:'50%',flexShrink:0,
              background:c.ok?'#16a34a':'#e5e7eb',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'background 0.2s'}}>
              {c.ok&&<svg viewBox="0 0 12 10" fill="none" style={{width:7,height:7}}>
                <polyline points="1,5 4,9 11,1" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>}
            </div>
            <span style={{fontSize:10.5,color:c.ok?'#16a34a':'#9ca3af',
              fontWeight:c.ok?600:400}}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Password field ────────────────────────────────────────────
function PwdField({label, value, onChange, placeholder, error}){
  const [show,setShow]=useState(false);
  return(
    <div>
      <label style={{display:'block',fontSize:13,fontWeight:600,
        color:'#374151',marginBottom:6}}>
        {label} <span style={{color:'#ef4444'}}>*</span>
      </label>
      <div style={{position:'relative'}}>
        <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
          color:'#9ca3af',pointerEvents:'none'}}>
          <IcLock/>
        </span>
        <input
          type={show?'text':'password'}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:'100%',padding:'12px 46px 12px 44px',fontSize:14,
            border:`1.5px solid ${error?'#fca5a5':'#e5e7eb'}`,
            borderRadius:12,background:'#f9fafb',color:'#111827',
            outline:'none',boxSizing:'border-box',fontFamily:'inherit',
            transition:'all 0.15s',
          }}
          onFocus={e=>{
            e.target.style.background='#fff';
            e.target.style.borderColor=error?'#dc2626':'#2563eb';
            e.target.style.boxShadow=`0 0 0 3px ${error?'rgba(220,38,38,0.1)':'rgba(37,99,235,0.1)'}`;
          }}
          onBlur={e=>{
            e.target.style.background='#f9fafb';
            e.target.style.borderColor=error?'#fca5a5':'#e5e7eb';
            e.target.style.boxShadow='none';
          }}
        />
        <button type="button" onClick={()=>setShow(v=>!v)}
          style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',
            background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:0,
            display:'flex'}}>
          {show?<IcEyeOff/>:<IcEye/>}
        </button>
      </div>
      {error&&(
        <p style={{fontSize:11,color:'#dc2626',margin:'5px 0 0'}}>⚠ {error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function ChangePasswordPage(){
  const navigate  = useNavigate();
  const location  = useLocation();
  const isMandatory = location.state?.mandatory ?? false;

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState({});
  const [success,  setSuccess]  = useState(false);

  const validate = () => {
    const e = {};
    if (!isMandatory && !current) e.current = 'Current password required';
    if (!next)              e.next    = 'New password required';
    else if (next.length<8) e.next    = 'Minimum 8 characters';
    if (next !== confirm)   e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try{
      await api.put('/api/v1/users/me/password',{
        currentPassword: isMandatory?null:current,
        newPassword:     next,
        confirmPassword: confirm,
      });
      setSuccess(true);
      toast.success('Password changed successfully!');
      setTimeout(()=>{
        const role=getRole();
        navigate(role==='ADMIN'?'/admin':'/dashboard');
      },1500);
    }catch(err){
      toast.error(err.response?.data?.message??'Failed to change password.');
    }finally{setSaving(false);}
  };

  return(
    <div style={{
      height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'#f1f5f9',fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",
      padding:'16px',overflow:'hidden',
    }}>
      <div style={{width:'100%',maxWidth:420}}>

        {/* Card */}
        <div style={{background:'#fff',borderRadius:24,
          boxShadow:'0 4px 32px rgba(0,0,0,0.10)',overflow:'hidden'}}>

          {/* Header — always blue */}
          <div style={{
            background:'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)',
            padding:'22px 28px 18px',textAlign:'center',
          }}>
            <div style={{
              width:52,height:52,borderRadius:'50%',
              background:'rgba(255,255,255,0.2)',
              display:'inline-flex',alignItems:'center',justifyContent:'center',
              marginBottom:10,color:'#fff',
              boxShadow:'0 0 0 6px rgba(255,255,255,0.1)',
            }}>
              <IcShield/>
            </div>
            <h2 style={{fontSize:19,fontWeight:800,color:'#fff',
              margin:'0 0 4px',letterSpacing:'-0.3px'}}>
              {isMandatory?'Password Change Required':'Change Password'}
            </h2>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.85)',margin:0}}>
              {isMandatory
                ?'You must set a new password to continue.'
                :'Update your account password below.'}
            </p>
          </div>

          {/* Form body */}
          <div style={{padding:'18px 24px 16px'}}>

            {/* Mandatory info banner */}
            {isMandatory&&!success&&(
              <div style={{
                display:'flex',alignItems:'center',gap:10,
                background:'#eff6ff',border:'1px solid #bfdbfe',
                borderRadius:10,padding:'10px 14px',marginBottom:16,
              }}>
                <div style={{width:28,height:28,borderRadius:7,background:'#dbeafe',
                  flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb'}}>
                  <IcLock/>
                </div>
                <p style={{fontSize:12,color:'#1e40af',margin:0,lineHeight:1.5}}>
                  A temporary password was sent to your email. Please replace it with a personal password.
                </p>
              </div>
            )}

            {success?(
              <div style={{textAlign:'center',padding:'16px 0 8px'}}>
                <div style={{
                  width:56,height:56,borderRadius:'50%',background:'#f0fdf4',
                  border:'2px solid #bbf7d0',
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  marginBottom:12,color:'#16a34a',
                  boxShadow:'0 0 0 8px rgba(22,163,74,0.08)',
                }}>
                  <IcCheck/>
                </div>
                <h3 style={{fontSize:17,fontWeight:800,color:'#111827',margin:'0 0 4px'}}>
                  Password updated!
                </h3>
                <p style={{fontSize:13,color:'#9ca3af',margin:0}}>Redirecting…</p>
              </div>
            ):(
              <form onSubmit={handleSubmit}>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>

                  {!isMandatory&&(
                    <PwdField
                      label="Current Password"
                      value={current}
                      onChange={setCurrent}
                      placeholder="Your current password"
                      error={errors.current}
                    />
                  )}

                  <div>
                    <PwdField
                      label="New Password"
                      value={next}
                      onChange={setNext}
                      placeholder="Minimum 8 characters"
                      error={errors.next}
                    />
                    <PasswordStrength password={next}/>
                  </div>

                  <PwdField
                    label="Confirm Password"
                    value={confirm}
                    onChange={setConfirm}
                    placeholder="Repeat your new password"
                    error={errors.confirm}
                  />

                  <button type="submit" disabled={saving}
                    style={{
                      width:'100%',padding:'12px',borderRadius:12,border:'none',
                      background:saving?'#93c5fd':'#2563eb',color:'#fff',
                      cursor:saving?'not-allowed':'pointer',
                      fontSize:14,fontWeight:700,marginTop:2,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                      boxShadow:saving?'none':'0 4px 14px rgba(37,99,235,0.35)',
                      transition:'all 0.15s',
                    }}
                    onMouseEnter={e=>{if(!saving)e.currentTarget.style.background='#1d4ed8';}}
                    onMouseLeave={e=>{if(!saving)e.currentTarget.style.background='#2563eb';}}>
                    {saving?<Spinner size={18} light/>:<IcCheck/>}
                    {saving?'Saving…':'Set New Password'}
                  </button>

                  {!isMandatory&&(
                    <button type="button" onClick={()=>navigate(-1)}
                      style={{width:'100%',padding:'10px',borderRadius:12,
                        border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',
                        fontSize:13,fontWeight:600,color:'#6b7280',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='#f9fafb';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background='#fff';}}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Security note */}
        <p style={{textAlign:'center',fontSize:11,color:'#94a3b8',marginTop:12,
          display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12}}
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Your password is encrypted with BCrypt and never stored in plain text.
        </p>
      </div>

      <Toaster position="top-center"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}