import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AdminsPage } from './pages/AdminsPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { BannersPage } from './pages/BannersPage';
import { BrandsPage } from './pages/BrandsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CouponsPage } from './pages/CouponsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { GymsPage } from './pages/GymsPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RolesPage } from './pages/RolesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DeliveryRegionsPage } from './pages/DeliveryRegionsPage';
import { ShippingPage } from './pages/ShippingPage';
import { hasPermission, isAuthenticated } from './lib/auth';

function PrivateRoute({ children }: { children: ReactElement }) {
  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />;
  return children;
}

function PermissionRoute({ permission, children }: { permission: string; children: ReactElement }) {
  if (!hasPermission(permission)) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PermissionRoute permission="dashboard.view"><DashboardPage /></PermissionRoute>} />
        <Route path="orders" element={<PermissionRoute permission="orders.view"><OrdersPage /></PermissionRoute>} />
        <Route path="customers" element={<PermissionRoute permission="customers.view"><CustomersPage /></PermissionRoute>} />
        <Route path="products" element={<PermissionRoute permission="products.view"><ProductsPage /></PermissionRoute>} />
        <Route path="categories" element={<PermissionRoute permission="categories.view"><CategoriesPage /></PermissionRoute>} />
        <Route path="brands" element={<PermissionRoute permission="brands.view"><BrandsPage /></PermissionRoute>} />
        <Route path="inventory" element={<PermissionRoute permission="inventory.view"><InventoryPage /></PermissionRoute>} />
        <Route path="coupons" element={<PermissionRoute permission="coupons.view"><CouponsPage /></PermissionRoute>} />
        <Route path="banners" element={<PermissionRoute permission="banners.view"><BannersPage /></PermissionRoute>} />
        <Route path="gyms" element={<PermissionRoute permission="settings.view"><GymsPage /></PermissionRoute>} />
        <Route path="shipping" element={<PermissionRoute permission="shipping.manage"><ShippingPage /></PermissionRoute>} />
        <Route path="delivery-regions" element={<PermissionRoute permission="shipping.manage"><DeliveryRegionsPage /></PermissionRoute>} />
        <Route path="notifications" element={<PermissionRoute permission="dashboard.view"><NotificationsPage /></PermissionRoute>} />
        <Route path="staff" element={<PermissionRoute permission="staff.view"><AdminsPage /></PermissionRoute>} />
        <Route path="admins" element={<Navigate to="../staff" replace />} />
        <Route path="roles" element={<PermissionRoute permission="roles.manage"><RolesPage /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute permission="settings.view"><SettingsPage /></PermissionRoute>} />
        <Route path="activity-logs" element={<PermissionRoute permission="activity_logs.view"><ActivityLogsPage /></PermissionRoute>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
