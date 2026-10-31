import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { isPartnerAuthenticated } from '../lib/partner-auth';
import { PartnerLayout } from './PartnerLayout';
import { PartnerCommissionsPage } from './pages/PartnerCommissionsPage';
import { PartnerDashboardPage } from './pages/PartnerDashboardPage';
import { PartnerLoginPage } from './pages/PartnerLoginPage';
import { PartnerPayoutsPage } from './pages/PartnerPayoutsPage';

function PrivateRoute({ children }: { children: ReactElement }) {
  if (!isPartnerAuthenticated()) return <Navigate to="/partner/login" replace />;
  return children;
}

export default function PartnerApp() {
  return (
    <Routes>
      <Route path="login" element={<PartnerLoginPage />} />
      <Route element={<PrivateRoute><PartnerLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PartnerDashboardPage />} />
        <Route path="commissions" element={<PartnerCommissionsPage />} />
        <Route path="payouts" element={<PartnerPayoutsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/partner/login" replace />} />
    </Routes>
  );
}
