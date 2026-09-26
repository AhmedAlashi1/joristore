<?php

namespace App\Modules\Shipping\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Shipping\Models\DeliveryRegion;
use App\Modules\Shipping\Models\DeliveryStreet;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class DeliveryRegionController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 50), 100));
        $query = DeliveryRegion::query()->withCount('streets')->orderBy('sort_order')->orderBy('name');
        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (DeliveryRegion $r) => $this->formatRegion($r));

        return sendResponse($paginator, 'Delivery regions fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:120',
            'price' => 'required|numeric|min:0',
            'sort_order' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $slug = $data['slug'] ?? Str::slug($data['name']);
        $region = DeliveryRegion::create([
            'name' => $data['name'],
            'name_en' => $data['name_en'] ?? null,
            'slug' => $slug,
            'price_amount' => MoneyHelper::toMinor((float) $data['price']),
            'sort_order' => $data['sort_order'] ?? 0,
            'status' => $data['status'] ?? 'active',
        ]);

        $this->activityLog->log('delivery_region.created', 'shipping', "Region {$region->name} created", DeliveryRegion::class, $region->id, request: $request);

        return sendResponse($this->formatRegion($region->loadCount('streets')), 'Delivery region created');
    }

    public function show(int $id)
    {
        $region = DeliveryRegion::with(['streets' => fn ($q) => $q->orderBy('name')])->find($id);
        if (! $region) {
            return sendError('Not found', [], 404);
        }

        return sendResponse($this->formatRegion($region, true), 'Delivery region details');
    }

    public function update(Request $request, int $id)
    {
        $region = DeliveryRegion::find($id);
        if (! $region) {
            return sendError('Not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:120',
            'price' => 'sometimes|required|numeric|min:0',
            'sort_order' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        if (array_key_exists('price', $data)) {
            $data['price_amount'] = MoneyHelper::toMinor((float) $data['price']);
            unset($data['price']);
        }
        $region->update($data);

        return sendResponse($this->formatRegion($region->fresh()->loadCount('streets')), 'Delivery region updated');
    }

    public function destroy(int $id)
    {
        $region = DeliveryRegion::find($id);
        if (! $region) {
            return sendError('Not found', [], 404);
        }
        $region->delete();

        return sendResponse($region, 'Delivery region deleted');
    }

    public function storeStreet(Request $request, int $regionId)
    {
        $region = DeliveryRegion::find($regionId);
        if (! $region) {
            return sendError('Not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $street = $region->streets()->create([
            'name' => $data['name'],
            'price_amount' => MoneyHelper::toMinor((float) $data['price']),
            'status' => $data['status'] ?? 'active',
        ]);

        return sendResponse($this->formatStreet($street), 'Street created');
    }

    public function updateStreet(Request $request, int $regionId, int $streetId)
    {
        $street = DeliveryStreet::where('delivery_region_id', $regionId)->find($streetId);
        if (! $street) {
            return sendError('Not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        if (array_key_exists('price', $data)) {
            $data['price_amount'] = MoneyHelper::toMinor((float) $data['price']);
            unset($data['price']);
        }
        $street->update($data);

        return sendResponse($this->formatStreet($street->fresh()), 'Street updated');
    }

    public function destroyStreet(int $regionId, int $streetId)
    {
        $street = DeliveryStreet::where('delivery_region_id', $regionId)->find($streetId);
        if (! $street) {
            return sendError('Not found', [], 404);
        }
        $street->delete();

        return sendResponse($street, 'Street deleted');
    }

    protected function formatRegion(DeliveryRegion $r, bool $withStreets = false): array
    {
        $data = [
            'id' => $r->id,
            'slug' => $r->slug,
            'name' => $r->name,
            'name_en' => $r->name_en,
            'price' => MoneyHelper::fromMinor($r->price_amount),
            'sort_order' => $r->sort_order,
            'status' => $r->status,
            'streets_count' => $r->streets_count ?? $r->streets()->count(),
        ];

        if ($withStreets) {
            $data['streets'] = ($r->relationLoaded('streets') ? $r->streets : $r->streets()->orderBy('name')->get())
                ->map(fn (DeliveryStreet $s) => $this->formatStreet($s))
                ->values()
                ->all();
        }

        return $data;
    }

    protected function formatStreet(DeliveryStreet $s): array
    {
        return [
            'id' => $s->id,
            'delivery_region_id' => $s->delivery_region_id,
            'name' => $s->name,
            'price' => MoneyHelper::fromMinor($s->price_amount),
            'status' => $s->status,
        ];
    }
}
