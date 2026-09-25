import { LayoutDashboard, Shield, Sparkles, TrendingUp, UserCog, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { api } from '../lib/api';
import { getAdminAuthInfo, hasPermission } from '../lib/auth';
import { cn } from '../lib/cn';
import { useI18n } from '../providers/i18n-provider';

type DashboardStats = {
  total_sales: number;
  orders_today: number;
  processing_orders: number;
  customers_count: number;
  products_count: number;
  low_stock_count: number;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    status: string;
    total: number;
    placed_at?: string;
  }>;
  recent_activities: Array<{
    id: number;
    action: string;
    module: string;
    description?: string;
    created_at: string;
    user?: { name: string };
  }>;
};

export function DashboardPage() {
  const { t, locale } = useI18n();
  const ar = locale === 'ar';
  const admin = getAdminAuthInfo();

  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then((res) => setStats(res.data?.data ?? null))
      .catch(() => undefined);
  }, []);

  const statCards = [
    { key: 'sales', label: ar ? 'إجمالي المبيعات' : 'Total Sales', value: `${(stats?.total_sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`, icon: TrendingUp, color: 'from-[#7367f0] to-[#9e95f5]', glow: 'rgba(115,103,240,0.35)' },
    { key: 'orders', label: ar ? 'طلبات اليوم' : 'Orders Today', value: stats?.orders_today ?? 0, icon: LayoutDashboard, color: 'from-[#28c76f] to-[#48da89]', glow: 'rgba(40,199,111,0.35)' },
    { key: 'processing', label: ar ? 'قيد المعالجة' : 'Processing', value: stats?.processing_orders ?? 0, icon: Zap, color: 'from-[#ff9f43] to-[#ffb976]', glow: 'rgba(255,159,67,0.35)' },
    { key: 'customers', label: ar ? 'العملاء' : 'Customers', value: stats?.customers_count ?? 0, icon: UserCog, color: 'from-[#00cfe8] to-[#4dd9ef]', glow: 'rgba(0,207,232,0.35)' },
  ];

  const quickLinks = [
    hasPermission('orders.view') ? { to: '/admin/orders', label: ar ? 'الطلبات' : 'Orders', icon: LayoutDashboard } : null,
    hasPermission('products.view') ? { to: '/admin/products', label: ar ? 'المنتجات' : 'Products', icon: Zap } : null,
    hasPermission('customers.view') ? { to: '/admin/customers', label: ar ? 'العملاء' : 'Customers', icon: UserCog } : null,
    hasPermission('staff.view') ? { to: '/admin/staff', label: ar ? 'الموظفون' : 'Staff', icon: UserCog } : null,
    hasPermission('roles.manage') ? { to: '/admin/roles', label: t.roles, icon: Shield } : null,
  ].filter(Boolean) as Array<{ to: string; label: string; icon: typeof UserCog }>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="card-enter glass-strong relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-[#7367f0]/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#7367f0]/10 px-3 py-1 text-xs font-semibold text-[#7367f0] dark:bg-[#7367f0]/20 dark:text-[#a89cf8]">
              <Sparkles size={12} />
              {admin?.merchant?.business_name ?? (ar ? 'لوحة التحكم' : 'Admin Dashboard')}
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {ar ? 'مرحباً' : 'Welcome back'}
              {admin?.name ? <span className="glow-text">، {admin.name}</span> : '!'}
            </h1>
            <p className="max-w-md text-sm text-[#8a8da8] dark:text-[#a2a5be]">
              {ar ? 'إدارة متجرك بكل سهولة — كل شيء في مكان واحد.' : 'Manage your store with ease — everything in one place.'}
            </p>
          </div>
          <div className="stat-icon-pulse flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7367f0] to-[#9e95f5] text-white shadow-[0_12px_32px_rgba(115,103,240,0.4)]">
            <LayoutDashboard size={28} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className={cn('glass-card rounded-2xl border-0', `card-enter card-enter-${i + 1}`)}>
              <CardContent className="relative p-5">
                <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full opacity-20 blur-2xl" style={{ background: stat.glow }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#8a8da8]">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                  </div>
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white', stat.color)} style={{ boxShadow: `0 8px 20px ${stat.glow}` }}>
                    <Icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-enter card-enter-3 glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-base">{ar ? 'حالة النظام' : 'System Status'}</CardTitle>
            <CardDescription>{ar ? 'المتجر جاهز للعمل' : 'Store is ready'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#28c76f] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#28c76f]" />
              </span>
              <span className="text-sm font-medium text-[#28c76f]">{ar ? 'متصل ويعمل' : 'Online & Running'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enter card-enter-4 glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-base">{ar ? 'دورك' : 'Your Role'}</CardTitle>
            <CardDescription>{admin?.role_name ?? admin?.role ?? '—'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#8a8da8]">
              {(admin?.permissions ?? []).length} {ar ? 'صلاحية نشطة' : 'active permissions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats?.recent_orders && stats.recent_orders.length > 0 ? (
        <Card className="glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-base">{ar ? 'آخر الطلبات' : 'Recent Orders'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent_orders.map((order) => (
              <Link key={order.id} to="/admin/orders" className="flex items-center justify-between gap-3 rounded-xl bg-white/30 px-3 py-2 transition hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10">
                <div>
                  <p className="text-sm font-medium">{order.order_number}</p>
                  <p className="text-xs text-[#8a8da8]">{order.customer_name} · {order.status}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{order.total.toFixed(2)} SAR</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {stats?.recent_activities && stats.recent_activities.length > 0 ? (
        <Card className="glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-base">{ar ? 'آخر الأنشطة' : 'Recent Activity'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent_activities.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{log.description ?? log.action}</p>
                  <p className="text-xs text-[#8a8da8]">{log.user?.name ?? '—'} · {log.module}</p>
                </div>
                <span className="shrink-0 text-xs text-[#8a8da8]">{new Date(log.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {quickLinks.length > 0 ? (
        <Card className="glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="text-base">{ar ? 'وصول سريع' : 'Quick Access'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.to} to={link.to} className="nav-link-glass glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
                    <Icon size={16} className="text-[#7367f0]" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
