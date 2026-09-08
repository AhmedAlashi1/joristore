import { Eye, Loader2, MapPin, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type CustomerAddress = {
  id: number;
  full_name: string;
  phone?: string;
  city: string;
  area?: string;
  street?: string;
  building?: string;
  is_default: boolean;
};

type CustomerRow = {
  id: number;
  first_name: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
  orders_count: number;
  total_spent: number;
  addresses_count?: number;
  last_order_at?: string;
  created_at?: string;
  notes?: string;
  addresses?: CustomerAddress[];
};

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '', status: 'active', notes: '',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  active: 'success', blocked: 'destructive', inactive: 'warning',
};

export function CustomersPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [detail, setDetail] = useState<CustomerRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addrForm, setAddrForm] = useState({ full_name: '', phone: '', city: '', area: '', street: '', building: '' });
  const [addrOpen, setAddrOpen] = useState(false);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/customers/${id}`);
      setDetail(ensureApiSuccess<CustomerRow>(res, ''));
    } finally {
      setDetailLoading(false);
    }
  };

  const addAddress = async () => {
    if (!detail || !addrForm.full_name || !addrForm.city) return;
    await api.post(`/admin/customers/${detail.id}/addresses`, addrForm);
    setAddrOpen(false);
    setAddrForm({ full_name: '', phone: '', city: '', area: '', street: '', building: '' });
    await openDetail(detail.id);
  };

  const columns = useMemo<CrudColumn<CustomerRow>[]>(() => [
    {
      key: 'name',
      header: ar ? 'العميل' : 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium">{r.full_name}</p>
          <p className="text-xs text-[#8a8da8]">{r.email ?? r.phone ?? '—'}</p>
        </div>
      ),
    },
    { key: 'phone', header: ar ? 'الجوال' : 'Phone', render: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
    { key: 'orders', header: ar ? 'الطلبات' : 'Orders', render: (r) => r.orders_count },
    { key: 'addresses', header: ar ? 'العناوين' : 'Addresses', render: (r) => r.addresses_count ?? 0 },
    { key: 'spent', header: ar ? 'إجمالي الشراء' : 'Total spent', render: (r) => `${r.total_spent.toFixed(2)} SAR` },
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status}</Badge> },
    {
      key: 'view',
      header: ar ? 'عرض' : 'View',
      render: (r) => (
        <Button variant="secondary" size="sm" onClick={() => void openDetail(r.id)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ], [ar]);

  return (
    <>
      <CrudPage<CustomerRow>
        title={ar ? 'العملاء' : 'Customers'}
        endpoint="/admin/customers"
        columns={columns}
        emptyForm={emptyForm}
        canCreate={hasPermission('customers.create')}
        canUpdate={hasPermission('customers.update')}
        canDelete={hasPermission('customers.delete')}
        mapRowToForm={(row) => ({
          first_name: row.first_name,
          last_name: row.last_name ?? '',
          email: row.email ?? '',
          phone: row.phone ?? '',
          status: row.status,
          notes: row.notes ?? '',
        })}
        renderForm={(form, setForm) => (
          <FormGrid>
            <FormField label={ar ? 'الاسم الأول *' : 'First name *'}>
              <Input value={String(form.first_name || '')} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'اسم العائلة' : 'Last name'}>
              <Input value={String(form.last_name || '')} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'البريد' : 'Email'}>
              <Input type="email" value={String(form.email || '')} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الهاتف' : 'Phone'}>
              <Input value={String(form.phone || '')} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الحالة' : 'Status'}>
              <SelectInput value={String(form.status || 'active')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">{ar ? 'نشط' : 'Active'}</option>
                <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
                <option value="blocked">{ar ? 'محظور' : 'Blocked'}</option>
              </SelectInput>
            </FormField>
            <FormField label={ar ? 'ملاحظات' : 'Notes'}>
              <Input value={String(form.notes || '')} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
          </FormGrid>
        )}
      />

      {(detail || detailLoading) ? (
        <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-panel-enter glass-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6">
            {detailLoading || !detail ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#7367f0]" /></div>
            ) : (
              <>
                <h3 className="text-xl font-bold">{detail.full_name}</h3>
                <p className="text-sm text-[#8a8da8]">{detail.email} · <span dir="ltr">{detail.phone}</span></p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-xs text-[#8a8da8]">{ar ? 'الطلبات' : 'Orders'}</p>
                    <p className="text-lg font-bold">{detail.orders_count}</p>
                  </div>
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-xs text-[#8a8da8]">{ar ? 'إجمالي الشراء' : 'Spent'}</p>
                    <p className="text-lg font-bold">{detail.total_spent.toFixed(2)} SAR</p>
                  </div>
                </div>

                {detail.notes ? (
                  <p className="mt-3 rounded-xl bg-white/30 p-3 text-sm dark:bg-white/5">{detail.notes}</p>
                ) : null}

                <div className="mt-5 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 font-semibold"><MapPin size={16} /> {ar ? 'العناوين' : 'Addresses'}</h4>
                  {hasPermission('customers.update') ? (
                    <Button variant="secondary" size="sm" onClick={() => setAddrOpen(true)}><Plus className="h-4 w-4" /></Button>
                  ) : null}
                </div>

                <div className="mt-2 space-y-2">
                  {(detail.addresses ?? []).map((a) => (
                    <div key={a.id} className="rounded-xl border border-white/20 p-3 text-sm">
                      <p className="font-medium">{a.full_name} {a.is_default ? <Badge variant="success">default</Badge> : null}</p>
                      <p className="text-[#8a8da8]">{a.city}{a.area ? `، ${a.area}` : ''}</p>
                      <p className="text-xs">{[a.street, a.building].filter(Boolean).join(' — ')}</p>
                    </div>
                  ))}
                </div>

                {addrOpen ? (
                  <div className="mt-4 space-y-2 rounded-xl border border-white/20 p-3">
                    <Input placeholder={ar ? 'الاسم' : 'Name'} value={addrForm.full_name} onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })} />
                    <Input placeholder={ar ? 'المدينة' : 'City'} value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
                    <Input placeholder={ar ? 'الحي' : 'Area'} value={addrForm.area} onChange={(e) => setAddrForm({ ...addrForm, area: e.target.value })} />
                    <Input placeholder={ar ? 'الشارع' : 'Street'} value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} />
                    <Button size="sm" onClick={() => void addAddress()}>{ar ? 'حفظ العنوان' : 'Save address'}</Button>
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" onClick={() => { setDetail(null); setAddrOpen(false); }}>{ar ? 'إغلاق' : 'Close'}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
