<?php

namespace App\Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Category;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Category::query()->with('parent')->orderBy('sort_order')->orderBy('name');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Category $c) => $this->format($c));

        return sendResponse($paginator, 'Categories fetched');
    }

    public function options()
    {
        $items = Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']);
        return sendResponse($items, 'Category options fetched');
    }

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'parent_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('merchant_id', $merchantId)],
            'description' => 'nullable|string',
            'image' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $slug = $this->uniqueSlug($data['slug'] ?? $data['name'], $merchantId);

        $category = Category::create([
            ...$data,
            'slug' => $slug,
            'status' => $data['status'] ?? 'active',
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);

        $this->activityLog->log('category.created', 'categories', "Category {$category->name} created", Category::class, $category->id, request: $request);

        return sendResponse($this->format($category->load('parent')), 'Category created');
    }

    public function show(int $id)
    {
        $category = Category::with('parent')->find($id);
        if (! $category) {
            return sendError('Category not found', [], 404);
        }

        return sendResponse($this->format($category), 'Category details');
    }

    public function update(Request $request, int $id)
    {
        $category = Category::find($id);
        if (! $category) {
            return sendError('Category not found', [], 404);
        }

        $merchantId = MerchantContext::merchantId();
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'parent_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('merchant_id', $merchantId)],
            'description' => 'nullable|string',
            'image' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        if (isset($data['name']) || isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name'] ?? $category->name, $merchantId, $category->id);
        }

        $data['updated_by'] = auth()->id();
        $category->update($data);

        $this->activityLog->log('category.updated', 'categories', "Category {$category->name} updated", Category::class, $category->id, request: $request);

        return sendResponse($this->format($category->fresh()->load('parent')), 'Category updated');
    }

    public function destroy(Request $request, int $id)
    {
        $category = Category::find($id);
        if (! $category) {
            return sendError('Category not found', [], 404);
        }

        if ($category->products()->exists()) {
            return sendError('Category has products', [], 422);
        }

        $name = $category->name;
        $category->delete();

        $this->activityLog->log('category.deleted', 'categories', "Category {$name} deleted", request: $request);

        return sendResponse([], 'Category deleted');
    }

    protected function uniqueSlug(string $value, int $merchantId, ?int $ignoreId = null): string
    {
        $slug = Str::slug($value) ?: 'category';
        $base = $slug;
        $i = 1;

        while (Category::withoutGlobalScopes()
            ->where('merchant_id', $merchantId)
            ->where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    protected function format(Category $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'parent_id' => $category->parent_id,
            'parent_name' => $category->parent?->name,
            'description' => $category->description,
            'image' => $category->image,
            'status' => $category->status,
            'sort_order' => $category->sort_order,
            'created_at' => $category->created_at,
        ];
    }
}
