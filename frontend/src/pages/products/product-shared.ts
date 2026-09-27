export type ProductOption = { id: number; name: string };

export type ProductSizeVariant = {
  name: string;
  sku?: string;
  price?: number;
  quantity: number;
};

export type ProductRecord = {
  id: number;
  name: string;
  slug: string;
  status: string;
  category_id?: number | null;
  category_name?: string;
  brand_id?: number | null;
  brand_name?: string;
  price: number;
  quantity: number;
  sku?: string;
  featured: boolean;
  short_description?: string;
  description?: string;
  compare_at_price?: number;
  cost?: number;
  image?: string | null;
  name_en?: string | null;
  short_description_en?: string | null;
  description_en?: string | null;
  gallery?: string[];
  images?: string[];
  product_group_id?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  size_variants?: ProductSizeVariant[];
  created_at?: string;
};

export type SizeRow = { name: string; sku: string; price: string; quantity: number };

export type ProductFormState = {
  name: string;
  slug: string;
  category_id: string;
  brand_id: string;
  status: string;
  short_description: string;
  description: string;
  sku: string;
  price: string;
  compare_at_price: string;
  cost: string;
  quantity: number;
  featured: boolean;
  image: string;
  gallery: string[];
  product_group_id: string;
  color_name: string;
  color_hex: string;
  size_variants: SizeRow[];
  name_en: string;
  short_description_en: string;
  description_en: string;
};

export const emptyProductForm = (): ProductFormState => ({
  name: '',
  slug: '',
  category_id: '',
  brand_id: '',
  status: 'draft',
  short_description: '',
  description: '',
  sku: '',
  price: '',
  compare_at_price: '',
  cost: '',
  quantity: 0,
  featured: false,
  image: '',
  gallery: [],
  product_group_id: '',
  color_name: '',
  color_hex: '#7367f0',
  size_variants: [],
  name_en: '',
  short_description_en: '',
  description_en: '',
});

export const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  draft: 'warning',
  inactive: 'destructive',
  archived: 'destructive',
};

export function mapProductToForm(row: ProductRecord): ProductFormState {
  return {
    name: row.name,
    slug: row.slug,
    category_id: row.category_id ? String(row.category_id) : '',
    brand_id: row.brand_id ? String(row.brand_id) : '',
    status: row.status,
    short_description: row.short_description ?? '',
    description: row.description ?? '',
    sku: row.sku ?? '',
    price: String(row.price),
    compare_at_price: row.compare_at_price != null ? String(row.compare_at_price) : '',
    cost: row.cost != null ? String(row.cost) : '',
    quantity: row.quantity,
    featured: row.featured,
    image: row.image ?? '',
    gallery: row.gallery ?? (row.images ?? []).filter((p) => p && p !== row.image),
    name_en: row.name_en ?? '',
    short_description_en: row.short_description_en ?? '',
    description_en: row.description_en ?? '',
    product_group_id: row.product_group_id ?? '',
    color_name: row.color_name ?? '',
    color_hex: row.color_hex ?? '#7367f0',
    size_variants: (row.size_variants ?? []).map((v) => ({
      name: v.name,
      sku: v.sku ?? '',
      price: v.price != null ? String(v.price) : '',
      quantity: v.quantity ?? 0,
    })),
  };
}

export function prepareProductPayload(form: ProductFormState) {
  const sizeRows = form.size_variants.filter((r) => r.name?.trim());
  return {
    name: form.name,
    slug: form.slug || undefined,
    category_id: form.category_id ? Number(form.category_id) : null,
    brand_id: form.brand_id ? Number(form.brand_id) : null,
    status: form.status,
    short_description: form.short_description || null,
    description: form.description || null,
    sku: form.sku || null,
    price: Number(form.price),
    compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
    cost: form.cost ? Number(form.cost) : null,
    quantity: Number(form.quantity) || 0,
    featured: Boolean(form.featured),
    image: form.image || null,
    gallery: form.gallery.filter(Boolean),
    product_group_id: (() => {
      const id = form.product_group_id.trim();
      return id.length > 0 ? id : null;
    })(),
    color_name: form.color_name || null,
    color_hex: form.color_hex || null,
    size_variants: sizeRows.length
      ? sizeRows.map((r) => ({
        name: r.name.trim(),
        sku: r.sku || null,
        price: r.price ? Number(r.price) : undefined,
        quantity: Number(r.quantity) || 0,
      }))
      : undefined,
  };
}
