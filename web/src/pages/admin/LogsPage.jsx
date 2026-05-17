import { useNavigate } from 'react-router-dom';
import { logout } from '../../utils/auth';

export default function LogsPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc',
                  fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <header style={{
        height:62, background:'#fff', borderBottom:'1px solid #e5e7eb',
        padding:'0 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <button onClick={() => navigate('/admin')} style={{
          background:'none', border:'none', cursor:'pointer',
          color:'#6b7280', fontSize:13, fontWeight:600,
        }}>
          ← Back to Dashboard
        </button>
        <button onClick={logout} style={{
          border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 14px',
          background:'none', cursor:'pointer', color:'#6b7280', fontSize:13,
        }}>
          Logout
        </button>
      </header>
      <div style={{ padding:'40px', maxWidth:900, margin:'0 auto' }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 8px' }}>
          Activity Logs
        </h1>
        <p style={{ color:'#6b7280', margin:'0 0 32px' }}>
          View alerts and OCR activity history.
        </p>
        <div style={{
          background:'#fff', borderRadius:16, border:'1px solid #e5e7eb',
          padding:40, textAlign:'center', color:'#9ca3af',
        }}>
          📋 Logs coming soon.
        </div>
      </div>
    </div>
  );
}