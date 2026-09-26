import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Locale = 'en' | 'ar';
type Theme = 'light' | 'dark';

type Dictionary = {
  appName: string;
  dashboard: string;
  orders: string;
  customers: string;
  products: string;
  categories: string;
  brands: string;
  inventory: string;
  coupons: string;
  banners: string;
  gyms: string;
  shipping: string;
  deliveryRegions: string;
  notifications: string;
  staff: string;
  roles: string;
  settings: string;
  activityLogs: string;
  profile: string;
  navGeneral: string;
  navCommerce: string;
  navCatalog: string;
  navSystem: string;
  login: string;
  logout: string;
  email: string;
  password: string;
  welcomeBack: string;
  signInSubtitle: string;
  language: string;
  theme: string;
};

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    appName: 'Admin Panel',
    dashboard: 'Dashboard',
    orders: 'Orders',
    customers: 'Customers',
    products: 'Products',
    categories: 'Categories',
    brands: 'Brands',
    inventory: 'Inventory',
    coupons: 'Coupons',
    banners: 'Promo Banners',
    gyms: 'Gyms',
    shipping: 'Shipping',
    deliveryRegions: 'Delivery zones',
    notifications: 'Notifications',
    staff: 'Staff',
    roles: 'Roles',
    settings: 'Settings',
    activityLogs: 'Activity Log',
    profile: 'Profile',
    navGeneral: 'General',
    navCommerce: 'Commerce',
    navCatalog: 'Catalog',
    navSystem: 'System',
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    welcomeBack: 'Welcome back',
    signInSubtitle: 'Sign in with your merchant account.',
    language: 'Language',
    theme: 'Theme',
  },
  ar: {
    appName: 'لوحة التحكم',
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    customers: 'العملاء',
    products: 'المنتجات',
    categories: 'التصنيفات',
    brands: 'الماركات',
    inventory: 'المخزون',
    coupons: 'كوبونات الخصم',
    banners: 'البنرات الإعلانية',
    gyms: 'الجيمات',
    shipping: 'الشحن',
    deliveryRegions: 'مناطق التوصيل ₪',
    notifications: 'الإشعارات',
    staff: 'الموظفون',
    roles: 'الأدوار',
    settings: 'الإعدادات',
    activityLogs: 'سجل النشاطات',
    profile: 'الملف الشخصي',
    navGeneral: 'عام',
    navCommerce: 'المبيعات',
    navCatalog: 'المتجر',
    navSystem: 'النظام',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    welcomeBack: 'أهلا بعودتك',
    signInSubtitle: 'سجل الدخول بحساب التاجر.',
    language: 'اللغة',
    theme: 'السمة',
  },
};

type I18nContextType = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  theme: Theme;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('admin_locale');
    return saved === 'ar' ? 'ar' : 'en';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('admin_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('admin_locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    localStorage.setItem('admin_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<I18nContextType>(() => ({
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    theme,
    t: dictionaries[locale],
    setLocale,
    setTheme,
  }), [locale, theme]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
