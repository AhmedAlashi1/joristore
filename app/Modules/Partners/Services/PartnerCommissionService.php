<?php

namespace App\Modules\Partners\Services;

use App\Modules\Orders\Models\Order;
use App\Modules\Partners\Models\Partner;
use App\Modules\Partners\Models\PartnerCommission;
use App\Modules\Promotions\Models\Coupon;

class PartnerCommissionService
{
    public function calculateAmount(Coupon $coupon, int $baseMinor): int
    {
        if (! $coupon->partner_id || $baseMinor <= 0) {
            return 0;
        }

        [$type, $value] = $this->resolveCommissionTerms($coupon);
        if (! $type || $value === null) {
            return 0;
        }

        if ($type === 'percentage') {
            return (int) round($baseMinor * ((int) $value) / 100);
        }

        return min($baseMinor, (int) $value);
    }

    /**
     * @return array{0: ?string, 1: ?int}
     */
    protected function resolveCommissionTerms(Coupon $coupon): array
    {
        if ($coupon->commission_type && $coupon->commission_value !== null) {
            return [$coupon->commission_type, (int) $coupon->commission_value];
        }

        $partner = $coupon->relationLoaded('partner')
            ? $coupon->partner
            : Partner::find($coupon->partner_id);

        if ($partner?->default_commission_type && $partner->default_commission_value !== null) {
            return [$partner->default_commission_type, (int) $partner->default_commission_value];
        }

        return [null, null];
    }

    public function recordFromOrder(Coupon $coupon, Order $order, int $commissionBaseMinor): void
    {
        if (! $coupon->partner_id) {
            return;
        }

        $amount = $this->calculateAmount($coupon, $commissionBaseMinor);
        if ($amount <= 0) {
            return;
        }

        PartnerCommission::firstOrCreate(
            ['order_id' => $order->id, 'coupon_id' => $coupon->id],
            [
                'merchant_id' => $order->merchant_id,
                'partner_id' => $coupon->partner_id,
                'order_subtotal_amount' => $commissionBaseMinor,
                'commission_amount' => $amount,
                'status' => 'pending',
                'created_at' => now(),
            ]
        );
    }

    public function pendingTotalForPartner(int $partnerId): int
    {
        return (int) PartnerCommission::query()
            ->where('partner_id', $partnerId)
            ->where('status', 'pending')
            ->sum('commission_amount');
    }
}
