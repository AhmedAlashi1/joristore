import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AccountPage } from './pages/AccountPage';
import { AddressEditorPage } from './pages/AddressEditorPage';
import { AddressesPage } from './pages/AddressesPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { CustomerNotificationsPage } from './pages/NotificationsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductPage } from './pages/ProductPage';
import { ShopPage } from './pages/ShopPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { TermsPage } from './pages/TermsPage';
import { WishlistPage } from './pages/WishlistPage';
import { GymPage } from './pages/GymPage';

export default function StoreApp() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="notifications" element={<CustomerNotificationsPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="account/addresses" element={<AddressesPage />} />
        <Route path="account/addresses/new" element={<AddressEditorPage />} />
        <Route path="account/addresses/:id/edit" element={<AddressEditorPage />} />
        <Route path="gym/:id" element={<GymPage />} />
      </Route>
    </Routes>
  );
}
