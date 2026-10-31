import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AdminRoot } from './AdminRoot';
import { isDashboardHost } from './lib/hosts';
import { PartnerRoot } from './PartnerRoot';
import { StoreRoot } from './store/StoreRoot';

function AppModeSync() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const isPartner = pathname.startsWith('/partner');

  useEffect(() => {
    document.documentElement.dataset.app = isAdmin ? 'admin' : isPartner ? 'partner' : 'store';
  }, [isAdmin, isPartner]);

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
        <Route path="/partner/*" element={<PartnerRoot />} />
        {dashboardOnly ? (
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        ) : (
          <Route path="/*" element={<StoreRoot />} />
        )}
      </Routes>
    </>
  );
}
