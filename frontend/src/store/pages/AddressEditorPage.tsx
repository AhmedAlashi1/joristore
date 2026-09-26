import { ArrowRight, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AddressForm, type AddressFormValues } from '../components/address/AddressForm';
import { customerApi } from '../lib/api';
import type { CustomerAddress } from '../providers/customer-provider';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

export function AddressEditorPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn, customer, refresh } = useCustomer();
  const isNew = pathname.endsWith('/new');
  const addressId = !isNew && id ? Number(id) : undefined;

  const [loaded, setLoaded] = useState(isNew);
  const [editAddr, setEditAddr] = useState<CustomerAddress | null>(null);

  useEffect(() => {
    if (!isLoggedIn || isNew || !addressId || Number.isNaN(addressId)) {
      setLoaded(true);
      return;
    }
    void (async () => {
      try {
        const fromCustomer = customer?.addresses?.find((a) => a.id === addressId);
        if (fromCustomer) {
          setEditAddr(fromCustomer);
          setLoaded(true);
          return;
        }
        const profile = await customerApi.profile();
        const found = profile.addresses?.find((a) => a.id === addressId) ?? null;
        setEditAddr(found);
      } finally {
        setLoaded(true);
      }
    })();
  }, [isLoggedIn, isNew, addressId, customer?.addresses]);

  const initial = useMemo((): Partial<AddressFormValues> | undefined => {
    if (isNew) {
      return {
        full_name: customer?.full_name ?? '',
        phone: customer?.phone ?? '',
      };
    }
    if (!editAddr) return undefined;
    return {
      label: editAddr.label ?? '',
      full_name: editAddr.full_name,
      phone: editAddr.phone ?? '',
      delivery_region_id: editAddr.delivery_region_id ? String(editAddr.delivery_region_id) : '',
      street: editAddr.street ?? '',
      building: editAddr.building ?? '',
      notes: editAddr.notes ?? '',
    };
  }, [isNew, editAddr, customer?.full_name, customer?.phone]);

  if (!isLoggedIn) {
    return <Navigate to="/account" replace />;
  }

  if (!isNew && loaded && !editAddr) {
    return <Navigate to="/account/addresses" replace />;
  }

  const title = isNew ? (ar ? 'إضافة عنوان جديد' : 'New address') : (ar ? 'تعديل العنوان' : 'Edit address');

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Link to="/account/addresses" className="glass flex h-10 w-10 items-center justify-center rounded-xl" aria-label={ar ? 'رجوع' : 'Back'}>
          <ArrowRight size={20} className="rtl:rotate-180" />
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold">
          <MapPin size={20} className="shrink-0 text-[var(--primary)]" />
          <span className="truncate">{title}</span>
        </h1>
      </div>

      <section className="glass-strong rounded-2xl p-4 sm:p-5">
        {!loaded ? (
          <p className="py-8 text-center text-sm text-[#8a8da8]">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <AddressForm
            key={isNew ? 'new' : String(addressId)}
            addressId={addressId}
            initial={initial}
            onSaved={async () => {
              await refresh();
              navigate('/account/addresses', { replace: true });
            }}
          />
        )}
      </section>
    </div>
  );
}
