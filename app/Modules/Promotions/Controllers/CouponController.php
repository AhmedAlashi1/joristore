<?php

namespace App\Modules\Promotions\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Partners\Models\Partner;
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

        $query = Coupon::query()->with('partner')->orderByDesc('id');
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
            'type' => 'required|in:percentage,fixed_amount',
            'applies_to' => 'required|in:subtotal,shipping',
            'value' => 'required|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'status' => 'nullable|in:active,inactive',
            'partner_id' => 'nullable|integer|exists:partners,id',
            'commission_type' => 'nullable|in:percentage,fixed_amount',
            'commission_value' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        if ($data['type'] === 'percentage' && (float) $data['value'] > 100) {
            return sendError('Percentage cannot exceed 100', [], 422);
        }

        $partnerFields = $this->resolvePartnerCommissionFields($data);
        if ($partnerFields instanceof \Illuminate\Http\JsonResponse) {
            return $partnerFields;
        }

        $coupon = Coupon::create([
            'code' => Str::upper($data['code']),
            'name' => $data['name'],
            'type' => $data['type'],
            'applies_to' => $data['applies_to'],
            'value' => $data['type'] === 'percentage' ? (int) $data['value'] : MoneyHelper::toMinor((float) $data['value']),
            'minimum_order_amount' => isset($data['minimum_order_amount']) ? MoneyHelper::toMinor((float) $data['minimum_order_amount']) : null,
            'maximum_discount_amount' => isset($data['maximum_discount_amount']) ? MoneyHelper::toMinor((float) $data['maximum_discount_amount']) : null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'usage_limit_per_customer' => $data['usage_limit_per_customer'] ?? null,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_by' => auth()->id(),
            ...$partnerFields,
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
            'applies_to' => 'sometimes|required|in:subtotal,shipping',
            'value' => 'sometimes|required|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
            'partner_id' => 'nullable|integer|exists:partners,id',
            'commission_type' => 'nullable|in:percentage,fixed_amount',
            'commission_value' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $partnerFields = $this->resolvePartnerCommissionFields($data, $coupon);
        if ($partnerFields instanceof \Illuminate\Http\JsonResponse) {
            return $partnerFields;
        }

        $update = array_filter([
            'name' => $data['name'] ?? null,
            'type' => $data['type'] ?? null,
            'applies_to' => $data['applies_to'] ?? null,
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
        if ($partnerFields !== null) {
            $update = array_merge($update, $partnerFields);
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
        $commissionValue = null;
        if ($c->commission_type === 'percentage') {
            $commissionValue = $c->commission_value !== null ? (int) $c->commission_value : null;
        } elseif ($c->commission_type === 'fixed_amount') {
            $commissionValue = MoneyHelper::fromMinor($c->commission_value);
        }

        return [
            'id' => $c->id,
            'code' => $c->code,
            'name' => $c->name,
            'type' => $c->type,
            'applies_to' => $c->applies_to ?? ($c->type === 'free_shipping' ? 'shipping' : 'subtotal'),
            'value' => $c->type === 'percentage' ? $c->value : MoneyHelper::fromMinor($c->value),
            'minimum_order_amount' => MoneyHelper::fromMinor($c->minimum_order_amount),
            'maximum_discount_amount' => MoneyHelper::fromMinor($c->maximum_discount_amount),
            'usage_limit' => $c->usage_limit,
            'used_count' => $c->used_count,
            'starts_at' => $c->starts_at,
            'expires_at' => $c->expires_at,
            'status' => $c->status,
            'partner_id' => $c->partner_id,
            'partner_name' => $c->partner?->name,
            'commission_type' => $c->commission_type,
            'commission_value' => $commissionValue,
        ];
    }

    /**
     * @return array<string, mixed>|null|\Illuminate\Http\JsonResponse
     */
    protected function resolvePartnerCommissionFields(array $data, ?Coupon $existing = null)
    {
        if (! array_key_exists('partner_id', $data)
            && ! array_key_exists('commission_type', $data)
            && ! array_key_exists('commission_value', $data)) {
            return null;
        }

        $partnerId = array_key_exists('partner_id', $data) ? $data['partner_id'] : $existing?->partner_id;
        if (! $partnerId) {
            return [
                'partner_id' => null,
                'commission_type' => null,
                'commission_value' => null,
            ];
        }

        if (! Partner::find($partnerId)) {
            return sendError('Partner not found', [], 422);
        }

        $type = $data['commission_type'] ?? $existing?->commission_type;
        $value = $data['commission_value'] ?? null;
        if ($existing && $value === null && $existing->commission_type === $type) {
            $value = $existing->commission_type === 'percentage'
                ? $existing->commission_value
                : MoneyHelper::fromMinor($existing->commission_value);
        }

        if (! $type || $value === null) {
            return sendError('Commission type and value are required when linking a partner', [], 422);
        }

        if ($type === 'percentage' && (float) $value > 100) {
            return sendError('Commission percentage cannot exceed 100', [], 422);
        }

        return [
            'partner_id' => $partnerId,
            'commission_type' => $type,
            'commission_value' => $type === 'percentage'
                ? (int) $value
                : MoneyHelper::toMinor((float) $value),
        ];
    }
}
