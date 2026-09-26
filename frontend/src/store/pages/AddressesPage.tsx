import { ArrowRight, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { customerApi } from '../lib/api';
import type { CustomerAddress } from '../providers/customer-provider';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

export function AddressesPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn, customer, refresh } = useCustomer();
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (isLoggedIn) void refresh();
  }, [isLoggedIn, refresh]);

  if (!isLoggedIn) {
    return <Navigate to="/account" replace />;
  }

  const addresses = customer?.addresses ?? [];

  const setDefault = async (id: number) => {
    setBusyId(id);
    try {
      await customerApi.updateAddress(id, { is_default: true });
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(ar ? 'حذف هذا العنوان؟' : 'Delete this address?')) return;
    setBusyId(id);
    try {
      await customerApi.deleteAddress(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Link to="/account" className="glass flex h-10 w-10 items-center justify-center rounded-xl" aria-label={ar ? 'رجوع' : 'Back'}>
          <ArrowRight size={20} className="rtl:rotate-180" />
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold">
          <MapPin size={20} className="shrink-0 text-[var(--primary)]" />
          {t.savedAddresses}
        </h1>
        <Link
          to="/account/addresses/new"
          className="flex shrink-0 items-center gap-1 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white shadow-md"
        >
          <Plus size={14} />
          {ar ? 'إضافة' : 'Add'}
        </Link>
      </div>

      {addresses.length === 0 ? (
        <div className="glass-strong rounded-2xl py-14 text-center">
          <MapPin size={36} className="mx-auto mb-3 text-[var(--primary)] opacity-60" />
          <p className="text-sm font-semibold text-[#6f6b7d]">{t.noSavedAddresses}</p>
          <Link to="/account/addresses/new" className="btn-primary mt-4 inline-flex text-sm">
            {t.addAddress}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((addr: CustomerAddress) => (
            <li key={addr.id} className={`glass-strong rounded-2xl p-4 ${addr.is_default ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {addr.is_default ? (
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-lg bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                      <Star size={10} fill="currentColor" />
                      {t.defaultAddress}
                    </span>
                  ) : null}
                  <p className="font-bold text-[var(--fg)]">
                    {addr.label ? <span className="text-[var(--primary)]">{addr.label} · </span> : null}
                    {addr.full_name}
                  </p>
                  {addr.phone ? <p className="mt-0.5 text-xs text-[#8a8da8]" dir="ltr">{addr.phone}</p> : null}
                  <p className="mt-2 text-sm font-semibold text-[#6f6b7d]">{addr.region_name || addr.city}</p>
                  <p className="text-xs leading-relaxed text-[#8a8da8]">
                    {[addr.street, addr.building].filter(Boolean).join(' — ')}
                    {addr.notes ? ` · ${addr.notes}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/20 pt-3">
                {!addr.is_default ? (
                  <button
                    type="button"
                    disabled={busyId === addr.id}
                    onClick={() => void setDefault(addr.id)}
                    className="flex items-center gap-1 rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-xs font-bold text-[var(--primary)] disabled:opacity-50"
                  >
                    <Star size={14} />
                    {t.setDefaultAddress}
                  </button>
                ) : null}
                <Link
                  to={`/account/addresses/${addr.id}/edit`}
                  className="flex items-center gap-1 rounded-xl bg-white/50 px-3 py-2 text-xs font-bold text-[var(--fg)] dark:bg-white/10"
                >
                  <Pencil size={14} />
                  {t.editAddress}
                </Link>
                <button
                  type="button"
                  disabled={busyId === addr.id}
                  onClick={() => void remove(addr.id)}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-[#ea5455] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {t.deleteAddress}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
