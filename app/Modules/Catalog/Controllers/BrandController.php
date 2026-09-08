<?php

namespace App\Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Brand;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Brand::query()->orderBy('name');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Brand $b) => $this->format($b));

        return sendResponse($paginator, 'Brands fetched');
    }

    public function options()
    {
        $items = Brand::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']);
        return sendResponse($items, 'Brand options fetched');
    }

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $slug = $this->uniqueSlug($data['slug'] ?? $data['name'], $merchantId);

        $brand = Brand::create([
            ...$data,
            'slug' => $slug,
            'status' => $data['status'] ?? 'active',
        ]);

        $this->activityLog->log('brand.created', 'brands', "Brand {$brand->name} created", Brand::class, $brand->id, request: $request);

        return sendResponse($this->format($brand), 'Brand created');
    }

    public function show(int $id)
    {
        $brand = Brand::find($id);
        if (! $brand) {
            return sendError('Brand not found', [], 404);
        }

        return sendResponse($this->format($brand), 'Brand details');
    }

    public function update(Request $request, int $id)
    {
        $brand = Brand::find($id);
        if (! $brand) {
            return sendError('Brand not found', [], 404);
        }

        $merchantId = MerchantContext::merchantId();
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        if (isset($data['name']) || isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name'] ?? $brand->name, $merchantId, $brand->id);
        }

        $brand->update($data);

        $this->activityLog->log('brand.updated', 'brands', "Brand {$brand->name} updated", Brand::class, $brand->id, request: $request);

        return sendResponse($this->format($brand->fresh()), 'Brand updated');
    }

    public function destroy(Request $request, int $id)
    {
        $brand = Brand::find($id);
        if (! $brand) {
            return sendError('Brand not found', [], 404);
        }

        if ($brand->products()->exists()) {
            return sendError('Brand has products', [], 422);
        }

        $name = $brand->name;
        $brand->delete();

        $this->activityLog->log('brand.deleted', 'brands', "Brand {$name} deleted", request: $request);

        return sendResponse([], 'Brand deleted');
    }

    protected function uniqueSlug(string $value, int $merchantId, ?int $ignoreId = null): string
    {
        $slug = Str::slug($value) ?: 'brand';
        $base = $slug;
        $i = 1;

        while (Brand::withoutGlobalScopes()
            ->where('merchant_id', $merchantId)
            ->where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    protected function format(Brand $brand): array
    {
        return [
            'id' => $brand->id,
            'name' => $brand->name,
            'slug' => $brand->slug,
            'description' => $brand->description,
            'status' => $brand->status,
            'created_at' => $brand->created_at,
        ];
    }
}
