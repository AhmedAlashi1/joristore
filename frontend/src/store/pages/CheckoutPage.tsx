import { Loader2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi, storeApi, unwrap } from '../lib/api';
import { formatPrice } from '../lib/utils';
import { useCart } from '../providers/cart-provider';
import type { CustomerAddress } from '../providers/customer-provider';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

type ShippingMethod = { id: number; name: string; price: number; free_shipping_minimum?: number };

export function CheckoutPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const navigate = useNavigate();
  const { items, total, clear } = useCart();
  const { isLoggedIn, refresh } = useCustomer();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    void refresh();
    customerApi.profile().then((p) => {
      setAddresses(p.addresses ?? []);
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
  }, [isLoggedIn, refresh]);

  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  useEffect(() => {
    if (!selectedAddress?.delivery_region_id) {
      setDeliveryFee(null);
      return;
    }
    storeApi.deliveryQuote({
      delivery_region_id: selectedAddress.delivery_region_id,
      street: selectedAddress.street,
    })
      .then((r) => setDeliveryFee(unwrap<{ price: number }>(r).price))
      .catch(() => setDeliveryFee(null));
  }, [selectedAddress?.id, selectedAddress?.delivery_region_id, selectedAddress?.street]);

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
  const usesZoneDelivery = deliveryFee != null && Boolean(selectedAddress?.delivery_region_id);
  const shippingPrice = usesZoneDelivery ? deliveryFee : legacyShippingPrice;
  const grandTotal = total + (shippingPrice ?? 0);

  const placeOrder = async () => {
    if (!addressId) {
      setError(ar ? 'اختر عنوان التوصيل' : 'Select delivery address');
      return;
    }
    if (selectedAddress && !selectedAddress.delivery_region_id) {
      setError(ar ? 'حدّث العنوان واختر المنطقة من حسابي' : 'Update your address with a delivery region');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const order = await customerApi.placeOrder({
        customer_address_id: addressId,
        shipping_method_id: shippingId ?? undefined,
        payment_method: 'cash_on_delivery',
        customer_note: note || undefined,
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

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">{t.checkout}</h1>

      <section className="glass-strong rounded-2xl p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><MapPin size={16} /> {t.deliveryAddress}</h2>
        {addresses.length === 0 ? (
          <div className="text-sm text-[#8a8da8]">
            {ar ? 'لا توجد عناوين — ' : 'No addresses — '}
            <Link to="/account/addresses" className="font-semibold text-[var(--primary)]">{ar ? 'إدارة العناوين' : 'Manage addresses'}</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${addressId === a.id ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-white/30'}`}>
                <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
                <div className="text-sm">
                  <p className="font-bold">{a.full_name}</p>
                  <p className="text-[#8a8da8]">{a.region_name || a.city}{a.street ? ` · ${a.street}` : ''}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {usesZoneDelivery ? (
        <section className="glass-strong rounded-2xl p-4">
          <h2 className="mb-2 text-sm font-bold">{t.shippingMethod}</h2>
          <p className="text-sm text-[#6f6b7d]">
            {ar ? 'توصيل حسب المنطقة' : 'Delivery by zone'}
            {selectedAddress?.region_name ? `: ${selectedAddress.region_name}` : ''}
          </p>
          <p className="mt-2 text-sm font-bold text-[var(--primary)]">{formatPrice(shippingPrice ?? 0)}</p>
        </section>
      ) : shippingMethods.length > 0 ? (
        <section className="glass-strong rounded-2xl p-4">
          <h2 className="mb-3 text-sm font-bold">{t.shippingMethod}</h2>
          <div className="space-y-2">
            {shippingMethods.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${shippingId === s.id ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-white/30'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="ship" checked={shippingId === s.id} onChange={() => setShippingId(s.id)} />
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <span className="text-sm font-bold text-[var(--primary)]">{formatPrice(s.price)}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-strong rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-bold">{t.paymentMethod}</h2>
        <p className="text-sm">{t.cashOnDelivery}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={ar ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
          className="mt-3 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm outline-none"
          rows={2}
        />
      </section>

      <section className="glass-strong rounded-2xl p-4">
        <div className="flex justify-between text-sm"><span>{t.subtotal}</span><span>{formatPrice(total)}</span></div>
        <div className="mt-1 flex justify-between text-sm"><span>{t.shipping}</span><span>{formatPrice(shippingPrice)}</span></div>
        <div className="mt-3 flex justify-between border-t border-white/30 pt-3 font-bold">
          <span>{t.total}</span>
          <span className="text-[var(--primary)]">{formatPrice(grandTotal)}</span>
        </div>
      </section>

      {error ? <p className="text-center text-sm text-[#ea5455]">{error}</p> : null}

      <button type="button" className="btn-primary w-full" disabled={loading || !addressId} onClick={() => void placeOrder()}>
        {loading ? <Loader2 className="animate-spin" size={20} /> : t.placeOrder}
      </button>
    </div>
  );
}
