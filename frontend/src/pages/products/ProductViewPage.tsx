import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { hasPermission } from '../../lib/auth';
import { formatPrice } from '../../lib/format-price';
import { mediaUrl } from '../../lib/media';
import { useI18n } from '../../providers/i18n-provider';
import { ProductPageHeader } from './ProductPageHeader';
import { type ProductRecord, statusVariant } from './product-shared';

export function ProductViewPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const canUpdate = hasPermission('products.update');

  useEffect(() => {
    if (!id) return;
    api.get(`/admin/products/${id}`)
      .then((res) => setProduct(ensureApiSuccess<ProductRecord>(res, '')))
      .catch(() => navigate('/admin/products'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!product) return null;

  const gallery = product.gallery?.length
    ? product.gallery
    : (product.images ?? []).filter((p) => p && p !== product.image);
  const allImages = [product.image, ...gallery].filter(Boolean) as string[];

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-4">
      <ProductPageHeader
        title={product.name}
        subtitle={`#${product.id} · ${product.slug}`}
        actions={canUpdate ? (
          <Link to={`/admin/products/${product.id}/edit`} className={cn(buttonVariants())}>
            <Pencil className="me-2 h-4 w-4" />
            {ar ? 'تعديل' : 'Edit'}
          </Link>
        ) : null}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="glass-strong space-y-3 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#8a8da8]">{ar ? 'الصور' : 'Images'}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allImages.map((path, i) => (
              <div key={`${path}-${i}`} className="overflow-hidden rounded-xl border border-white/20 bg-white/30">
                <img src={mediaUrl(path)} alt="" className="aspect-square w-full object-contain" />
                {i === 0 ? (
                  <p className="bg-[#7367f0]/10 px-2 py-1 text-center text-[10px] font-bold text-[#7367f0]">
                    {ar ? 'أساسية' : 'Primary'}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-strong space-y-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant[product.status] ?? 'default'}>{product.status}</Badge>
            {product.featured ? <Badge variant="success">{ar ? 'مميز' : 'Featured'}</Badge> : null}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#8a8da8]">{ar ? 'السعر' : 'Price'}</dt>
              <dd className="text-lg font-bold text-[#7367f0]">{formatPrice(product.price)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#8a8da8]">{ar ? 'المخزون' : 'Stock'}</dt>
              <dd className="font-semibold">{product.quantity}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#8a8da8]">SKU</dt>
              <dd dir="ltr">{product.sku ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#8a8da8]">{ar ? 'التصنيف' : 'Category'}</dt>
              <dd>{product.category_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#8a8da8]">{ar ? 'الماركة' : 'Brand'}</dt>
              <dd>{product.brand_name ?? '—'}</dd>
            </div>
            {product.compare_at_price != null ? (
              <div>
                <dt className="text-xs text-[#8a8da8]">{ar ? 'سعر المقارنة' : 'Compare at'}</dt>
                <dd>{formatPrice(product.compare_at_price)}</dd>
              </div>
            ) : null}
          </dl>

          {product.short_description ? (
            <div>
              <p className="text-xs font-bold text-[#8a8da8]">{ar ? 'وصف مختصر (عربي)' : 'Short (AR)'}</p>
              <p className="mt-1">{product.short_description}</p>
            </div>
          ) : null}
          {product.short_description_en ? (
            <div>
              <p className="text-xs font-bold text-[#8a8da8]">{ar ? 'وصف مختصر (EN)' : 'Short (EN)'}</p>
              <p className="mt-1" dir="ltr">{product.short_description_en}</p>
            </div>
          ) : null}
          {product.description ? (
            <div>
              <p className="text-xs font-bold text-[#8a8da8]">{ar ? 'الوصف (عربي)' : 'Description (AR)'}</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>
          ) : null}
          {product.description_en ? (
            <div>
              <p className="text-xs font-bold text-[#8a8da8]">{ar ? 'الوصف (EN)' : 'Description (EN)'}</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed" dir="ltr">{product.description_en}</p>
            </div>
          ) : null}

          {(product.color_name || product.product_group_id) ? (
            <div className="rounded-xl border border-white/15 p-3 text-sm">
              <p className="text-xs font-bold text-[#8a8da8]">{ar ? 'اللون / المجموعة' : 'Color / group'}</p>
              <div className="mt-2 flex items-center gap-2">
                {product.color_hex ? (
                  <span className="h-6 w-6 rounded-full border border-white/30" style={{ background: product.color_hex }} />
                ) : null}
                <span>{product.color_name ?? '—'}</span>
              </div>
              {product.product_group_id ? (
                <p className="mt-1 font-mono text-xs text-[#8a8da8]" dir="ltr">{product.product_group_id}</p>
              ) : null}
            </div>
          ) : null}

          {(product.size_variants ?? []).length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold text-[#8a8da8]">{ar ? 'المقاسات' : 'Sizes'}</p>
              <div className="overflow-x-auto rounded-xl border border-white/15">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/20">
                    <tr>
                      <th className="px-3 py-2 text-start">{ar ? 'مقاس' : 'Size'}</th>
                      <th className="px-3 py-2 text-start">SKU</th>
                      <th className="px-3 py-2 text-start">{ar ? 'كمية' : 'Qty'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.size_variants!.map((v) => (
                      <tr key={v.name} className="border-t border-white/10">
                        <td className="px-3 py-2">{v.name}</td>
                        <td className="px-3 py-2" dir="ltr">{v.sku ?? '—'}</td>
                        <td className="px-3 py-2">{v.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
