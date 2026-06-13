import { useState } from 'react';

const KEY = 'aw_sidebar_collapsed';

/**
 * Persists sidebar collapsed/expanded state in localStorage.
 * Default: collapsed (true). Only the toggle function changes state —
 * navigation never touches it.
 */
export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(KEY, String(next)); } catch {}
      return next;
    });
  };

  return [collapsed, toggle];
}
