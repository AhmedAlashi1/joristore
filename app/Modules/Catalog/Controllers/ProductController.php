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
                'variants.inventory',
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
        $this->normalizeProductGroupId($request);
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
            'product_group_id' => 'nullable|uuid',
            'color_name' => 'nullable|string|max:64',
            'color_hex' => 'nullable|string|max:16',
            'size_variants' => 'nullable|array',
            'size_variants.*.name' => 'required_with:size_variants|string|max:64',
            'size_variants.*.sku' => 'nullable|string|max:100',
            'size_variants.*.price' => 'nullable|numeric|min:0',
            'size_variants.*.quantity' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $slug = $this->uniqueSlug($data['slug'] ?? $data['name'], $merchantId);

        $groupId = $data['product_group_id'] ?? null;
        if (! $groupId && ! empty($data['color_name'])) {
            $groupId = (string) Str::uuid();
        }

        $product = DB::transaction(function () use ($data, $slug, $merchantId, $groupId) {
            $product = Product::create([
                'name' => $data['name'],
                'slug' => $slug,
                'category_id' => $data['category_id'] ?? null,
                'brand_id' => $data['brand_id'] ?? null,
                'product_group_id' => $groupId,
                'color_name' => $data['color_name'] ?? null,
                'color_hex' => $data['color_hex'] ?? null,
                'product_type' => 'simple',
                'status' => $data['status'] ?? 'draft',
                'short_description' => $data['short_description'] ?? null,
                'description' => $data['description'] ?? null,
                'featured' => $data['featured'] ?? false,
                'published_at' => ($data['status'] ?? 'draft') === 'active' ? now() : null,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            $sizeRows = $data['size_variants'] ?? [];
            if ($sizeRows !== []) {
                $this->syncSizeVariants($product, $sizeRows, $data, $merchantId);
            } else {
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
            }

            return $product->load(['category', 'brand', 'defaultVariant.inventory', 'variants.inventory', 'images']);
        });

        $this->syncPrimaryImage($product, $data['image'] ?? null);
        $product->load(['images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1)]);

        $this->activityLog->log('product.created', 'products', "Product {$product->name} created", Product::class, $product->id, request: $request);

        return sendResponse($this->format($product), 'Product created');
    }

    public function show(int $id)
    {
        $product = Product::with(['category', 'brand', 'defaultVariant.inventory', 'variants.inventory', 'images'])->find($id);
        if (! $product) {
            return sendError('Product not found', [], 404);
        }

        return sendResponse($this->format($product, true), 'Product details');
    }

    public function update(Request $request, int $id)
    {
        $this->normalizeProductGroupId($request);
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
            'product_group_id' => 'nullable|uuid',
            'color_name' => 'nullable|string|max:64',
            'color_hex' => 'nullable|string|max:16',
            'size_variants' => 'nullable|array',
            'size_variants.*.name' => 'required_with:size_variants|string|max:64',
            'size_variants.*.sku' => 'nullable|string|max:100',
            'size_variants.*.price' => 'nullable|numeric|min:0',
            'size_variants.*.quantity' => 'nullable|integer|min:0',
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
                'product_group_id' => array_key_exists('product_group_id', $data) ? $data['product_group_id'] : null,
                'color_name' => array_key_exists('color_name', $data) ? $data['color_name'] : null,
                'color_hex' => array_key_exists('color_hex', $data) ? $data['color_hex'] : null,
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

            if (array_key_exists('size_variants', $data) && is_array($data['size_variants'])) {
                $this->syncSizeVariants($product, $data['size_variants'], $data, $merchantId);
            } else {
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
            }

            if (array_key_exists('image', $data)) {
                $this->syncPrimaryImage($product, $data['image']);
            }
        });

        $this->activityLog->log('product.updated', 'products', "Product {$product->name} updated", Product::class, $product->id, request: $request);

        return sendResponse($this->format($product->fresh()->load(['category', 'brand', 'defaultVariant.inventory', 'variants.inventory', 'images']), true), 'Product updated');
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

    public function duplicate(Request $request, int $id)
    {
        $source = Product::with(['variants.inventory', 'images'])->find($id);
        if (! $source) {
            return sendError('Product not found', [], 404);
        }

        $merchantId = MerchantContext::merchantId();
        $groupId = $source->product_group_id;
        if (! $groupId) {
            $groupId = (string) Str::uuid();
            $source->update(['product_group_id' => $groupId]);
        }

        $copy = DB::transaction(function () use ($source, $merchantId, $groupId) {
            $slug = $this->uniqueSlug($source->slug.'-'.Str::lower(Str::random(4)), $merchantId);

            $product = Product::create([
                'name' => $source->name,
                'slug' => $slug,
                'category_id' => $source->category_id,
                'brand_id' => $source->brand_id,
                'product_group_id' => $groupId,
                'color_name' => null,
                'color_hex' => null,
                'product_type' => $source->product_type,
                'status' => 'draft',
                'short_description' => $source->short_description,
                'description' => $source->description,
                'featured' => $source->featured,
                'requires_shipping' => $source->requires_shipping,
                'is_taxable' => $source->is_taxable,
                'published_at' => null,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            foreach ($source->images as $image) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'file_path' => $image->file_path,
                    'alt_text' => $image->alt_text,
                    'is_primary' => $image->is_primary,
                    'sort_order' => $image->sort_order,
                    'created_by' => auth()->id(),
                ]);
            }

            $location = InventoryLocation::firstOrCreate(
                ['merchant_id' => $merchantId, 'is_default' => true],
                ['name' => 'Main Warehouse', 'code' => 'MAIN', 'status' => 'active']
            );

            $variants = $source->variants->isNotEmpty()
                ? $source->variants
                : collect([$source->defaultVariant])->filter();

            $first = true;
            foreach ($variants as $variant) {
                if (! $variant) {
                    continue;
                }
                $sku = $variant->sku ? $variant->sku.'-'.Str::lower(Str::random(3)) : null;
                $newVariant = ProductVariant::create([
                    'product_id' => $product->id,
                    'merchant_id' => $merchantId,
                    'name' => $variant->name,
                    'sku' => $sku,
                    'price_amount' => $variant->price_amount,
                    'compare_at_price_amount' => $variant->compare_at_price_amount,
                    'cost_amount' => $variant->cost_amount,
                    'is_default' => $first,
                    'status' => 'active',
                ]);
                $first = false;

                Inventory::create([
                    'merchant_id' => $merchantId,
                    'product_variant_id' => $newVariant->id,
                    'inventory_location_id' => $location->id,
                    'quantity' => $variant->inventory?->quantity ?? 0,
                    'reserved_quantity' => 0,
                ]);
            }

            return $product;
        });

        $this->activityLog->log(
            'product.duplicated',
            'products',
            "Product duplicated from #{$source->id} to #{$copy->id}",
            Product::class,
            $copy->id,
            request: $request
        );

        $copy->load(['category', 'brand', 'defaultVariant.inventory', 'variants.inventory', 'images']);

        return sendResponse($this->format($copy, true), 'Product duplicated');
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

        $base['product_group_id'] = $product->product_group_id;
        $base['color_name'] = $product->color_name;
        $base['color_hex'] = $product->color_hex;
        $base['size_variants'] = $product->relationLoaded('variants')
            ? $product->variants
                ->reject(fn (ProductVariant $v) => $v->name === 'Default')
                ->map(fn (ProductVariant $v) => [
                    'name' => $v->name,
                    'sku' => $v->sku,
                    'price' => $this->fromMinorUnits($v->price_amount),
                    'quantity' => $v->inventory?->quantity ?? 0,
                    'is_default' => $v->is_default,
                ])->values()->all()
            : [];

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

    /** @param  array<int, array<string, mixed>>  $rows */
    protected function normalizeProductGroupId(Request $request): void
    {
        if (! $request->exists('product_group_id')) {
            return;
        }

        $raw = trim((string) $request->input('product_group_id', ''));
        $request->merge(['product_group_id' => $raw === '' ? null : $raw]);
    }

    protected function syncSizeVariants(Product $product, array $rows, array $data, int $merchantId): void
    {
        $location = InventoryLocation::firstOrCreate(
            ['merchant_id' => $merchantId, 'is_default' => true],
            ['name' => 'Main Warehouse', 'code' => 'MAIN', 'status' => 'active']
        );

        $basePrice = isset($data['price']) ? $this->toMinorUnits((float) $data['price']) : null;
        $compare = isset($data['compare_at_price']) ? $this->toMinorUnits((float) $data['compare_at_price']) : null;
        $cost = isset($data['cost']) ? $this->toMinorUnits((float) $data['cost']) : null;

        $keepNames = [];
        foreach ($rows as $index => $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $keepNames[] = $name;

            $variant = ProductVariant::query()
                ->where('product_id', $product->id)
                ->where('name', $name)
                ->first();

            $priceMinor = isset($row['price']) ? $this->toMinorUnits((float) $row['price']) : ($basePrice ?? 0);

            if (! $variant) {
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'merchant_id' => $merchantId,
                    'name' => $name,
                    'sku' => $row['sku'] ?? ($data['sku'] ?? null),
                    'price_amount' => $priceMinor,
                    'compare_at_price_amount' => $compare,
                    'cost_amount' => $cost,
                    'is_default' => $index === 0,
                    'status' => 'active',
                ]);
            } else {
                $variant->update([
                    'sku' => $row['sku'] ?? $variant->sku,
                    'price_amount' => $priceMinor,
                    'compare_at_price_amount' => $compare,
                    'cost_amount' => $cost,
                    'is_default' => $index === 0,
                ]);
            }

            Inventory::updateOrCreate(
                ['product_variant_id' => $variant->id, 'inventory_location_id' => $location->id],
                ['merchant_id' => $merchantId, 'quantity' => (int) ($row['quantity'] ?? 0)]
            );
        }

        if ($keepNames !== []) {
            ProductVariant::query()
                ->where('product_id', $product->id)
                ->whereNotIn('name', $keepNames)
                ->delete();
        }
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
