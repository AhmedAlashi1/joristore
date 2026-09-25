<?php

namespace App\Modules\Storefront\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Promotions\Models\PromoBanner;
use App\Modules\Shipping\Models\ShippingMethod;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\MerchantContext;
use App\Shared\Services\StoreAiSearchService;
use App\Shared\Services\StoreSettingService;
use Illuminate\Http\Request;

class StorefrontController extends Controller
{
    public function __construct(protected StoreAiSearchService $aiSearch) {}

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
            ->get(['id', 'name', 'slug', 'parent_id', 'image']);

        $mapped = $items->map(fn (Category $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'parent_id' => $c->parent_id,
            'image' => $c->image,
        ]);

        return sendResponse($mapped, 'Categories fetched');
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
        $search = trim((string) $request->input('search', ''));
        $categoryId = $request->input('category_id');
        $featured = $request->boolean('featured');

        $query = Product::query()
            ->with([
                'category:id,name',
                'defaultVariant.inventory',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1),
            ])
            ->where('status', 'active')
            ->orderByDesc('featured')
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }
        if ($featured) {
            $query->where('featured', true);
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
                'defaultVariant.inventory',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1),
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
        ];

        if ($detailed) {
            $data['description'] = $product->description;
            $data['brand_name'] = $product->brand?->name;
            $data['quantity'] = $inventory?->quantity ?? 0;
        }

        return $data;
    }

    protected function productImagePath(Product $product): ?string
    {
        $image = $product->relationLoaded('images')
            ? ($product->images->firstWhere('is_primary', true) ?? $product->images->first())
            : null;

        return $image?->file_path;
    }
}
