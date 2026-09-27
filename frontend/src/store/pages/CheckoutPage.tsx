import {
  CreditCard,
  Home,
  Loader2,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Store,
  Truck,
  Tag,
  Upload,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentMethodInstructions, paymentMethodLabel, type PaymentMethodConfig } from '../../lib/payment-methods';
import { CheckoutSection } from '../components/checkout/CheckoutSection';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { customerApi, storeApi, unwrap } from '../lib/api';
import { cn, formatPrice } from '../lib/utils';
import { useCart } from '../providers/cart-provider';
import type { CustomerAddress } from '../providers/customer-provider';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

type ShippingMethod = { id: number; name: string; price: number; free_shipping_minimum?: number };
type FulfillmentType = 'delivery' | 'pickup';
type AppliedCoupon = {
  code: string;
  name: string;
  applies_to: 'subtotal' | 'shipping';
  subtotal_discount: number;
  shipping: number;
};

export function CheckoutPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const navigate = useNavigate();
  const { items, total, clear } = useCart();
  const { isLoggedIn, refresh, customer } = useCustomer();
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [storePaymentMethods, setStorePaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash_on_delivery');
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [note, setNote] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    void refresh();
    customerApi.profile().then((p) => {
      setAddresses(p.addresses ?? []);
      setWalletBalance(p.wallet_balance ?? 0);
      const def = p.addresses?.find((a) => a.is_default) ?? p.addresses?.[0];
      if (def) setAddressId(def.id);
    }).catch(() => undefined);
    storeApi.shippingMethods()
      .then((r) => {
        const methods = unwrap<ShippingMethod[]>(r);
        setShippingMethods(methods);
        if (methods[0]) setShippingId(methods[0].id);
      })
      .catch(() => undefined);
    storeApi.paymentMethods()
      .then((r) => {
        const methods = unwrap<PaymentMethodConfig[]>(r);
        setStorePaymentMethods(methods);
        if (methods[0]?.id) setPaymentMethod(methods[0].id);
      })
      .catch(() => undefined);
  }, [isLoggedIn, refresh]);

  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;
  const isDelivery = fulfillment === 'delivery';

  useEffect(() => {
    if (!isDelivery || !selectedAddress?.delivery_region_id) {
      setDeliveryFee(null);
      return;
    }
    storeApi.deliveryQuote({
      delivery_region_id: selectedAddress.delivery_region_id,
      street: selectedAddress.street,
    })
      .then((r) => setDeliveryFee(unwrap<{ price: number }>(r).price))
      .catch(() => setDeliveryFee(null));
  }, [isDelivery, selectedAddress?.id, selectedAddress?.delivery_region_id, selectedAddress?.street]);

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponMessage('');
  }, [total, fulfillment, addressId, shippingId, deliveryFee, isDelivery]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold">{t.emptyCart}</p>
        <Link to="/shop" className="btn-primary mt-4 inline-flex">{t.shop}</Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold">{ar ? 'سجّل دخول لإتمام الطلب' : 'Login to checkout'}</p>
        <Link to="/account" className="btn-primary mt-4 inline-flex">{t.account}</Link>
      </div>
    );
  }

  const shipping = shippingMethods.find((s) => s.id === shippingId);
  const legacyShippingPrice = shipping && shipping.free_shipping_minimum && total >= shipping.free_shipping_minimum
    ? 0
    : (shipping?.price ?? 0);
  const usesZoneDelivery = isDelivery && deliveryFee != null && Boolean(selectedAddress?.delivery_region_id);
  const shippingPrice = !isDelivery
    ? 0
    : !addressId
      ? null
      : usesZoneDelivery
        ? deliveryFee
        : legacyShippingPrice;
  const baseShipping = shippingPrice ?? 0;
  const displayShipping = appliedCoupon != null ? appliedCoupon.shipping : baseShipping;
  const subtotalCouponDiscount = appliedCoupon?.subtotal_discount ?? 0;
  const shippingCouponSaved = appliedCoupon ? Math.max(0, baseShipping - appliedCoupon.shipping) : 0;
  const grandTotal = Math.max(0, total - subtotalCouponDiscount + displayShipping);
  const canUseWallet = walletBalance >= grandTotal;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponApplying(true);
    setCouponMessage('');
    setError('');
    try {
      const result = await customerApi.validateCoupon({
        code,
        subtotal: total,
        shipping: baseShipping,
      });
      setAppliedCoupon({
        code: result.code,
        name: result.name,
        applies_to: result.applies_to,
        subtotal_discount: result.subtotal_discount,
        shipping: result.shipping,
      });
      setCouponInput(result.code);
      setCouponMessage(ar ? `تم تطبيق «${result.name}»` : `Applied «${result.name}»`);
    } catch (e) {
      setAppliedCoupon(null);
      setCouponMessage(e instanceof Error ? e.message : 'Invalid coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMessage('');
  };
  const selectedPay = storePaymentMethods.find((m) => m.id === paymentMethod);
  const needsReceipt = Boolean(selectedPay?.requires_receipt);
  const payInstructions = selectedPay ? paymentMethodInstructions(selectedPay, ar) : '';

  const contactName = customer?.full_name || selectedAddress?.full_name || (ar ? 'عميل' : 'Customer');
  const contactPhone = customer?.phone || selectedAddress?.phone || '—';

  const onReceiptPick = async (file: File | null) => {
    if (!file) return;
    setReceiptUploading(true);
    setError('');
    try {
      const uploaded = await customerApi.uploadPaymentReceipt(file);
      setReceiptPath(uploaded.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setReceiptPath(null);
    } finally {
      setReceiptUploading(false);
    }
  };

  const placeOrder = async () => {
    if (isDelivery && !addressId) {
      setError(ar ? 'اختر عنوان التوصيل' : 'Select delivery address');
      return;
    }
    if (isDelivery && selectedAddress && !selectedAddress.delivery_region_id) {
      setError(ar ? 'حدّث العنوان واختر المنطقة من حسابي' : 'Update your address with a delivery region');
      return;
    }
    if (paymentMethod === 'wallet' && !canUseWallet) {
      setError(ar ? 'رصيد المحفظة غير كافٍ' : 'Insufficient wallet balance');
      return;
    }
    if (needsReceipt && !receiptPath) {
      setError(ar ? 'ارفع صورة إيصال الدفع' : 'Upload payment receipt');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const order = await customerApi.placeOrder({
        fulfillment_type: fulfillment,
        customer_address_id: isDelivery ? addressId! : undefined,
        shipping_method_id: isDelivery ? (shippingId ?? undefined) : undefined,
        payment_method: paymentMethod,
        payment_receipt_path: receiptPath ?? undefined,
        customer_note: note || undefined,
        coupon_code: appliedCoupon?.code ?? undefined,
        items: items.map((i) => ({ product_variant_id: i.productVariantId, quantity: i.quantity })),
      });
      clear();
      navigate('/orders', { state: { newOrder: order.order_number } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = storePaymentMethods
    .filter((m) => m.id !== 'wallet' || walletBalance > 0)
    .map((m) => ({
      id: m.id,
      label:
        m.id === 'wallet'
          ? `${paymentMethodLabel(m, ar)} (${formatPrice(walletBalance)})`
          : paymentMethodLabel(m, ar),
      disabled: m.id === 'wallet' ? !canUseWallet : false,
    }));

  const readyToPay = isDelivery ? Boolean(addressId) : true;

  const ctaLabel = !readyToPay
    ? (ar ? 'اختر عنوان التوصيل أولاً' : 'Choose delivery address first')
    : needsReceipt && !receiptPath
      ? (ar ? 'ارفع إيصال الدفع' : 'Upload payment receipt')
      : t.placeOrder;

  const ctaDisabled = loading || receiptUploading || !readyToPay || (needsReceipt && !receiptPath);

  const fulfillmentBtn = (type: FulfillmentType, label: string, icon: ReactNode) => {
    const active = fulfillment === type;
    return (
      <button
        type="button"
        onClick={() => {
          setFulfillment(type);
          setError('');
        }}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition-all',
          active ? 'bg-[var(--primary)] text-white shadow-md' : 'border border-black/[0.08] bg-white/70 text-[var(--fg)]',
        )}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <>
      <div className="checkout-flow space-y-3 pb-8 pt-1">
        <div className="px-0.5">
          <h1 className="text-base font-bold">{t.checkout}</h1>
          <p className="mt-0.5 text-[11px] text-store-muted">{ar ? 'أكمل بياناتك ثم تأكيد الطلب' : 'Complete your details, then confirm'}</p>
        </div>

        <CheckoutSection icon={<User size={16} />} title={ar ? 'معلومات التواصل' : 'Contact'}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
              {contactName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{contactName}</p>
              <p className="text-[11px] text-store-muted" dir="ltr">{contactPhone}</p>
            </div>
          </div>
        </CheckoutSection>

        <CheckoutSection
          icon={<Truck size={16} />}
          title={ar ? 'طريقة الاستلام' : 'Fulfillment'}
          hint={ar ? 'توصيل أو استلام من المعرض' : 'Delivery or pickup'}
        >
          <div className="flex gap-2">
            {fulfillmentBtn('delivery', ar ? 'توصيل خارجي' : 'Delivery', <Truck size={14} />)}
            {fulfillmentBtn('pickup', ar ? 'استلام من المعرض' : 'Showroom pickup', <Store size={14} />)}
          </div>
        </CheckoutSection>

        {isDelivery ? (
          <CheckoutSection
            icon={<MapPin size={20} />}
            title={t.deliveryAddress}
            hint={ar ? 'اختر عنواناً واحداً للتوصيل' : 'Pick one delivery address'}
          >
            {addresses.length === 0 ? (
              <div className="rounded-lg bg-[var(--primary-soft)]/40 p-3 text-center text-xs">
                <Link to="/account/addresses" className="font-bold text-[var(--primary)]">
                  {ar ? 'أضف عنوان توصيل' : 'Add delivery address'}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => {
                  const selected = addressId === a.id;
                  const label = a.label || a.region_name || a.city || (ar ? 'عنوان' : 'Address');
                  const line = [a.region_name || a.city, a.street, a.building].filter(Boolean).join(' · ');
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAddressId(a.id)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg border p-2.5 text-start transition-all',
                        selected
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)]/60'
                          : 'border-black/[0.06] bg-white/60',
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        selected ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary-soft)] text-[var(--primary)]',
                      )}
                      >
                        <Home size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{label}</p>
                        <p className="mt-0.5 text-[10px] leading-snug text-store-muted">{line || '—'}</p>
                      </div>
                    </button>
                  );
                })}
                <Link to="/account/addresses" className="block pt-1 text-center text-xs font-semibold text-[var(--primary)]">
                  {ar ? 'إدارة العناوين' : 'Manage addresses'}
                </Link>
              </div>
            )}
          </CheckoutSection>
        ) : (
          <CheckoutSection icon={<Store size={20} />} title={ar ? 'الاستلام' : 'Pickup'}>
            <p className="text-xs leading-relaxed text-store-muted">
              {ar
                ? 'ستستلم طلبك من المعرض. سنرسل لك إشعاراً عند جاهزية الطلب.'
                : 'You will pick up your order at the showroom. We will notify you when ready.'}
            </p>
          </CheckoutSection>
        )}

        {isDelivery && addressId ? (
          <CheckoutSection icon={<Truck size={20} />} title={ar ? 'رسوم التوصيل' : 'Delivery fee'}>
            {usesZoneDelivery ? (
              <p className="text-xs text-store-muted">
                {selectedAddress?.region_name ? `${ar ? 'المنطقة:' : 'Region:'} ${selectedAddress.region_name}` : null}
              </p>
            ) : null}
            <p className="mt-1 text-lg font-black text-[var(--primary)]">{formatPrice(shippingPrice ?? 0)}</p>
            {!usesZoneDelivery && shippingMethods.length > 1 ? (
              <div className="mt-2 space-y-1.5">
                {shippingMethods.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShippingId(s.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold',
                      shippingId === s.id ? 'bg-[var(--primary)] text-white' : 'bg-black/[0.04]',
                    )}
                  >
                    <span>{s.name}</span>
                    <span>{formatPrice(s.price)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </CheckoutSection>
        ) : null}

        <CheckoutSection
          icon={<CreditCard size={20} />}
          title={t.paymentMethod}
          hint={`${t.walletBalance}: ${formatPrice(customer?.wallet_balance ?? walletBalance)}`}
        >
          <div className="flex flex-col gap-1.5">
            {paymentOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  setPaymentMethod(opt.id);
                  const next = storePaymentMethods.find((m) => m.id === opt.id);
                  if (!next?.requires_receipt) setReceiptPath(null);
                }}
                className={cn(
                  'rounded-lg px-2.5 py-2 text-start text-xs font-semibold transition-all disabled:opacity-45',
                  paymentMethod === opt.id
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'border border-black/[0.08] bg-white/70',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(needsReceipt || selectedPay?.qr_image) && paymentMethod ? (
            <div className="mt-2.5 space-y-2.5 rounded-lg border border-[var(--primary)]/20 bg-white/80 p-2.5">
              {payInstructions ? <p className="text-[11px] leading-relaxed">{payInstructions}</p> : null}
              {selectedPay?.qr_image ? (
                <div className="mx-auto max-w-[140px] rounded-xl border bg-white p-2 shadow-sm">
                  <StoreMediaImage src={selectedPay.qr_image} alt="QR" fit="contain" layout="intrinsic" className="w-full" />
                </div>
              ) : null}
              {needsReceipt ? (
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--primary)]/40 bg-[var(--primary-soft)]/30 px-2.5 py-2 text-xs font-semibold">
                    {receiptUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    {t.paymentReceipt}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={receiptUploading} onChange={(e) => void onReceiptPick(e.target.files?.[0] ?? null)} />
                  </label>
                  {receiptPath ? <p className="text-center text-xs font-bold text-[var(--primary)]">{ar ? 'تم رفع الإيصال ✓' : 'Receipt uploaded ✓'}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CheckoutSection>

        <CheckoutSection icon={<MessageSquare size={20} />} title={ar ? 'ملاحظات' : 'Notes'}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={ar ? 'ملاحظات على الطلب (اختياري)' : 'Optional order notes'}
            className="min-h-[56px] w-full rounded-lg border border-black/[0.08] bg-white/80 px-2.5 py-2 text-xs outline-none focus:border-[var(--primary)]/50"
            rows={2}
          />
        </CheckoutSection>

        <CheckoutSection icon={<ShoppingBag size={20} />} title={ar ? 'ملخص الطلب' : 'Order summary'}>
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.productVariantId} className="flex gap-2.5">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  <StoreMediaImage src={item.image} alt={item.name} fit="cover" layout="fill" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-snug">{item.name}</p>
                  <p className="mt-0.5 text-[10px] text-store-muted">{item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="shrink-0 text-xs font-bold text-[var(--primary)]">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-dashed border-black/10 pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold">
              <Tag size={14} className="text-[var(--primary)]" />
              {ar ? 'كوبون الخصم' : 'Discount coupon'}
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary-soft)]/40 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{appliedCoupon.code}</p>
                  <p className="mt-0.5 text-xs text-store-muted">{appliedCoupon.name}</p>
                </div>
                <button type="button" onClick={removeCoupon} className="shrink-0 text-xs font-bold text-[var(--primary)]">
                  {ar ? 'إزالة' : 'Remove'}
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={ar ? 'رمز الكوبون' : 'Coupon code'}
                  className="min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white/80 px-2.5 py-2 text-xs outline-none focus:border-[var(--primary)]/50"
                  dir="ltr"
                />
                <button
                  type="button"
                  disabled={couponApplying || !couponInput.trim()}
                  onClick={() => void applyCoupon()}
                  className="shrink-0 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white disabled:opacity-45"
                >
                  {couponApplying ? <Loader2 className="animate-spin" size={14} /> : (ar ? 'تطبيق' : 'Apply')}
                </button>
              </div>
            )}
            {couponMessage ? (
              <p className={cn('mt-2 text-center text-xs font-semibold', appliedCoupon ? 'text-[var(--primary)]' : 'text-[#ea5455]')}>
                {couponMessage}
              </p>
            ) : null}
          </div>

          <div className="mt-3 space-y-1.5 border-t border-dashed border-black/10 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-store-muted">{t.subtotal}</span>
              <span className="font-semibold">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-store-muted">{t.shipping}</span>
              <span className="font-semibold">
                {isDelivery && !addressId
                  ? (ar ? 'بعد العنوان' : 'After address')
                  : formatPrice(displayShipping)}
              </span>
            </div>
            {subtotalCouponDiscount > 0 ? (
              <div className="flex justify-between text-[var(--primary)]">
                <span>{ar ? 'خصم على المجموع' : 'Subtotal discount'}</span>
                <span className="font-semibold">− {formatPrice(subtotalCouponDiscount)}</span>
              </div>
            ) : null}
            {shippingCouponSaved > 0 ? (
              <div className="flex justify-between text-[var(--primary)]">
                <span>{ar ? 'خصم على الشحن' : 'Shipping discount'}</span>
                <span className="font-semibold">− {formatPrice(shippingCouponSaved)}</span>
              </div>
            ) : null}
          </div>

          <div className="glass-strong mt-3 rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold">{t.total}</span>
              <span className="text-base font-black text-[var(--primary)]">
                {!readyToPay && isDelivery ? '—' : formatPrice(grandTotal)}
              </span>
            </div>
            <button type="button" className="btn-primary flex w-full items-center justify-center gap-1.5 py-2.5 text-sm" disabled={ctaDisabled} onClick={() => void placeOrder()}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={16} />}
              {loading ? (ar ? 'جاري الإرسال…' : 'Placing…') : ctaLabel}
            </button>
          </div>
        </CheckoutSection>

        {error ? <p className="text-center text-sm font-medium text-[#ea5455]">{error}</p> : null}
      </div>
    </>
  );
}
