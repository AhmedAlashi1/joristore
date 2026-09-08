import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../ui/loading-spinner';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { useNotify } from '../../lib/notify';
import { useI18n } from '../../providers/i18n-provider';

export type CrudColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

const EMPTY_QUERY_PARAMS: Record<string, unknown> = {};

type CrudPageProps<T extends { id: number }> = {
  title: string;
  endpoint: string;
  columns: CrudColumn<T>[];
  emptyForm: Record<string, unknown>;
  mapRowToForm: (row: T) => Record<string, unknown>;
  renderForm: (
    form: Record<string, unknown>,
    setForm: (next: Record<string, unknown>) => void,
    mode: 'create' | 'edit',
  ) => ReactNode;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  queryParams?: Record<string, unknown>;
  extraFilters?: ReactNode;
  preparePayload?: (form: Record<string, unknown>, mode: 'create' | 'edit') => Record<string, unknown>;
  canEditRow?: (row: T) => boolean;
  canDeleteRow?: (row: T) => boolean;
};

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#6f6b7d] dark:text-[#b6b8cc]">{label}</label>
      {children}
    </div>
  );
}

function rowDelay(index: number) {
  return { animationDelay: `${Math.min(index * 0.04, 0.4)}s` };
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function SelectInput({
  value,
  onChange,
  children,
  variant = 'default',
  multiple,
  disabled,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  variant?: 'default' | 'filter';
  multiple?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      multiple={multiple}
      disabled={disabled}
      className={
        variant === 'filter'
          ? 'glass-input h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-[#7367f0]/40 md:w-auto'
          : 'glass-input h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-[#7367f0]/40'
      }
    >
      {children}
    </select>
  );
}

export function CrudPage<T extends { id: number }>({
  title,
  endpoint,
  columns,
  emptyForm,
  mapRowToForm,
  renderForm,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  queryParams = EMPTY_QUERY_PARAMS,
  extraFilters,
  preparePayload,
  canEditRow,
  canDeleteRow,
}: CrudPageProps<T>) {
  const { locale } = useI18n();
  const notify = useNotify();
  const ar = locale === 'ar';

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm);

  const paramsKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const load = useCallback(async () => {
    const extraParams = JSON.parse(paramsKey) as Record<string, unknown>;
    setLoading(true);
    try {
      const res = await api.get(endpoint, {
        params: {
          page,
          per_page: 15,
          search: search || undefined,
          ...extraParams,
        },
      });
      const payload = ensureApiSuccess<Paginated<T>>(res, '');
      setRows(payload?.data || []);
      setLastPage(payload?.last_page || 1);
      setTotal(payload?.total || 0);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [ar, endpoint, notify, page, paramsKey, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setMode('create');
    setActiveId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: T) => {
    setMode('edit');
    setActiveId(row.id);
    setForm(mapRowToForm(row));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setActiveId(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = preparePayload ? preparePayload(form, mode) : form;
      if (mode === 'create') {
        await api.post(endpoint, payload);
        notify.success(ar ? 'تمت الإضافة' : 'Created successfully');
      } else if (activeId) {
        await api.put(`${endpoint}/${activeId}`, payload);
        notify.success(ar ? 'تم التحديث' : 'Updated successfully');
      }
      closeModal();
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: T) => {
    const ok = window.confirm(ar ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?');
    if (!ok) return;

    try {
      await api.delete(`${endpoint}/${row.id}`);
      notify.success(ar ? 'تم الحذف' : 'Deleted successfully');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحذف' : 'Delete failed');
    }
  };

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-[#8a8da8] dark:text-[#a2a5be]">
            {total.toLocaleString()} {ar ? 'سجل' : 'records'}
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="me-2 h-4 w-4" />
            {ar ? 'إضافة' : 'Add'}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={ar ? 'بحث...' : 'Search...'}
          className="max-w-xs"
        />
        {extraFilters}
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <LoadingSpinner size="md" label={ar ? 'جاري التحميل...' : 'Loading...'} />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#8a8da8] dark:text-[#a2a5be]">
            {ar ? 'لا توجد بيانات' : 'No records found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/20 bg-white/30 text-[#6f6b7d] dark:border-white/8 dark:bg-white/5 dark:text-[#b6b8cc]">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3.5 text-start text-xs font-semibold uppercase tracking-wider">{col.header}</th>
                  ))}
                  {(canUpdate || canDelete) ? <th className="px-4 py-3.5 text-end text-xs font-semibold uppercase tracking-wider">{ar ? 'إجراءات' : 'Actions'}</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    style={rowDelay(index)}
                    className="table-row-enter border-t border-white/15 transition-colors hover:bg-white/30 dark:border-white/8 dark:hover:bg-white/5"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 align-top">
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '-')}
                      </td>
                    ))}
                    {(canUpdate || canDelete) ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (!canEditRow || canEditRow(row)) ? (
                            <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDelete && (!canDeleteRow || canDeleteRow(row)) ? (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(row)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {ar ? 'السابق' : 'Previous'}
          </Button>
          <span className="text-sm text-[#8a8da8]">{page} / {lastPage}</span>
          <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
            {ar ? 'التالي' : 'Next'}
          </Button>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-panel-enter glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold">
              {mode === 'create' ? (ar ? 'إضافة' : 'Create') : (ar ? 'تعديل' : 'Edit')}
            </h3>
            <div className="space-y-4">
              {renderForm(form, setForm, mode)}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>{ar ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {ar ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
