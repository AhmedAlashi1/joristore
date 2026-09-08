<?php

namespace App\Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\InventoryLocation;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductImage;
use App\Modules\Catalog\Models\ProductVariant;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status');

        $query = Product::query()
            ->with([
                'category:id,name',
                'brand:id,name',
                'defaultVariant.inventory',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1),
            ])
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }
        if ($status) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Product $p) => $this->format($p));

        return sendResponse($paginator, 'Products fetched');
    }

    public function options()
    {
        $variants = ProductVariant::query()
            ->with('product:id,name,status')
            ->whereHas('product', fn ($q) => $q->where('status', 'active'))
            ->orderBy('id')
            ->get(['id', 'product_id', 'name', 'sku', 'price_amount']);

        return sendResponse($variants->map(fn (ProductVariant $v) => [
            'id' => $v->id,
            'product_id' => $v->product_id,
            'name' => $v->product?->name.($v->name && $v->name !== 'Default' ? " — {$v->name}" : ''),
            'sku' => $v->sku,
            'price' => $this->fromMinorUnits($v->price_amount),
        ]), 'Product options');
    }

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('merchant_id', $merchantId)],
            'brand_id' => ['nullable', 'integer', Rule::exists('brands', 'id')->where('merchant_id', $merchantId)],
            'status' => 'nullable|in:draft,active,inactive,archived',
            'short_description' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'featured' => 'nullable|boolean',
            'sku' => 'nullable|string|max:100',
            'price' => 'required|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|integer|min:0',
            'image' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $slug = $this->uniqueSlug($data['slug'] ?? $data['name'], $merchantId);

        $product = DB::transaction(function () use ($data, $slug, $merchantId) {
            $product = Product::create([
                'name' => $data['name'],
                'slug' => $slug,
                'category_id' => $data['category_id'] ?? null,
                'brand_id' => $data['brand_id'] ?? null,
                'product_type' => 'simple',
                'status' => $data['status'] ?? 'draft',
                'short_description' => $data['short_description'] ?? null,
                'description' => $data['description'] ?? null,
                'featured' => $data['featured'] ?? false,
                'published_at' => ($data['status'] ?? 'draft') === 'active' ? now() : null,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'merchant_id' => $merchantId,
                'name' => 'Default',
                'sku' => $data['sku'] ?? null,
                'price_amount' => $this->toMinorUnits($data['price']),
                'compare_at_price_amount' => isset($data['compare_at_price']) ? $this->toMinorUnits($data['compare_at_price']) : null,
                'cost_amount' => isset($data['cost']) ? $this->toMinorUnits($data['cost']) : null,
                'is_default' => true,
                'status' => 'active',
            ]);

            $location = InventoryLocation::firstOrCreate(
                ['merchant_id' => $merchantId, 'is_default' => true],
                ['name' => 'Main Warehouse', 'code' => 'MAIN', 'status' => 'active']
            );

            Inventory::create([
                'merchant_id' => $merchantId,
                'product_variant_id' => $variant->id,
                'inventory_location_id' => $location->id,
                'quantity' => $data['quantity'] ?? 0,
                'reserved_quantity' => 0,
            ]);

            return $product->load(['category', 'brand', 'defaultVariant.inventory', 'images']);
        });

        $this->syncPrimaryImage($product, $data['image'] ?? null);
        $product->load(['images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1)]);

        $this->activityLog->log('product.created', 'products', "Product {$product->name} created", Product::class, $product->id, request: $request);

        return sendResponse($this->format($product), 'Product created');
    }

    public function show(int $id)
    {
        $product = Product::with(['category', 'brand', 'defaultVariant.inventory', 'images'])->find($id);
        if (! $product) {
            return sendError('Product not found', [], 404);
        }

        return sendResponse($this->format($product, true), 'Product details');
    }

    public function update(Request $request, int $id)
    {
        $product = Product::with(['defaultVariant', 'images'])->find($id);
        if (! $product) {
            return sendError('Product not found', [], 404);
        }

        $merchantId = MerchantContext::merchantId();
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('merchant_id', $merchantId)],
            'brand_id' => ['nullable', 'integer', Rule::exists('brands', 'id')->where('merchant_id', $merchantId)],
            'status' => 'nullable|in:draft,active,inactive,archived',
            'short_description' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'featured' => 'nullable|boolean',
            'sku' => 'nullable|string|max:100',
            'price' => 'nullable|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|integer|min:0',
            'image' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        DB::transaction(function () use ($product, $data, $merchantId) {
            $productData = array_filter([
                'name' => $data['name'] ?? null,
                'category_id' => array_key_exists('category_id', $data) ? $data['category_id'] : null,
                'brand_id' => array_key_exists('brand_id', $data) ? $data['brand_id'] : null,
                'status' => $data['status'] ?? null,
                'short_description' => $data['short_description'] ?? null,
                'description' => $data['description'] ?? null,
                'featured' => $data['featured'] ?? null,
                'updated_by' => auth()->id(),
            ], fn ($v) => $v !== null);

            if (isset($data['name']) || isset($data['slug'])) {
                $productData['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name'] ?? $product->name, $merchantId, $product->id);
            }

            if (isset($data['status']) && $data['status'] === 'active' && ! $product->published_at) {
                $productData['published_at'] = now();
            }

            $product->update($productData);

            $variant = $product->defaultVariant;
            if ($variant) {
                $variant->update(array_filter([
                    'sku' => $data['sku'] ?? null,
                    'price_amount' => isset($data['price']) ? $this->toMinorUnits($data['price']) : null,
                    'compare_at_price_amount' => isset($data['compare_at_price']) ? $this->toMinorUnits($data['compare_at_price']) : null,
                    'cost_amount' => isset($data['cost']) ? $this->toMinorUnits($data['cost']) : null,
                ], fn ($v) => $v !== null));

                if (isset($data['quantity'])) {
                    $location = InventoryLocation::firstOrCreate(
                        ['merchant_id' => $merchantId, 'is_default' => true],
                        ['name' => 'Main Warehouse', 'code' => 'MAIN', 'status' => 'active']
                    );

                    Inventory::updateOrCreate(
                        ['product_variant_id' => $variant->id, 'inventory_location_id' => $location->id],
                        ['merchant_id' => $merchantId, 'quantity' => $data['quantity']]
                    );
                }
            }

            if (array_key_exists('image', $data)) {
                $this->syncPrimaryImage($product, $data['image']);
            }
        });

        $this->activityLog->log('product.updated', 'products', "Product {$product->name} updated", Product::class, $product->id, request: $request);

        return sendResponse($this->format($product->fresh()->load(['category', 'brand', 'defaultVariant.inventory', 'images']), true), 'Product updated');
    }

    public function destroy(Request $request, int $id)
    {
        $product = Product::find($id);
        if (! $product) {
            return sendError('Product not found', [], 404);
        }

        $name = $product->name;
        $product->delete();

        $this->activityLog->log('product.deleted', 'products', "Product {$name} deleted", request: $request);

        return sendResponse([], 'Product deleted');
    }

    protected function toMinorUnits(float $amount): int
    {
        return (int) round($amount * 100);
    }

    protected function fromMinorUnits(?int $amount): float
    {
        return ($amount ?? 0) / 100;
    }

    protected function uniqueSlug(string $value, int $merchantId, ?int $ignoreId = null): string
    {
        $slug = Str::slug($value) ?: 'product';
        $base = $slug;
        $i = 1;

        while (Product::withoutGlobalScopes()
            ->where('merchant_id', $merchantId)
            ->where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    protected function format(Product $product, bool $detailed = false): array
    {
        $variant = $product->defaultVariant;
        $inventory = $variant?->inventory;

        $base = [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'status' => $product->status,
            'category_id' => $product->category_id,
            'category_name' => $product->category?->name,
            'brand_id' => $product->brand_id,
            'brand_name' => $product->brand?->name,
            'featured' => $product->featured,
            'price' => $this->fromMinorUnits($variant?->price_amount),
            'quantity' => $inventory?->quantity ?? 0,
            'sku' => $variant?->sku,
            'image' => $this->primaryImagePath($product),
            'created_at' => $product->created_at,
        ];

        if ($detailed) {
            $base['short_description'] = $product->short_description;
            $base['description'] = $product->description;
            $base['compare_at_price'] = $this->fromMinorUnits($variant?->compare_at_price_amount);
            $base['cost'] = $this->fromMinorUnits($variant?->cost_amount);
        } else {
            $base['short_description'] = $product->short_description;
            $base['description'] = $product->description;
            $base['compare_at_price'] = $this->fromMinorUnits($variant?->compare_at_price_amount);
            $base['cost'] = $this->fromMinorUnits($variant?->cost_amount);
        }

        return $base;
    }

    protected function primaryImagePath(Product $product): ?string
    {
        if ($product->relationLoaded('images')) {
            $image = $product->images->firstWhere('is_primary', true) ?? $product->images->first();

            return $image?->file_path;
        }

        return $product->images()->where('is_primary', true)->value('file_path')
            ?? $product->images()->orderBy('sort_order')->value('file_path');
    }

    protected function syncPrimaryImage(Product $product, ?string $path): void
    {
        $existing = $product->images()->where('is_primary', true)->first();

        if (! $path) {
            $existing?->delete();

            return;
        }

        if ($existing) {
            if ($existing->file_path !== $path) {
                $existing->update(['file_path' => $path]);
            }

            return;
        }

        ProductImage::create([
            'product_id' => $product->id,
            'file_path' => $path,
            'is_primary' => true,
            'sort_order' => 0,
            'created_by' => auth()->id(),
        ]);
    }
}
