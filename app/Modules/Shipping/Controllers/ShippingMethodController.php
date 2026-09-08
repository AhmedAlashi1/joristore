<?php

namespace App\Modules\Shipping\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Shipping\Models\ShippingMethod;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ShippingMethodController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $query = ShippingMethod::query()->orderBy('name');
        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (ShippingMethod $m) => $this->format($m));

        return sendResponse($paginator, 'Shipping methods fetched');
    }

    public function options()
    {
        return sendResponse(
            ShippingMethod::where('status', 'active')->orderBy('name')->get(['id', 'name', 'price_amount', 'type']),
            'Shipping options'
        );
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:flat_rate,free,pickup,provider',
            'price' => 'nullable|numeric|min:0',
            'free_shipping_minimum' => 'nullable|numeric|min:0',
            'estimated_days_min' => 'nullable|integer|min:0',
            'estimated_days_max' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $method = ShippingMethod::create([
            'name' => $data['name'],
            'type' => $data['type'],
            'price_amount' => MoneyHelper::toMinor((float) ($data['price'] ?? 0)),
            'free_shipping_minimum' => isset($data['free_shipping_minimum']) ? MoneyHelper::toMinor((float) $data['free_shipping_minimum']) : null,
            'estimated_days_min' => $data['estimated_days_min'] ?? null,
            'estimated_days_max' => $data['estimated_days_max'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);

        $this->activityLog->log('shipping.created', 'shipping', "Shipping method {$method->name} created", ShippingMethod::class, $method->id, request: $request);

        return sendResponse($this->format($method), 'Shipping method created');
    }

    public function show(int $id)
    {
        $method = ShippingMethod::find($id);
        if (! $method) {
            return sendError('Not found', [], 404);
        }

        return sendResponse($this->format($method), 'Shipping method details');
    }

    public function update(Request $request, int $id)
    {
        $method = ShippingMethod::find($id);
        if (! $method) {
            return sendError('Not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:flat_rate,free,pickup,provider',
            'price' => 'nullable|numeric|min:0',
            'free_shipping_minimum' => 'nullable|numeric|min:0',
            'estimated_days_min' => 'nullable|integer|min:0',
            'estimated_days_max' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $method->update(array_filter([
            'name' => $data['name'] ?? null,
            'type' => $data['type'] ?? null,
            'price_amount' => isset($data['price']) ? MoneyHelper::toMinor((float) $data['price']) : null,
            'free_shipping_minimum' => array_key_exists('free_shipping_minimum', $data) && $data['free_shipping_minimum'] !== null
                ? MoneyHelper::toMinor((float) $data['free_shipping_minimum']) : (array_key_exists('free_shipping_minimum', $data) ? null : $method->free_shipping_minimum),
            'estimated_days_min' => $data['estimated_days_min'] ?? null,
            'estimated_days_max' => $data['estimated_days_max'] ?? null,
            'status' => $data['status'] ?? null,
        ], fn ($v) => $v !== null));

        return sendResponse($this->format($method->fresh()), 'Shipping method updated');
    }

    public function destroy(Request $request, int $id)
    {
        $method = ShippingMethod::find($id);
        if (! $method) {
            return sendError('Not found', [], 404);
        }

        $method->delete();
        return sendResponse([], 'Shipping method deleted');
    }

    protected function format(ShippingMethod $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'type' => $m->type,
            'price' => MoneyHelper::fromMinor($m->price_amount),
            'free_shipping_minimum' => MoneyHelper::fromMinor($m->free_shipping_minimum),
            'estimated_days_min' => $m->estimated_days_min,
            'estimated_days_max' => $m->estimated_days_max,
            'status' => $m->status,
        ];
    }
}
