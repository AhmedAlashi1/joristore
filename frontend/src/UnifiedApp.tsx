import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AdminRoot } from './AdminRoot';
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
  return (
    <>
      <AppModeSync />
      <Routes>
        <Route path="/admin/*" element={<AdminRoot />} />
        <Route path="/*" element={<StoreRoot />} />
      </Routes>
    </>
  );
}
