import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AdminRoot } from './AdminRoot';
import { isDashboardHost } from './lib/hosts';
import { StoreRoot } from './store/StoreRoot';

function AppModeSync() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    document.documentElement.dataset.app = isAdmin ? 'admin' : 'store';
  }, [isAdmin]);

  return null;
}

export default function UnifiedApp() {
  const dashboardOnly =
    typeof window !== 'undefined' && isDashboardHost(window.location.hostname);

  return (
    <>
      <AppModeSync />
      <Routes>
        <Route path="/admin/*" element={<AdminRoot />} />
        {dashboardOnly ? (
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        ) : (
          <Route path="/*" element={<StoreRoot />} />
        )}
      </Routes>
    </>
  );
}
