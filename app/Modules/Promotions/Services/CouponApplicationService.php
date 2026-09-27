<?php

namespace App\Modules\Promotions\Services;

use App\Modules\Customers\Models\Customer;
use App\Modules\Promotions\Models\Coupon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CouponApplicationService
{
    public const APPLIES_SUBTOTAL = 'subtotal';

    public const APPLIES_SHIPPING = 'shipping';

    public function findActiveByCode(int $merchantId, string $code): ?Coupon
    {
        $normalized = Str::upper(trim($code));
        if ($normalized === '') {
            return null;
        }

        return Coupon::query()
            ->where('merchant_id', $merchantId)
            ->whereRaw('UPPER(code) = ?', [$normalized])
            ->first();
    }

    public function resolvesAppliesTo(Coupon $coupon): string
    {
        if ($coupon->type === 'free_shipping') {
            return self::APPLIES_SHIPPING;
        }

        $applies = $coupon->applies_to ?? self::APPLIES_SUBTOTAL;

        return in_array($applies, [self::APPLIES_SUBTOTAL, self::APPLIES_SHIPPING], true)
            ? $applies
            : self::APPLIES_SUBTOTAL;
    }

    /**
     * @throws \RuntimeException
     */
    public function assertUsable(Coupon $coupon, ?Customer $customer, int $subtotalMinor, int $shippingMinor = 0): void
    {
        if ($coupon->status !== 'active') {
            throw new \RuntimeException('Coupon is not active');
        }

        $now = now();
        if ($coupon->starts_at && $coupon->starts_at->isAfter($now)) {
            throw new \RuntimeException('Coupon is not valid yet');
        }
        if ($coupon->expires_at && $coupon->expires_at->isBefore($now)) {
            throw new \RuntimeException('Coupon has expired');
        }

        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw new \RuntimeException('Coupon usage limit reached');
        }

        if ($customer && $coupon->usage_limit_per_customer !== null) {
            $usedByCustomer = DB::table('coupon_usages')
                ->where('coupon_id', $coupon->id)
                ->where('customer_id', $customer->id)
                ->count();
            if ($usedByCustomer >= $coupon->usage_limit_per_customer) {
                throw new \RuntimeException('You have already used this coupon');
            }
        }

        $min = (int) ($coupon->minimum_order_amount ?? 0);
        if ($min > 0 && $subtotalMinor < $min) {
            throw new \RuntimeException('Order subtotal is below the minimum for this coupon');
        }

        if ($this->resolvesAppliesTo($coupon) === self::APPLIES_SHIPPING && $shippingMinor <= 0) {
            throw new \RuntimeException('This coupon applies to delivery fee only');
        }
    }

    /**
     * @return array{
     *     applies_to: string,
     *     discount_type: string,
     *     subtotal_discount_minor: int,
     *     shipping_amount_minor: int,
     *     savings_minor: int
     * }
     */
    public function apply(Coupon $coupon, int $subtotalMinor, int $shippingMinor): array
    {
        $appliesTo = $this->resolvesAppliesTo($coupon);
        $subtotalDiscount = 0;
        $shippingAfter = $shippingMinor;

        if ($appliesTo === self::APPLIES_SHIPPING) {
            $off = $this->amountOffBase($coupon, $shippingMinor);
            $shippingAfter = max(0, $shippingMinor - $off);
        } else {
            $subtotalDiscount = $this->amountOffBase($coupon, $subtotalMinor);
        }

        $savings = $subtotalDiscount + max(0, $shippingMinor - $shippingAfter);

        return [
            'applies_to' => $appliesTo,
            'discount_type' => $coupon->type,
            'subtotal_discount_minor' => $subtotalDiscount,
            'shipping_amount_minor' => $shippingAfter,
            'savings_minor' => $savings,
        ];
    }

    protected function amountOffBase(Coupon $coupon, int $baseMinor): int
    {
        if ($baseMinor <= 0) {
            return 0;
        }

        if ($coupon->type === 'free_shipping') {
            return $baseMinor;
        }

        if ($coupon->type === 'fixed_amount') {
            return min((int) $coupon->value, $baseMinor);
        }

        if ($coupon->type === 'percentage') {
            $pct = max(0, min(100, (int) $coupon->value));
            $raw = (int) round($baseMinor * $pct / 100);
            $cap = (int) ($coupon->maximum_discount_amount ?? 0);

            return $cap > 0 ? min($raw, $cap) : $raw;
        }

        return 0;
    }

    public function recordUsage(Coupon $coupon, Customer $customer, int $orderId, int $discountMinor): void
    {
        DB::table('coupon_usages')->insert([
            'coupon_id' => $coupon->id,
            'customer_id' => $customer->id,
            'order_id' => $orderId,
            'discount_amount' => $discountMinor,
            'used_at' => now(),
        ]);

        $coupon->increment('used_count');
    }
}
