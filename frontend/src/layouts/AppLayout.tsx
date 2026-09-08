import { Activity, Bell, FolderTree, Image, LayoutDashboard, LogOut, Menu, Moon, Package, Settings, Shield, ShoppingCart, Sparkles, Sun, Tag, Ticket, Truck, User, UserCog, Users, Warehouse, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { clearAuthToken, getAdminAuthInfo, setAdminAuthInfo } from '../lib/auth';
import { cn } from '../lib/cn';
import { useI18n } from '../providers/i18n-provider';

const navSections = [
  {
    titleKey: 'navGeneral' as const,
    items: [
      { to: '/dashboard', labelKey: 'dashboard' as const, icon: LayoutDashboard, permission: 'dashboard.view' },
      { to: '/notifications', labelKey: 'notifications' as const, icon: Bell, permission: 'dashboard.view' },
    ],
  },
  {
    titleKey: 'navCommerce' as const,
    items: [
      { to: '/orders', labelKey: 'orders' as const, icon: ShoppingCart, permission: 'orders.view' },
      { to: '/customers', labelKey: 'customers' as const, icon: Users, permission: 'customers.view' },
      { to: '/coupons', labelKey: 'coupons' as const, icon: Ticket, permission: 'coupons.view' },
      { to: '/banners', labelKey: 'banners' as const, icon: Image, permission: 'banners.view' },
      { to: '/shipping', labelKey: 'shipping' as const, icon: Truck, permission: 'shipping.manage' },
    ],
  },
  {
    titleKey: 'navCatalog' as const,
    items: [
      { to: '/products', labelKey: 'products' as const, icon: Package, permission: 'products.view' },
      { to: '/categories', labelKey: 'categories' as const, icon: FolderTree, permission: 'categories.view' },
      { to: '/brands', labelKey: 'brands' as const, icon: Tag, permission: 'brands.view' },
      { to: '/inventory', labelKey: 'inventory' as const, icon: Warehouse, permission: 'inventory.view' },
    ],
  },
  {
    titleKey: 'navSystem' as const,
    items: [
      { to: '/staff', labelKey: 'staff' as const, icon: UserCog, permission: 'staff.view' },
      { to: '/roles', labelKey: 'roles' as const, icon: Shield, permission: 'roles.manage' },
      { to: '/settings', labelKey: 'settings' as const, icon: Settings, permission: 'settings.view' },
      { to: '/activity-logs', labelKey: 'activityLogs' as const, icon: Activity, permission: 'activity_logs.view' },
      { to: '/profile', labelKey: 'profile' as const, icon: User, permission: 'dashboard.view' },
    ],
  },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<string[]>(
    () => getAdminAuthInfo()?.permissions ?? [],
  );
  const projectLogoSrc = '/project-logo.png';
  const admin = getAdminAuthInfo();

  const visibleNavSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => adminPermissions.includes(item.permission)),
        }))
        .filter((section) => section.items.length > 0),
    [adminPermissions],
  );

  useEffect(() => {
    const refreshPermissions = async () => {
      try {
        const res = await api.get('/admin/profile');
        const profile = res.data?.data;
        const current = getAdminAuthInfo();
        if (profile && current) {
          setAdminAuthInfo({
            ...current,
            name: profile.name ?? current.name,
            email: profile.email ?? current.email,
            phone: profile.phone ?? current.phone,
            role: profile.role ?? current.role,
            role_name: profile.role_name ?? current.role_name,
            is_owner: profile.is_owner ?? current.is_owner,
            merchant: profile.merchant ?? current.merchant,
            store: profile.store ?? current.store,
            permissions: profile.permissions ?? current.permissions,
          });
          setAdminPermissions(profile.permissions ?? current.permissions);
        }
      } catch {
        // ignore
      }
    };

    refreshPermissions();
  }, []);

  return (
    <div className="relative min-h-screen text-[#1a1a2e] dark:text-[#e8e9f3]">
      {/* Animated glass background */}
      <div className="app-bg" aria-hidden>
        <div className="app-bg-orb app-bg-orb-1" />
        <div className="app-bg-orb app-bg-orb-2" />
        <div className="app-bg-orb app-bg-orb-3" />
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="modal-backdrop-enter fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
        />
      ) : null}

      {/* Glass Sidebar */}
      <aside
        className={cn(
          'sidebar-enter glass-strong fixed z-30 w-[270px] overflow-y-auto transition-transform duration-300 ease-out [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          'inset-y-0 start-0 rounded-none',
          sidebarOpen ? 'translate-x-0 rtl:translate-x-0' : '-translate-x-full rtl:translate-x-full',
          'md:inset-y-4 md:start-4 md:rounded-2xl md:translate-x-0 md:rtl:translate-x-0',
        )}
      >
        {/* Brand header */}
        <div className="relative mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7367f0] via-[#8b7ff5] to-[#6258cc] px-4 py-4 text-white shadow-[0_12px_32px_rgba(115,103,240,0.45)]">
          <div className="absolute -end-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center gap-2">
            <Sparkles size={18} className="shrink-0 opacity-90" />
            <h1 className="text-base font-bold tracking-wide">{t.appName}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="ms-auto text-white hover:bg-white/20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="px-3 pb-4">
          {/* User profile card */}
          <div className="glass-card mb-4 mt-3 flex items-center gap-3 rounded-2xl p-3">
            <div className="relative h-11 w-11 shrink-0">
              {!logoError ? (
                <img
                  src={projectLogoSrc}
                  alt="Project logo"
                  className="h-11 w-11 rounded-xl object-cover ring-2 ring-[#7367f0]/30"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7367f0]/20 to-[#7367f0]/5 text-sm font-bold text-[#7367f0] ring-2 ring-[#7367f0]/25">
                  {(admin?.name?.[0] ?? 'A').toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#28c76f] dark:border-[#1a1a2e]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{admin?.merchant?.business_name ?? admin?.name ?? t.appName}</p>
              <p className="truncate text-xs text-[#8a8da8] dark:text-[#a2a5be]">{admin?.role_name ?? admin?.email ?? 'Admin Panel'}</p>
            </div>
          </div>

          {visibleNavSections.map((section) => (
            <div key={section.titleKey} className="mb-3">
              <p className="px-2 pb-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-[#a5a7b8]">
                {t[section.titleKey]}
              </p>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'nav-link-glass group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                          isActive
                            ? 'nav-link-active'
                            : 'text-[#6f6b7d] hover:bg-white/50 dark:text-[#b6b8cc] dark:hover:bg-white/8',
                        )
                      }
                    >
                      <Icon
                        size={17}
                        className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                      />
                      {t[item.labelKey]}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      <div className="relative z-10 ms-0 flex min-h-screen flex-col md:ms-[302px]">
        {/* Glass Header */}
        <header className="header-enter glass sticky top-0 z-10 m-3 flex h-auto min-h-16 items-center justify-between rounded-2xl px-4 py-2 md:h-16 md:px-6 md:py-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="md:hidden" title="Menu">
              <Menu size={18} />
            </Button>
            <div>
              <p className="text-sm font-semibold">{admin?.name ?? t.appName}</p>
              <p className="text-xs text-[#8a8da8] dark:text-[#a2a5be]">
                {new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              title={t.language}
              className="rounded-xl font-semibold text-xs"
            >
              {locale === 'en' ? 'AR' : 'EN'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={t.theme}
              className="rounded-xl"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden rounded-xl sm:inline-flex"
              onClick={async () => {
                try {
                  await api.post('/admin/logout');
                } catch {
                  // ignore
                } finally {
                  clearAuthToken();
                  navigate('/login', { replace: true });
                }
              }}
            >
              <LogOut size={16} className="me-1" />
              {t.logout}
            </Button>
          </div>
        </header>

        <main className="flex-1 px-3 pb-3 md:px-6 md:pb-6">
          <div key={location.pathname} className="page-slide-enter">
            <Outlet />
          </div>
        </main>

        <footer className="glass mx-3 mb-3 rounded-2xl px-4 py-3 text-center text-xs text-[#8a8da8] dark:text-[#a2a5be] md:mx-6 md:mb-4">
          RaiyanSoft © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
