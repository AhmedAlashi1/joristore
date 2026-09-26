import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Locale = 'ar' | 'en';

type Dict = {
  home: string;
  shop: string;
  cart: string;
  orders: string;
  account: string;
  search: string;
  featured: string;
  categories: string;
  addToCart: string;
  outOfStock: string;
  installTitle: string;
  installSubtitle: string;
  installButton: string;
  installGuideButton: string;
  installIosHint: string;
  installDesktopHint: string;
  dismiss: string;
  pushPromptTitle: string;
  pushPromptBody: string;
  pushPromptAction: string;
  wishlist: string;
  emptyWishlist: string;
  emptyWishlistHint: string;
  clearWishlist: string;
  allCategories: string;
  viewAll: string;
  searchResults: string;
  noProducts: string;
  checkout: string;
  deliveryAddress: string;
  shippingMethod: string;
  paymentMethod: string;
  cashOnDelivery: string;
  placeOrder: string;
  subtotal: string;
  shipping: string;
  total: string;
  notifications: string;
  welcome: string;
  emptyCart: string;
  comingSoon: string;
  openInApp: string;
  appearance: string;
  appearanceLight: string;
  appearanceDark: string;
  appearanceSystem: string;
  smartSearch: string;
  smartSearchPlaceholder: string;
  smartSearchAi: string;
  smartSearchLocal: string;
  viewAllResults: string;
  searchFailed: string;
  newArrivals: string;
  bestSellers: string;
  weeklyDeals: string;
  nearbyGym: string;
  viewDetails: string;
  gymHours: string;
  gymHoursHint: string;
  gymSubscription: string;
  chooseSize: string;
  chooseColor: string;
  categoriesBrowse: string;
  sportsWorldSubtitle: string;
  allInCategory: string;
  backToCategories: string;
  viewAllShop: string;
  filters: string;
  filterBrand: string;
  filterColor: string;
  filterSize: string;
  clearFilters: string;
  contactUs: string;
  followUs: string;
  termsAndConditions: string;
  savedAddresses: string;
  noSavedAddresses: string;
  addAddress: string;
  defaultAddress: string;
  setDefaultAddress: string;
  editAddress: string;
  deleteAddress: string;
};

