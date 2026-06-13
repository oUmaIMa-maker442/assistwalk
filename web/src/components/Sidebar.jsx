import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';

// ── Mobile breakpoint ─────────────────────────────────────────
function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return v;
}

// ── Active path matching ──────────────────────────────────────
function isPathActive(itemPath, currentPath) {
  if (!itemPath) return false;
  const exact = ['/admin', '/dashboard', '/map', '/history', '/profile'];
  if (exact.includes(itemPath)) return currentPath === itemPath;
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

// ── Portal tooltip ────────────────────────────────────────────
function Tooltip({ text, anchorRef, visible }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (visible && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    }
  }, [visible, anchorRef]);

  if (!visible) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      transform: 'translateY(-50%)',
      background: '#1e293b',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
      padding: '6px 12px',
      borderRadius: 8,
      whiteSpace: 'nowrap',
      zIndex: 9999,
      pointerEvents: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      letterSpacing: '0.01em',
    }}>
      {text}
      <span style={{
        position: 'absolute',
        right: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0, height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderRight: '5px solid #1e293b',
      }} />
    </div>,
    document.body
  );
}

// ── Nav item ──────────────────────────────────────────────────
function NavItem({ Icon, label, path, badge, active, collapsed }) {
  const [hov, setHov] = useState(false);
  const btnRef = useRef(null);
  const navigate = useNavigate();

  return (
    <div>
      <button
        ref={btnRef}
        onClick={() => path && navigate(path)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '11px 0' : '10px 14px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          background: active ? '#eff6ff' : hov ? '#f8fafc' : 'transparent',
          color: active ? '#2563eb' : hov ? '#374151' : '#64748b',
          fontWeight: active ? 600 : 400,
          fontSize: 14,
          transition: 'background 0.15s, color 0.15s',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {active && (
          <span style={{
            position: 'absolute',
            left: 0,
            top: '18%',
            bottom: '18%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: '#2563eb',
          }} />
        )}

        <span style={{ flexShrink: 0, display: 'flex' }}>
          <Icon />
        </span>

        <span style={{
          overflow: 'hidden',
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          transition: 'max-width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'left',
        }}>
          {label}
        </span>

        {!collapsed && badge > 0 && (
          <span style={{
            background: active ? '#2563eb' : '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            flexShrink: 0,
          }}>
            {badge}
          </span>
        )}

        {collapsed && badge > 0 && (
          <span style={{
            position: 'absolute',
            top: 5,
            right: 10,
            background: '#ef4444',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            width: 14,
            height: 14,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {badge}
          </span>
        )}
      </button>

      {collapsed && (
        <Tooltip
          text={badge > 0 ? `${label} (${badge})` : label}
          anchorRef={btnRef}
          visible={hov}
        />
      )}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────
function SectionLabel({ label, collapsed }) {
  if (collapsed) {
    return <div style={{ height: 1, background: '#f1f5f9', margin: '8px 10px' }} />;
  }
  return (
    <p style={{
      fontSize: 10,
      fontWeight: 700,
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      margin: '16px 14px 4px',
      padding: 0,
    }}>
      {label}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
export default function Sidebar({
  items = [],
  collapsed: collapsedProp,
  onToggle,
}) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const isControlled = collapsedProp !== undefined;
  const collapsed = isControlled ? collapsedProp : collapsedInternal;
  const toggle = onToggle ?? (() => setCollapsedInternal(v => !v));

  const location = useLocation();
  const isMobile = useIsMobile();

  const EXPANDED = 260;
  const COMPACT = 64;

  // On mobile: sidebar overlays via position:fixed + slide
  const mobileStyle = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: EXPANDED,
        transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 300,
        boxShadow: collapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.15)',
      }
    : {
        position: 'relative',
        height: '100vh',
        width: collapsed ? COMPACT : EXPANDED,
        minWidth: collapsed ? COMPACT : EXPANDED,
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && !collapsed && (
        <div
          onClick={toggle}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 299,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside style={{
        ...mobileStyle,
        background: '#fff',
        borderRight: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        zIndex: mobileStyle.zIndex ?? 100,
      }}>

        {/* ── Logo header ── */}
        <div style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: (!isMobile && collapsed) ? '0' : '0 18px',
          justifyContent: (!isMobile && collapsed) ? 'center' : 'flex-start',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <img
            src={logoIcon}
            alt="AssistWalk"
            style={{ width: 32, height: 32, flexShrink: 0, objectFit: 'contain' }}
          />
          <span style={{
            fontWeight: 800,
            fontSize: 16,
            color: '#0f172a',
            letterSpacing: '-0.4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: (!isMobile && collapsed) ? 0 : 160,
            opacity: (!isMobile && collapsed) ? 0 : 1,
            transition: 'max-width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
          }}>
            Assist<span style={{ color: '#2563eb' }}>Walk</span>
          </span>
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {items.map((item, i) =>
            item.type === 'section'
              ? <SectionLabel key={i} label={item.label} collapsed={!isMobile && collapsed} />
              : (
                <NavItem
                  key={i}
                  Icon={item.Icon}
                  label={item.label}
                  path={item.path}
                  badge={item.badge}
                  collapsed={!isMobile && collapsed}
                  active={isPathActive(item.path, location.pathname)}
                />
              )
          )}
        </nav>

        {/* ── Desktop: collapse toggle at bottom ── */}
        {!isMobile && !isControlled && (
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: collapsed ? 0 : 8,
              padding: '14px',
              borderTop: '1px solid #f1f5f9',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              width: '100%',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            {collapsed ? (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
                <span style={{
                  overflow: 'hidden',
                  maxWidth: collapsed ? 0 : 120,
                  opacity: collapsed ? 0 : 1,
                  transition: 'max-width 0.25s ease, opacity 0.18s ease',
                  whiteSpace: 'nowrap',
                }}>
                  Collapse
                </span>
              </>
            )}
          </button>
        )}
      </aside>
    </>
  );
}
