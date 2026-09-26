<?php

namespace App\Modules\Storefront\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\Gym;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Promotions\Models\PromoBanner;
use App\Modules\Shipping\Models\DeliveryRegion;
use App\Modules\Shipping\Models\ShippingMethod;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\DeliveryPricingService;
use App\Shared\Services\MerchantContext;
use App\Shared\Services\StoreAiSearchService;
use App\Shared\Services\StoreSettingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StorefrontController extends Controller
{
    public function __construct(
        protected StoreAiSearchService $aiSearch,
        protected DeliveryPricingService $deliveryPricing,
    ) {}

    public function storeInfo()
    {
        $store = MerchantContext::store();

        return sendResponse([
            'name' => $store->name,
            'slug' => $store->slug,
            'description' => $store->description,
            'logo' => $store->logo,
            'currency' => $store->currency,
            'default_language' => $store->default_language,
            'theme' => StoreSettingService::getTheme($store->id),
            'social' => StoreSettingService::getSocial($store->id),
        ], 'Store info');
    }

    public function theme()
    {
        $store = MerchantContext::store();

        return sendResponse(StoreSettingService::getTheme($store->id), 'Theme fetched');
    }

    public function categories()
    {
        $items = Category::query()
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parent_id', 'image', 'sort_order']);

        $mapped = $items->map(fn (Category $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'parent_id' => $c->parent_id,
            'image' => $c->image,
            'sort_order' => $c->sort_order,
        ]);

        return sendResponse($mapped, 'Categories fetched');
    }

    public function brands()
    {
        $items = Brand::query()
            ->where('status', 'active')
            ->whereHas('products', fn (Builder $q) => $q->where('status', 'active'))
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return sendResponse($items, 'Brands fetched');
    }

    public function productFilters(Request $request)
    {
        $query = $this->baseStorefrontProductQuery($request);
        $productIds = (clone $query)->pluck('id');

        if ($productIds->isEmpty()) {
            return sendResponse(['brands' => [], 'colors' => [], 'sizes' => []], 'Filters fetched');
        }

        $brands = Brand::query()
            ->where('status', 'active')
            ->whereIn('id', Product::query()->whereIn('id', $productIds)->whereNotNull('brand_id')->distinct()->pluck('brand_id'))
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        $colors = Product::query()
            ->whereIn('id', $productIds)
            ->whereNotNull('color_name')
            ->select(['color_name', DB::raw('MAX(color_hex) as color_hex'), DB::raw('COUNT(*) as count')])
            ->groupBy('color_name')
            ->orderBy('color_name')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->color_name,
                'hex' => $row->color_hex,
                'count' => (int) $row->count,
            ])->values();

        $sizes = ProductVariant::query()
            ->whereIn('product_id', $productIds)
            ->where('name', '!=', 'Default')
            ->whereHas('inventory', fn (Builder $q) => $q->where('quantity', '>', 0))
            ->select(['name', DB::raw('COUNT(DISTINCT product_id) as count')])
            ->groupBy('name')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'count' => (int) $row->count,
            ])->values();

        return sendResponse([
            'brands' => $brands,
            'colors' => $colors,
            'sizes' => $sizes,
        ], 'Filters fetched');
    }

    public function promoBanners()
    {
        $items = PromoBanner::query()
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get(['id', 'title', 'title_en', 'image', 'link']);

        $mapped = $items->map(fn (PromoBanner $b) => [
            'id' => $b->id,
            'title' => $b->title,
            'title_en' => $b->title_en,
            'image' => $b->image,
            'link' => $b->link ?: '/shop',
        ]);

        return sendResponse($mapped, 'Promo banners fetched');
    }

    public function shippingMethods()
    {
        $items = ShippingMethod::query()
            ->where('status', 'active')
            ->orderBy('price_amount')
            ->get(['id', 'name', 'price_amount', 'free_shipping_minimum', 'estimated_days_min', 'estimated_days_max']);

        $mapped = $items->map(fn (ShippingMethod $m) => [
            'id' => $m->id,
            'name' => $m->name,
            'price' => MoneyHelper::fromMinor($m->price_amount),
            'free_shipping_minimum' => MoneyHelper::fromMinor($m->free_shipping_minimum),
            'estimated_days_min' => $m->estimated_days_min,
            'estimated_days_max' => $m->estimated_days_max,
        ]);

        return sendResponse($mapped, 'Shipping methods fetched');
    }

    public function deliveryRegions()
    {
        $regions = DeliveryRegion::query()
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'slug', 'name', 'name_en', 'price_amount']);

        $mapped = $regions->map(fn (DeliveryRegion $r) => [
            'id' => $r->id,
            'slug' => $r->slug,
            'name' => $r->name,
            'name_en' => $r->name_en,
            'price' => MoneyHelper::fromMinor($r->price_amount),
        ]);

        return sendResponse($mapped, 'Delivery regions fetched');
    }

    public function deliveryQuote(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'delivery_region_id' => 'required|integer|exists:delivery_regions,id',
            'street' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $quote = $this->deliveryPricing->quote(
            MerchantContext::merchantId(),
            (int) $data['delivery_region_id'],
            $data['street'] ?? null,
        );

        if (! $quote) {
            return sendError('Region not found', [], 404);
        }

        return sendResponse([
            'price' => $quote['price'],
            'source' => $quote['source'],
            'region_id' => $quote['region_id'],
            'region_name' => $quote['region_name'],
            'street_id' => $quote['street_id'],
            'street_name' => $quote['street_name'],
        ], 'Delivery quote');
    }

    public function aiSearch(Request $request)
    {
        $q = trim((string) $request->input('q', ''));
        if ($q === '') {
            return sendError('Query is required', [], 422);
        }

        $locale = (string) $request->input('locale', 'ar');
        $result = $this->aiSearch->searchProducts($q, 24, $locale);

        return sendResponse([
            'query' => $q,
            'summary' => $result['analysis']['summary'] ?? '',
            'keywords' => $result['analysis']['keywords'] ?? [],
            'ai_used' => $result['analysis']['ai_used'] ?? false,
            'products' => $result['products'],
        ], 'Smart search completed');
    }

    public function products(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 50));
        $featured = $request->boolean('featured');
        $onSale = $request->boolean('on_sale');
        $sort = (string) $request->input('sort', '');

        $query = $this->baseStorefrontProductQuery($request)
            ->with([
                'category:id,name',
                'brand:id,name',
                'defaultVariant.inventory',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1),
            ]);

        $this->applyStorefrontProductFilters($query, $request);

        if ($sort === 'bestseller') {
            $query->withCount('orderItems as sales_count')->orderByDesc('sales_count')->orderByDesc('id');
        } elseif ($sort === 'new') {
            $query->orderByDesc('created_at')->orderByDesc('id');
        } else {
            $query->orderByDesc('featured')->orderByDesc('id');
        }

        if ($featured) {
            $query->where('featured', true);
        }
        if ($onSale) {
            $query->whereHas('defaultVariant', fn ($q) => $q
                ->whereNotNull('compare_at_price_amount')
                ->whereColumn('compare_at_price_amount', '>', 'price_amount'));
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Product $p) => $this->formatProduct($p));

        return sendResponse($paginator, 'Products fetched');
    }

    public function productShow(int $id)
    {
        $product = Product::query()
            ->with([
                'category:id,name',
                'brand:id,name',
                'variants.inventory',
                'defaultVariant.inventory',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order'),
            ])
            ->where('status', 'active')
            ->find($id);

        if (! $product) {
            return sendError('Product not found', [], 404);
        }

        return sendResponse($this->formatProduct($product, true), 'Product details');
    }

    public function legal()
    {
        $store = MerchantContext::store();
        $legal = StoreSettingService::getLegal($store->id);

        return sendResponse([
            'terms_ar' => $legal['terms_ar'],
            'terms_en' => $legal['terms_en'],
            'privacy_ar' => $legal['privacy_ar'],
            'privacy_en' => $legal['privacy_en'],
        ], 'Legal content');
    }

    protected function formatProduct(Product $product, bool $detailed = false): array
    {
        $variant = $product->defaultVariant;
        $inventory = $variant?->inventory;

        $data = [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'short_description' => $product->short_description,
            'featured' => $product->featured,
            'category_id' => $product->category_id,
            'category_name' => $product->category?->name,
            'price' => MoneyHelper::fromMinor($variant?->price_amount),
            'compare_at_price' => MoneyHelper::fromMinor($variant?->compare_at_price_amount),
            'in_stock' => ($inventory?->quantity ?? 0) > 0,
            'variant_id' => $variant?->id,
            'sku' => $variant?->sku,
            'image' => $this->productImagePath($product),
            'brand_id' => $product->brand_id,
            'brand_name' => $product->brand?->name,
            'color_name' => $product->color_name,
            'color_hex' => $product->color_hex,
        ];

        if ($detailed) {
            $data['description'] = $product->description;
            $data['quantity'] = $inventory?->quantity ?? 0;
            $data['product_group_id'] = $product->product_group_id;
            $variants = $product->relationLoaded('variants') ? $product->variants : collect();
            $sized = $variants->reject(fn (ProductVariant $v) => $v->name === 'Default');
            $list = $sized->isNotEmpty() ? $sized : $variants;
            $data['size_variants'] = $list->map(fn (ProductVariant $v) => [
                'id' => $v->id,
                'name' => $v->name ?? 'Default',
                'sku' => $v->sku,
                'price' => MoneyHelper::fromMinor($v->price_amount),
                'in_stock' => ($v->inventory?->quantity ?? 0) > 0,
                'quantity' => $v->inventory?->quantity ?? 0,
                'is_default' => $v->is_default,
            ])->values()->all();
            $data['color_siblings'] = [];
            if ($product->product_group_id) {
                $data['color_siblings'] = Product::query()
                    ->where('product_group_id', $product->product_group_id)
                    ->where('status', 'active')
                    ->where('id', '!=', $product->id)
                    ->with(['images' => fn ($q) => $q->orderByDesc('is_primary')->limit(1)])
                    ->get(['id', 'name', 'color_name', 'color_hex'])
                    ->map(fn (Product $s) => [
                        'id' => $s->id,
                        'name' => $s->name,
                        'color_name' => $s->color_name,
                        'color_hex' => $s->color_hex,
                        'image' => $this->productImagePath($s),
                    ])->values()->all();
            }
            $data['images'] = $product->relationLoaded('images')
                ? $product->images->map(fn ($img) => $img->file_path)->values()->all()
                : [];
        }

        return $data;
    }

    public function gyms(Request $request)
    {
        $sector = trim((string) $request->input('sector', ''));
        $city = trim((string) $request->input('city', ''));
        $lat = $request->input('lat');
        $lng = $request->input('lng');

        $query = Gym::query()->where('status', 'active')->orderBy('sort_order')->orderBy('name');

        if ($sector !== '') {
            $query->where('sector', 'like', "%{$sector}%");
        } elseif ($city !== '') {
            $query->where('city', 'like', "%{$city}%");
        }

        $items = $query->limit(20)->get();

        if ($lat !== null && $lng !== null && is_numeric($lat) && is_numeric($lng)) {
            $items = $items->sortBy(function (Gym $g) use ($lat, $lng) {
                if ($g->latitude === null || $g->longitude === null) {
                    return PHP_FLOAT_MAX;
                }

                return ($g->latitude - (float) $lat) ** 2 + ($g->longitude - (float) $lng) ** 2;
            })->values();
        }

        return sendResponse($items->map(fn (Gym $g) => [
            'id' => $g->id,
            'name' => $g->name,
            'name_en' => $g->name_en,
            'sector' => $g->sector,
            'city' => $g->city,
            'cover_image' => $g->cover_image,
            'gallery' => $g->gallery ?? [],
            'description' => $g->description,
            'subscription_info' => $g->subscription_info,
            'opening_hours' => $g->opening_hours ?? [],
        ])->values()->all(), 'Gyms fetched');
    }

    public function gymShow(int $id)
    {
        $gym = Gym::query()->where('status', 'active')->find($id);
        if (! $gym) {
            return sendError('Gym not found', [], 404);
        }

        return sendResponse([
            'id' => $gym->id,
            'name' => $gym->name,
            'name_en' => $gym->name_en,
            'sector' => $gym->sector,
            'city' => $gym->city,
            'latitude' => $gym->latitude,
            'longitude' => $gym->longitude,
            'cover_image' => $gym->cover_image,
            'gallery' => $gym->gallery ?? [],
            'description' => $gym->description,
            'subscription_info' => $gym->subscription_info,
            'opening_hours' => $gym->opening_hours ?? [],
        ], 'Gym details');
    }

    protected function baseStorefrontProductQuery(Request $request): Builder
    {
        $query = Product::query()->where('status', 'active');

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $categoryId = $request->input('category_id');
        if ($categoryId) {
            $query->whereIn('category_id', $this->categoryIdsIncludingDescendants((int) $categoryId));
        }

        return $query;
    }

    protected function applyStorefrontProductFilters(Builder $query, Request $request): void
    {
        if ($request->filled('brand_id')) {
            $query->where('brand_id', (int) $request->input('brand_id'));
        }

        $color = trim((string) $request->input('color', ''));
        if ($color !== '') {
            $query->where('color_name', $color);
        }

        $size = trim((string) $request->input('size', ''));
        if ($size !== '') {
            $query->whereHas('variants', function (Builder $q) use ($size) {
                $q->where('name', $size)
                    ->where('name', '!=', 'Default')
                    ->whereHas('inventory', fn (Builder $inv) => $inv->where('quantity', '>', 0));
            });
        }
    }

    /** @return array<int, int> */
    protected function categoryIdsIncludingDescendants(int $categoryId): array
    {
        $all = Category::query()
            ->where('status', 'active')
            ->get(['id', 'parent_id']);

        $ids = [$categoryId];
        $queue = [$categoryId];

        while ($queue !== []) {
            $parentId = array_shift($queue);
            foreach ($all as $cat) {
                if ((int) $cat->parent_id === (int) $parentId && ! in_array($cat->id, $ids, true)) {
                    $ids[] = $cat->id;
                    $queue[] = $cat->id;
                }
            }
        }

        return $ids;
    }

    protected function productImagePath(Product $product): ?string
    {
        $image = $product->relationLoaded('images')
            ? ($product->images->firstWhere('is_primary', true) ?? $product->images->first())
            : null;

        return $image?->file_path;
    }
}
