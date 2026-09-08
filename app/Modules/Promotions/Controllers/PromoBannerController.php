<?php

namespace App\Modules\Promotions\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Promotions\Models\PromoBanner;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PromoBannerController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = PromoBanner::query()->orderBy('sort_order')->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('title_en', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (PromoBanner $b) => $this->format($b));

        return sendResponse($paginator, 'Promo banners fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'image' => 'required|string|max:500',
            'link' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $banner = PromoBanner::create([
            ...$data,
            'status' => $data['status'] ?? 'active',
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        $this->activityLog->log('banner.created', 'promotions', "Promo banner {$banner->title} created", PromoBanner::class, $banner->id, request: $request);

        return sendResponse($this->format($banner), 'Promo banner created');
    }

    public function show(int $id)
    {
        $banner = PromoBanner::find($id);
        if (! $banner) {
            return sendError('Promo banner not found', [], 404);
        }

        return sendResponse($this->format($banner), 'Promo banner details');
    }

    public function update(Request $request, int $id)
    {
        $banner = PromoBanner::find($id);
        if (! $banner) {
            return sendError('Promo banner not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'image' => 'sometimes|required|string|max:500',
            'link' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $banner->update($validator->validated());

        $this->activityLog->log('banner.updated', 'promotions', "Promo banner {$banner->title} updated", PromoBanner::class, $banner->id, request: $request);

        return sendResponse($this->format($banner->fresh()), 'Promo banner updated');
    }

    public function destroy(Request $request, int $id)
    {
        $banner = PromoBanner::find($id);
        if (! $banner) {
            return sendError('Promo banner not found', [], 404);
        }

        $title = $banner->title;
        $banner->delete();

        $this->activityLog->log('banner.deleted', 'promotions', "Promo banner {$title} deleted", request: $request);

        return sendResponse([], 'Promo banner deleted');
    }

    protected function format(PromoBanner $banner): array
    {
        return [
            'id' => $banner->id,
            'title' => $banner->title,
            'title_en' => $banner->title_en,
            'image' => $banner->image,
            'link' => $banner->link,
            'sort_order' => $banner->sort_order,
            'status' => $banner->status,
            'created_at' => $banner->created_at,
        ];
    }
}
