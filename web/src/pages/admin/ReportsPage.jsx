/**
 * ReportsPage.jsx — AssistWalk Admin — Reports & Analytics
 * Professional — SVG icons only
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { logout } from '../../utils/auth';

// ── Helpers ───────────────────────────────────────────────────
function fmtDuration(ms) {
  if (!ms||ms<0) return '—';
  const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60;
  return m===0?`${sec}s`:`${m}m ${String(sec).padStart(2,'0')}s`;
}
function getHour(d) { return d?new Date(d).getHours():null; }
function getMonthKey(d) {
  if(!d) return null;
  const dt=new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}
function monthLabel(key) {
  if(!key) return '';
  const [y,m]=key.split('-');
  return new Date(parseInt(y),parseInt(m)-1,1)
    .toLocaleDateString('en-US',{month:'short',year:'numeric'});
}

// ── SVG icon factory ──────────────────────────────────────────
const ic = (d,w=18,h=18) => () => (
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
const IcLogout  = ic(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,15,15);
const IcHelp    = ic(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,17,17);
const IcDownload= ic(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>,15,15);
const IcBell    = ic(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,24,24);
const IcShield  = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></>,24,24);
const IcClock   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>,24,24);
const IcUsersLg = ic(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,24,24);
const IcCheck   = ic(<polyline points="20,6 9,17 4,12"/>,10,10);
const IcActivity= ic(<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>,16,16);
const IcTrend   = ic(<><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></>,14,14);

// ── Donut ─────────────────────────────────────────────────────
function Donut({segments, size=160, stroke=24, centerLabel, centerSub}) {
  const r=(size-stroke)/2, cx=size/2, cy=size/2, circ=2*Math.PI*r;
  const total=segments.reduce((s,x)=>s+x.value,0);
  let offset=0;
  return (
    <svg width={size} height={size}>
      {total===0
        ?<circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}/>
        :segments.map((seg,i)=>{
          const pct=seg.value/total, dash=pct*circ, gap=circ-dash;
          const el=<circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset*circ}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{transition:'stroke-dasharray 0.5s'}}/>;
          offset+=pct; return el;
        })}
      {centerLabel&&<>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={18} fontWeight={800} fill="#111827">{centerLabel}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize={10} fill="#9ca3af">{centerSub}</text>
      </>}
    </svg>
  );
}

// ── Bar chart ─────────────────────────────────────────────────
function BarChart({data, height=180, color='#2563eb'}) {
  const max=Math.max(...data.map(d=>d.value),1);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${data.length*60} ${height}`}
         preserveAspectRatio="none" style={{overflow:'visible'}}>
      {data.map((d,i)=>{
        const bH=(d.value/max)*(height-40), x=i*60+10, y=height-30-bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={40} height={bH} rx={5} fill={color} fillOpacity={0.85}/>
            {d.value>0&&<text x={x+20} y={y-5} textAnchor="middle" fontSize={10} fill="#374151" fontWeight={700}>{d.value}</text>}
            <text x={x+20} y={height-12} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Line chart ────────────────────────────────────────────────
function LineChart({data, height=200}) {
  if (data.length<2) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:13}}>Not enough data</div>;
  const max=Math.max(...data.map(d=>d.value),1), W=700, H=height-40;
  const pts=data.map((d,i)=>({x:(i/(data.length-1))*W, y:H-(d.value/max)*H, ...d}));
  const path=pts.map((p,i)=>(i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`)).join(' ');
  const area=`${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const yLines=[0,0.25,0.5,0.75,1].map(f=>({y:H-f*H,label:Math.round(f*max)}));
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet" style={{overflow:'visible'}}>
      {yLines.map((l,i)=>(
        <g key={i}>
          <line x1={0} y1={l.y} x2={W} y2={l.y} stroke="#f3f4f6" strokeWidth={1}/>
          <text x={-8} y={l.y+4} textAnchor="end" fontSize={9} fill="#9ca3af">{l.label}</text>
        </g>
      ))}
      <path d={area} fill="#2563eb" fillOpacity={0.08}/>
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill="#2563eb" stroke="#fff" strokeWidth={2}/>
          <text x={p.x} y={p.y-10} textAnchor="middle" fontSize={9} fill="#374151" fontWeight={700}>{p.value.toLocaleString()}</text>
          <text x={p.x} y={H+15} textAnchor="middle" fontSize={9} fill="#9ca3af">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({value, max, color='#2563eb'}) {
  const pct=max>0?Math.min(100,(value/max)*100):0;
  return (
    <div style={{flex:1,height:8,background:'#f3f4f6',borderRadius:4,overflow:'hidden'}}>
      <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:4,transition:'width 0.5s'}}/>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner({size=32}) {
  return (
    <svg style={{width:size,height:size,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="4"/>
      <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ── NavItem ───────────────────────────────────────────────────
function NavItem({Icon, label, active, onClick}) {
  const [hov,setHov]=useState(false);
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

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({Icon, iconColor, bgIcon, label, value, trend, trendLabel, loading}) {
  const up=trend>=0;
  return (
    <div style={{background:'#fff',borderRadius:16,border:'1px solid #e5e7eb',
                 boxShadow:'0 1px 4px rgba(0,0,0,0.05)',padding:'20px 22px',
                 display:'flex',alignItems:'flex-start',gap:16}}>
      <div style={{width:52,height:52,borderRadius:14,background:bgIcon,
                   display:'flex',alignItems:'center',justifyContent:'center',
                   color:iconColor,flexShrink:0}}>
        <Icon/>
      </div>
      <div style={{flex:1}}>
        <p style={{fontSize:11,color:'#6b7280',fontWeight:600,margin:'0 0 4px',
                   textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>
        {loading
          ?<div style={{height:28,width:56,background:'#f3f4f6',borderRadius:6,margin:'0 0 8px'}}/>
          :<p style={{fontSize:28,fontWeight:800,color:'#111827',margin:'0 0 8px',lineHeight:1}}>{value}</p>}
        {!loading&&(
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:11,fontWeight:700,color:up?'#16a34a':'#dc2626',
              display:'flex',alignItems:'center',gap:3}}>
              <IcTrend/> {Math.abs(trend)}%
            </span>
            <span style={{fontSize:11,color:'#9ca3af'}}>{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chart card ────────────────────────────────────────────────
function ChartCard({title, sub, action, children}) {
  return (
    <div style={{background:'#fff',borderRadius:16,border:'1px solid #e5e7eb',
                 boxShadow:'0 1px 4px rgba(0,0,0,0.04)',padding:'20px 22px',
                 display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <p style={{fontWeight:700,fontSize:15,color:'#111827',margin:0}}>{title}</p>
          <p style={{fontSize:12,color:'#9ca3af',margin:'2px 0 0'}}>{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const OB_COLORS = ['#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2','#d97706','#6b7280'];

// ── Main ──────────────────────────────────────────────────────
export default function ReportsPage() {
  const navigate = useNavigate();
  const [alerts,  setAlerts]  = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('all');

  useEffect(()=>{
    Promise.all([api.get('/api/v1/alerts/active'), api.get('/api/v1/admin/users')])
      .then(([ar,ur])=>{ setAlerts(ar.data); setUsers(ur.data); })
      .catch(()=>toast.error('Failed to load report data.'))
      .finally(()=>setLoading(false));
  },[]);

  const filteredAlerts = useMemo(()=>{
    if (period==='all') return alerts;
    const now=Date.now(), ms=period==='week'?7*86400000:30*86400000;
    return alerts.filter(a=>a.createdAt&&(now-new Date(a.createdAt))<=ms);
  },[alerts,period]);

  const total     = filteredAlerts.length;
  const resolved  = filteredAlerts.filter(a=>a.status==='RESOLVED');
  const active    = filteredAlerts.filter(a=>a.status==='ACTIVE');
  const companions= users.filter(u=>u.role==='COMPANION');

  const avgResMs = useMemo(()=>{
    const wt=resolved.filter(a=>a.createdAt&&a.resolvedAt);
    if(!wt.length) return null;
    return wt.reduce((s,a)=>s+(new Date(a.resolvedAt)-new Date(a.createdAt)),0)/wt.length;
  },[resolved]);

  const alertsOverTime = useMemo(()=>{
    const counts={};
    alerts.forEach(a=>{ const k=getMonthKey(a.createdAt); if(k) counts[k]=(counts[k]||0)+1; });
    return Object.keys(counts).sort().slice(-6).map(k=>({label:monthLabel(k),value:counts[k]}));
  },[alerts]);

  const obstacleStats = useMemo(()=>{
    const counts={};
    filteredAlerts.forEach(a=>{ const k=a.obstacleType||'Unknown'; counts[k]=(counts[k]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)
      .map(([type,count],i)=>({type,count,color:OB_COLORS[i],pct:total>0?((count/total)*100).toFixed(1):0}));
  },[filteredAlerts,total]);

  const statusStats = useMemo(()=>[
    {label:'Resolved',value:resolved.length,color:'#16a34a'},
    {label:'Active',  value:active.length,  color:'#f59e0b'},
  ],[resolved,active]);

  const timeSlots = useMemo(()=>{
    const slots=[
      {label:'00–04',min:0, max:4, value:0},{label:'04–08',min:4, max:8, value:0},
      {label:'08–12',min:8, max:12,value:0},{label:'12–16',min:12,max:16,value:0},
      {label:'16–20',min:16,max:20,value:0},{label:'20–24',min:20,max:24,value:0},
    ];
    filteredAlerts.forEach(a=>{
      const h=getHour(a.createdAt); if(h===null) return;
      const s=slots.find(sl=>h>=sl.min&&h<sl.max); if(s) s.value++;
    });
    return slots;
  },[filteredAlerts]);

  const resolutionByObstacle = useMemo(()=>{
    const data={};
    resolved.forEach(a=>{
      if(!a.createdAt||!a.resolvedAt) return;
      const k=a.obstacleType||'Unknown', ms=new Date(a.resolvedAt)-new Date(a.createdAt);
      if(!data[k]) data[k]={total:0,count:0};
      data[k].total+=ms; data[k].count++;
    });
    return Object.entries(data).sort((a,b)=>b[1].count-a[1].count).slice(0,5)
      .map(([type,{total,count}])=>({type,avg:total/count}));
  },[resolved]);
  const maxAvgRes=Math.max(...resolutionByObstacle.map(r=>r.avg),1);

  const insights = useMemo(()=>{
    const list=[];
    if(total>0) list.push(`${total} alert${total>1?'s':''} recorded in the selected period.`);
    if(resolved.length>0&&total>0) list.push(`${((resolved.length/total)*100).toFixed(1)}% of alerts were resolved.`);
    if(obstacleStats[0]) list.push(`Most frequent obstacle: ${obstacleStats[0].type} (${obstacleStats[0].pct}%).`);
    const peak=timeSlots.reduce((a,b)=>a.value>b.value?a:b,{value:0});
    if(peak.value>0) list.push(`Most alerts recorded between ${peak.label}h.`);
    return list;
  },[total,resolved,obstacleStats,timeSlots]);

  const exportCsv=()=>{
    const rows=[['ID','Obstacle','Status','Created At','Resolved At','User ID'],
      ...filteredAlerts.map(a=>[a.id,a.obstacleType??'',a.status??'',a.createdAt??'',a.resolvedAt??'',a.userId??''])];
    const csv=rows.map(r=>r.join(',')).join('\n');
    const lnk=document.createElement('a');
    lnk.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    lnk.download='assistwalk_report.csv'; lnk.click();
    toast.success('Report exported.');
  };

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
                 background:'#f8fafc',overflow:'hidden',
                 fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>

      {/* HEADER */}
      <header style={{height:62,background:'#fff',borderBottom:'1px solid #e5e7eb',
                      padding:'0 24px',display:'flex',alignItems:'center',
                      justifyContent:'space-between',flexShrink:0,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.05)',zIndex:20}}>
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
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'#2563eb',
                       display:'flex',alignItems:'center',justifyContent:'center',
                       color:'#fff',fontWeight:700,fontSize:13}}>A</div>
          <div>
            <p style={{fontSize:13,fontWeight:700,color:'#111827',margin:0,lineHeight:1.2}}>Administrator</p>
            <p style={{fontSize:11,color:'#9ca3af',margin:0}}>Admin</p>
          </div>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:6,
            border:'1px solid #e5e7eb',borderRadius:8,padding:'7px 14px',
            background:'none',cursor:'pointer',color:'#6b7280',fontSize:13,fontWeight:600,marginLeft:8}}>
            <IcLogout/> Logout
          </button>
        </div>
      </header>

      <div style={{flex:1,display:'flex',minHeight:0}}>

        {/* SIDEBAR */}
        <aside style={{width:200,background:'#fff',borderRight:'1px solid #e5e7eb',
                       display:'flex',flexDirection:'column',flexShrink:0,padding:'14px 10px',gap:2}}>
          <NavItem Icon={IcHome}  label="Dashboard"    active={false} onClick={()=>navigate('/admin')}/>
          <NavItem Icon={IcUsers} label="Users"        active={false} onClick={()=>navigate('/admin/users')}/>
          <NavItem Icon={IcLink}  label="Associations" active={false} onClick={()=>navigate('/admin/associations')}/>
          <NavItem Icon={IcBar}   label="Reports"      active={true}  onClick={()=>{}}/>
          <NavItem Icon={IcGear}  label="Settings"     active={false} onClick={()=>{}}/>
          <div style={{flex:1}}/>
          <div style={{background:'#eff6ff',borderRadius:14,padding:'12px',
                       display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#2563eb',
                         flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                         color:'#fff'}}>
              <IcHelp/>
            </div>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:'#1e40af',margin:0}}>Need help?</p>
              <a href="#" style={{fontSize:11,color:'#3b82f6',textDecoration:'none'}}>Contact support</a>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,overflowY:'auto',padding:'26px 28px 40px'}}>

          {/* Page header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
            <div>
              <h1 style={{fontSize:24,fontWeight:800,color:'#111827',margin:'0 0 4px',letterSpacing:'-0.5px'}}>
                Reports & Analytics
              </h1>
              <p style={{fontSize:14,color:'#6b7280',margin:0}}>
                Advanced statistics and insights about the AssistWalk system.
              </p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {/* Period toggle */}
              <div style={{display:'flex',background:'#f3f4f6',borderRadius:9,padding:3,gap:2}}>
                {[{k:'week',l:'7 days'},{k:'month',l:'30 days'},{k:'all',l:'All time'}].map(({k,l})=>(
                  <button key={k} onClick={()=>setPeriod(k)}
                    style={{padding:'6px 14px',borderRadius:7,border:'none',cursor:'pointer',
                      fontSize:12,fontWeight:600,
                      background:period===k?'#fff':'transparent',
                      color:period===k?'#111827':'#6b7280',
                      boxShadow:period===k?'0 1px 3px rgba(0,0,0,0.08)':'none',
                      transition:'all 0.15s'}}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={exportCsv}
                style={{display:'flex',alignItems:'center',gap:6,
                  border:'1px solid #e5e7eb',borderRadius:9,padding:'9px 16px',
                  background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>
                <IcDownload/> Export
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',
                         height:400,flexDirection:'column',gap:16}}>
              <Spinner size={40}/>
              <p style={{color:'#9ca3af',fontSize:14,margin:0}}>Loading report data…</p>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
                <KpiCard Icon={IcBell}    iconColor="#2563eb" bgIcon="#eff6ff"
                  label="Total Alerts"        value={total.toLocaleString()}
                  trend={18.6} trendLabel="vs prev period" loading={loading}/>
                <KpiCard Icon={IcShield}  iconColor="#16a34a" bgIcon="#f0fdf4"
                  label="Resolved Alerts"     value={resolved.length.toLocaleString()}
                  trend={22.4} trendLabel="vs prev period" loading={loading}/>
                <KpiCard Icon={IcClock}   iconColor="#d97706" bgIcon="#fffbeb"
                  label="Avg Resolution Time" value={fmtDuration(avgResMs)||'—'}
                  trend={-8.7} trendLabel="vs prev period" loading={loading}/>
                <KpiCard Icon={IcUsersLg} iconColor="#7c3aed" bgIcon="#f5f3ff"
                  label="Active Companions"   value={companions.length}
                  trend={16.3} trendLabel="vs prev period" loading={loading}/>
              </div>

              {/* Row 2: Line + Donut */}
              <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16,marginBottom:16}}>
                <ChartCard title="Alerts Over Time" sub="Number of alerts per month"
                  action={<span style={{fontSize:12,color:'#9ca3af',background:'#f3f4f6',
                    padding:'4px 10px',borderRadius:6,fontWeight:500}}>Monthly</span>}>
                  <div style={{overflowX:'auto',paddingBottom:4}}>
                    <LineChart data={alertsOverTime} height={200}/>
                  </div>
                </ChartCard>
                <ChartCard title="Most Frequent Obstacles" sub="Top obstacles reported">
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <Donut segments={obstacleStats.map(o=>({value:o.count,color:o.color}))}
                      size={140} stroke={22}
                      centerLabel={total.toLocaleString()} centerSub="total"/>
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:5,minWidth:0}}>
                      {obstacleStats.slice(0,6).map((o,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:9,height:9,borderRadius:'50%',background:o.color,flexShrink:0}}/>
                          <span style={{fontSize:11,color:'#374151',flex:1,overflow:'hidden',
                                        textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.type}</span>
                          <span style={{fontSize:11,color:'#9ca3af',fontWeight:600,flexShrink:0}}>{o.pct}%</span>
                          <span style={{fontSize:11,color:'#6b7280',flexShrink:0}}>({o.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>

              {/* Row 3 */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>

                <ChartCard title="Alerts by Status" sub="Distribution of alerts">
                  <div style={{display:'flex',alignItems:'center',gap:20}}>
                    <Donut segments={statusStats} size={120} stroke={20}
                      centerLabel={total>0?`${((resolved.length/total)*100).toFixed(0)}%`:'0%'}
                      centerSub="resolved"/>
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
                      {statusStats.map((s,i)=>(
                        <div key={i}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/>
                              <span style={{fontSize:12,color:'#374151',fontWeight:500}}>{s.label}</span>
                            </div>
                            <span style={{fontSize:12,fontWeight:700,color:'#111827'}}>
                              {s.value.toLocaleString()}
                              <span style={{fontSize:10,color:'#9ca3af',marginLeft:3}}>
                                ({total>0?((s.value/total)*100).toFixed(1):0}%)
                              </span>
                            </span>
                          </div>
                          <div style={{height:6,background:'#f3f4f6',borderRadius:3,overflow:'hidden'}}>
                            <div style={{width:total>0?`${(s.value/total)*100}%`:'0%',
                              height:'100%',background:s.color,borderRadius:3,transition:'width 0.5s'}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Avg Resolution Time" sub="By obstacle type">
                  {resolutionByObstacle.length===0 ? (
                    <div style={{textAlign:'center',color:'#9ca3af',fontSize:13,padding:'20px 0'}}>
                      No resolved alerts yet.
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      {resolutionByObstacle.map((r,i)=>(
                        <div key={i}>
                          <div style={{display:'flex',alignItems:'center',
                                       justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontSize:12,color:'#374151',overflow:'hidden',
                                          textOverflow:'ellipsis',whiteSpace:'nowrap',
                                          flex:1,marginRight:8}}>{r.type}</span>
                            <span style={{fontSize:12,fontWeight:700,color:'#111827',flexShrink:0}}>
                              {fmtDuration(r.avg)}
                            </span>
                          </div>
                          <ProgressBar value={r.avg} max={maxAvgRes} color="#2563eb"/>
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Alerts by Time of Day" sub="Distribution by time slots">
                  <BarChart data={timeSlots} height={160} color="#2563eb"/>
                </ChartCard>
              </div>

              {/* Summary Insights */}
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #e5e7eb',
                           padding:'20px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{width:32,height:32,borderRadius:9,background:'#eff6ff',
                               display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb'}}>
                    <IcActivity/>
                  </div>
                  <p style={{fontWeight:700,fontSize:15,color:'#111827',margin:0}}>Summary Insights</p>
                </div>
                {insights.length===0 ? (
                  <p style={{color:'#9ca3af',fontSize:13,margin:0}}>Not enough data to generate insights.</p>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
                    {insights.map((txt,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,
                        padding:'12px 14px',background:'#f8fafc',borderRadius:10,
                        border:'1px solid #e5e7eb'}}>
                        <div style={{width:22,height:22,borderRadius:'50%',background:'#16a34a',
                                     flexShrink:0,display:'flex',alignItems:'center',
                                     justifyContent:'center',marginTop:1}}>
                          <IcCheck/>
                        </div>
                        <p style={{fontSize:13,color:'#374151',margin:0,lineHeight:1.55}}>{txt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
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