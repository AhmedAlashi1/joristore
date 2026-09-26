import { ChevronDown, Loader2, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { customerApi, storeApi, unwrap } from '../../lib/api';
import { formatPrice } from '../../lib/utils';
import { useLocale } from '../../providers/locale-provider';

export type DeliveryRegionOption = { id: number; name: string; name_en?: string | null; price: number };

export type AddressFormValues = {
  label: string;
  full_name: string;
  phone: string;
  delivery_region_id: string;
  street: string;
  building: string;
  notes: string;
};

const emptyForm = (): AddressFormValues => ({
  label: '',
  full_name: '',
  phone: '',
  delivery_region_id: '',
  street: '',
  building: '',
  notes: '',
});

export function AddressForm({
  addressId,
  initial,
  onSaved,
}: {
  addressId?: number;
  initial?: Partial<AddressFormValues>;
  onSaved: () => void | Promise<void>;
}) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const [regions, setRegions] = useState<DeliveryRegionOption[]>([]);
  const [form, setForm] = useState<AddressFormValues>(emptyForm);
  const [quotePrice, setQuotePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    storeApi.deliveryRegions()
      .then((r) => setRegions(unwrap<DeliveryRegionOption[]>(r)))
      .catch(() => setRegions([]));
    setForm({
      ...emptyForm(),
      ...initial,
      delivery_region_id: initial?.delivery_region_id ? String(initial.delivery_region_id) : '',
    });
    setError('');
    setQuotePrice(null);
  }, [addressId, initial]);

  const regionId = form.delivery_region_id ? Number(form.delivery_region_id) : null;

  useEffect(() => {
    if (!regionId) {
      setQuotePrice(null);
      return;
    }
    const region = regions.find((x) => x.id === regionId);
    setQuotePrice(region?.price ?? null);
  }, [regionId, regions]);

  const regionLabel = useMemo(() => {
    if (!regionId) return '';
    const r = regions.find((x) => x.id === regionId);
    if (!r) return '';
    return ar ? r.name : (r.name_en || r.name);
  }, [regionId, regions, ar]);

  const save = async () => {
    if (!form.full_name.trim() || !regionId || !form.street.trim()) {
      setError(ar ? 'أكمل الاسم والمنطقة والشارع' : 'Fill name, region and street');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        label: form.label.trim() || undefined,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        delivery_region_id: regionId,
        street: form.street.trim(),
        building: form.building.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (addressId) {
        await customerApi.updateAddress(addressId, payload);
      } else {
        await customerApi.addAddress(payload);
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label={ar ? 'اسم العنوان (اختياري)' : 'Address label (optional)'} hint={ar ? 'مثلاً: البيت، الشغل' : 'e.g. Home, Work'}>
        <input className="glass-input w-full rounded-xl px-4 py-3.5 text-sm" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </Field>
      <Field label={ar ? 'الاسم الكامل *' : 'Full name *'}>
        <input className="glass-input w-full rounded-xl px-4 py-3.5 text-sm" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </Field>
      <Field label={ar ? 'الجوال' : 'Phone'}>
        <input className="glass-input w-full rounded-xl px-4 py-3.5 text-sm" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label={ar ? 'المنطقة *' : 'Region *'}>
        <div className="relative">
          <MapPin size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
          <ChevronDown size={16} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 opacity-50" />
          <select
            className="glass-input w-full appearance-none rounded-xl py-3.5 ps-11 pe-10 text-sm"
            value={form.delivery_region_id}
            onChange={(e) => setForm({ ...form, delivery_region_id: e.target.value })}
          >
            <option value="">{ar ? 'اختر منطقتك' : 'Select your region'}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {ar ? r.name : (r.name_en || r.name)} — {formatPrice(r.price)}
              </option>
            ))}
          </select>
        </div>
      </Field>
      <Field label={ar ? 'الشارع *' : 'Street *'} hint={ar ? 'مثلاً: شارع عمر المختار' : 'e.g. Omar Al-Mukhtar St.'}>
        <input className="glass-input w-full rounded-xl px-4 py-3.5 text-sm" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
      </Field>
      <Field label={ar ? 'العمارة' : 'Building'} hint={ar ? 'مثلاً: 5 أو برج الشروق' : 'e.g. 5 or tower name'}>
        <input className="glass-input w-full rounded-xl px-4 py-3.5 text-sm" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
      </Field>
      <Field label={ar ? 'ملاحظات (اختياري)' : 'Notes (optional)'}>
        <textarea className="glass-input min-h-[88px] w-full rounded-xl px-4 py-3 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={ar ? 'بجانب صيدلية، اتصل قبل الوصول...' : 'Landmarks, call before arrival...'} />
      </Field>

      {quotePrice != null && regionId ? (
        <p className="rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-xs font-bold text-[var(--primary)]">
          {ar ? 'رسوم التوصيل لـ' : 'Delivery fee for'} {regionLabel}: {formatPrice(quotePrice)}
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      <button type="button" className="btn-primary w-full" onClick={() => void save()} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" size={20} /> : null}
        {ar ? 'حفظ العنوان' : 'Save address'}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--fg)]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-[#8a8da8]">{hint}</span> : null}
    </label>
  );
}
