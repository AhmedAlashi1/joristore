<?php

namespace App\Modules\Promotions\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Promotions\Models\Coupon;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CouponController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Coupon::query()->orderByDesc('id');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Coupon $c) => $this->format($c));

        return sendResponse($paginator, 'Coupons fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'type' => 'required|in:percentage,fixed_amount,free_shipping',
            'value' => 'required|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $coupon = Coupon::create([
            'code' => Str::upper($data['code']),
            'name' => $data['name'],
            'type' => $data['type'],
            'value' => $data['type'] === 'percentage' ? (int) $data['value'] : MoneyHelper::toMinor((float) $data['value']),
            'minimum_order_amount' => isset($data['minimum_order_amount']) ? MoneyHelper::toMinor((float) $data['minimum_order_amount']) : null,
            'maximum_discount_amount' => isset($data['maximum_discount_amount']) ? MoneyHelper::toMinor((float) $data['maximum_discount_amount']) : null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'usage_limit_per_customer' => $data['usage_limit_per_customer'] ?? null,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_by' => auth()->id(),
        ]);

        $this->activityLog->log('coupon.created', 'coupons', "Coupon {$coupon->code} created", Coupon::class, $coupon->id, request: $request);

        return sendResponse($this->format($coupon), 'Coupon created');
    }

    public function show(int $id)
    {
        $coupon = Coupon::find($id);
        if (! $coupon) {
            return sendError('Coupon not found', [], 404);
        }

        return sendResponse($this->format($coupon), 'Coupon details');
    }

    public function update(Request $request, int $id)
    {
        $coupon = Coupon::find($id);
        if (! $coupon) {
            return sendError('Coupon not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:percentage,fixed_amount,free_shipping',
            'value' => 'sometimes|required|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $update = array_filter([
            'name' => $data['name'] ?? null,
            'type' => $data['type'] ?? null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'usage_limit_per_customer' => $data['usage_limit_per_customer'] ?? null,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'status' => $data['status'] ?? null,
        ], fn ($v) => $v !== null);

        if (isset($data['value'])) {
            $type = $data['type'] ?? $coupon->type;
            $update['value'] = $type === 'percentage' ? (int) $data['value'] : MoneyHelper::toMinor((float) $data['value']);
        }
        if (array_key_exists('minimum_order_amount', $data)) {
            $update['minimum_order_amount'] = $data['minimum_order_amount'] !== null ? MoneyHelper::toMinor((float) $data['minimum_order_amount']) : null;
        }
        if (array_key_exists('maximum_discount_amount', $data)) {
            $update['maximum_discount_amount'] = $data['maximum_discount_amount'] !== null ? MoneyHelper::toMinor((float) $data['maximum_discount_amount']) : null;
        }

        $coupon->update($update);
        $this->activityLog->log('coupon.updated', 'coupons', "Coupon {$coupon->code} updated", Coupon::class, $coupon->id, request: $request);

        return sendResponse($this->format($coupon->fresh()), 'Coupon updated');
    }

    public function destroy(Request $request, int $id)
    {
        $coupon = Coupon::find($id);
        if (! $coupon) {
            return sendError('Coupon not found', [], 404);
        }

        $code = $coupon->code;
        $coupon->delete();
        $this->activityLog->log('coupon.deleted', 'coupons', "Coupon {$code} deleted", request: $request);

        return sendResponse([], 'Coupon deleted');
    }

    protected function format(Coupon $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'name' => $c->name,
            'type' => $c->type,
            'value' => $c->type === 'percentage' ? $c->value : MoneyHelper::fromMinor($c->value),
            'minimum_order_amount' => MoneyHelper::fromMinor($c->minimum_order_amount),
            'maximum_discount_amount' => MoneyHelper::fromMinor($c->maximum_discount_amount),
            'usage_limit' => $c->usage_limit,
            'used_count' => $c->used_count,
            'starts_at' => $c->starts_at,
            'expires_at' => $c->expires_at,
            'status' => $c->status,
        ];
    }
}