const dicts: Record<Locale, Dict> = {
  ar: {
    home: 'الرئيسية',
    shop: 'المتجر',
    cart: 'السلة',
    account: 'حسابي',
    search: 'ابحث عن منتج...',
    featured: 'منتجات مميزة',
    categories: 'التصنيفات',
    orders: 'طلباتي',
    addToCart: 'أضف للسلة',
    outOfStock: 'غير متوفر',
    installTitle: 'ثبّت تطبيق على شاشتك الرئيسية',
    installSubtitle: 'تجربة أسرع — مثل التطبيق بدون متجر',
    installButton: 'تثبيت الآن',
    installGuideButton: 'خطوات التثبيت',
    installIosHint: 'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية»',
    installDesktopHint: 'من المتصفح: القائمة ← تثبيت التطبيق',
    dismiss: 'لاحقاً',
    pushPromptTitle: 'إشعارات الشاشة والصوت',
    pushPromptBody: 'فعّل الإشعار ليصلك على شاشة الجوال حتى والتطبيق مغلق (بعد تثبيت التطبيق على iPhone).',
    pushPromptAction: 'تفعيل الإشعارات',
    wishlist: 'المفضلة',
    emptyWishlist: 'قائمة المفضلة فارغة',
    emptyWishlistHint: 'اضغط ♥ على أي منتج لحفظه هنا',
    clearWishlist: 'مسح الكل',
    allCategories: 'الكل',
    viewAll: 'عرض الكل',
    searchResults: 'نتائج البحث',
    noProducts: 'لا توجد منتجات',
    checkout: 'إتمام الطلب',
    deliveryAddress: 'عنوان التوصيل',
    shippingMethod: 'طريقة الشحن',
    paymentMethod: 'طريقة الدفع',
    cashOnDelivery: 'الدفع عند الاستلام',
    placeOrder: 'تأكيد الطلب',
    subtotal: 'المجموع',
    shipping: 'الشحن',
    total: 'الإجمالي',
    notifications: 'الإشعارات',
    welcome: 'مرحباً بك',
    emptyCart: 'سلتك فارغة',
    comingSoon: 'قريباً',
    openInApp: 'افتح في التطبيق',
    appearance: 'المظهر',
    appearanceLight: 'فاتح',
    appearanceDark: 'داكن',
    appearanceSystem: 'تلقائي',
    smartSearch: 'بحث ذكي',
    smartSearchPlaceholder: 'مثال: بدي هدية لأمي أو حذاء رياضي مريح...',
    smartSearchAi: 'نتائج بالذكاء الاصطناعي',
    smartSearchLocal: 'نتائج ذكية',
    viewAllResults: 'عرض كل النتائج في المتجر',
    searchFailed: 'تعذّر البحث، حاول مرة أخرى',
    newArrivals: 'وصل حديثاً',
    bestSellers: 'الأكثر طلباً',
    weeklyDeals: 'عرض الأسبوع',
    nearbyGym: 'أقرب جيم',
    viewDetails: 'التفاصيل',
    gymHours: 'ساعات العمل',
    gymHoursHint: 'اضغط للتفاصيل والاشتراك',
    gymSubscription: 'الاشتراك والأسعار',
    chooseSize: 'المقاس',
    chooseColor: 'اللون',
    categoriesBrowse: 'أقسام المتجر',
    sportsWorldSubtitle: 'معرض عالم الرياضة',
    allInCategory: 'عرض كل منتجات',
    backToCategories: 'رجوع للأقسام',
    viewAllShop: 'تصفح كل المنتجات',
    filters: 'فلترة',
    filterBrand: 'الماركة',
    filterColor: 'اللون',
    filterSize: 'المقاس',
    clearFilters: 'مسح الفلاتر',
    contactUs: 'تواصل معنا',
    followUs: 'تابعنا على السوشال ميديا',
    termsAndConditions: 'الشروط والأحكام',
    savedAddresses: 'العناوين المحفوظة',
    noSavedAddresses: 'لا توجد عناوين محفوظة بعد',
    addAddress: 'إضافة عنوان',
    defaultAddress: 'العنوان الافتراضي',
    setDefaultAddress: 'جعله افتراضي',
    editAddress: 'تعديل',
    deleteAddress: 'حذف',
  },
  en: {
    home: 'Home',
    shop: 'Shop',
    cart: 'Cart',
    account: 'Account',
    search: 'Search products...',
    featured: 'Featured',
    categories: 'Categories',
    orders: 'Orders',
    addToCart: 'Add to cart',
    outOfStock: 'Out of stock',
    installTitle: 'Install app on your home screen',
    installSubtitle: 'Faster experience — like a native app',
    installButton: 'Install now',
    installGuideButton: 'How to install',
    installIosHint: 'Tap Share, then Add to Home Screen',
    installDesktopHint: 'Browser menu → Install app',
    dismiss: 'Later',
    pushPromptTitle: 'Lock screen notifications',
    pushPromptBody: 'Enable alerts on your phone even when the app is closed (on iPhone: add to Home Screen first).',
    pushPromptAction: 'Enable notifications',
    wishlist: 'Wishlist',
    emptyWishlist: 'Your wishlist is empty',
    emptyWishlistHint: 'Tap ♥ on any product to save it here',
    clearWishlist: 'Clear all',
    allCategories: 'All',
    viewAll: 'View all',
    searchResults: 'Search results',
    noProducts: 'No products found',
    checkout: 'Checkout',
    deliveryAddress: 'Delivery address',
    shippingMethod: 'Shipping method',
    paymentMethod: 'Payment method',
    cashOnDelivery: 'Cash on delivery',
    placeOrder: 'Place order',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    notifications: 'Notifications',
    welcome: 'Welcome',
    emptyCart: 'Your cart is empty',
    comingSoon: 'Coming soon',
    openInApp: 'Open in app',
    appearance: 'Appearance',
    appearanceLight: 'Light',
    appearanceDark: 'Dark',
    appearanceSystem: 'System',
    smartSearch: 'Smart search',
    smartSearchPlaceholder: 'e.g. gift for mom or comfy running shoes...',
    smartSearchAi: 'AI-powered results',
    smartSearchLocal: 'Smart results',
    viewAllResults: 'View all results in shop',
    searchFailed: 'Search failed, try again',
    newArrivals: 'New arrivals',
    bestSellers: 'Best sellers',
    weeklyDeals: 'Weekly deals',
    nearbyGym: 'Nearby gym',
    viewDetails: 'Details',
    gymHours: 'Opening hours',
    gymHoursHint: 'Tap for hours & membership',
    gymSubscription: 'Membership & pricing',
    chooseSize: 'Size',
    chooseColor: 'Color',
    categoriesBrowse: 'Departments',
    sportsWorldSubtitle: 'Sports World Exhibition',
    allInCategory: 'All products in',
    backToCategories: 'Back to categories',
    viewAllShop: 'Browse all products',
    filters: 'Filters',
    filterBrand: 'Brand',
    filterColor: 'Color',
    filterSize: 'Size',
    clearFilters: 'Clear filters',
    contactUs: 'Contact us',
    followUs: 'Follow us on social media',
    termsAndConditions: 'Terms & Conditions',
    savedAddresses: 'Saved addresses',
    noSavedAddresses: 'No saved addresses yet',
    addAddress: 'Add address',
    defaultAddress: 'Default',
    setDefaultAddress: 'Set as default',
    editAddress: 'Edit',
    deleteAddress: 'Delete',
  },
};

type LocaleCtx = {
  locale: Locale;
  t: Dict;
  dir: 'rtl' | 'ltr';
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    (localStorage.getItem('store_locale') as Locale) || 'ar',
  );

  useEffect(() => {
    localStorage.setItem('store_locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const value = useMemo<LocaleCtx>(() => ({
    locale,
    t: dicts[locale],
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    toggleLocale: () => setLocale((l) => (l === 'ar' ? 'en' : 'ar')),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale outside provider');
  return ctx;
}
