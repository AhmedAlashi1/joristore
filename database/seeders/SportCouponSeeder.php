<?php

namespace Database\Seeders;

use App\Modules\Merchants\Models\Merchant;
use App\Modules\Promotions\Models\Coupon;
use Illuminate\Database\Seeder;

class SportCouponSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();
        if (! $merchant) {
            $this->command?->warn('Merchant jori-store not found.');

            return;
        }

        Coupon::withoutGlobalScopes()->updateOrCreate(
            ['merchant_id' => $merchant->id, 'code' => 'SPORT'],
            [
                'name' => 'Sport 5% off subtotal',
                'type' => 'percentage',
                'applies_to' => 'subtotal',
                'value' => 5,
                'minimum_order_amount' => null,
                'maximum_discount_amount' => null,
                'usage_limit' => null,
                'usage_limit_per_customer' => null,
                'used_count' => 0,
                'starts_at' => null,
                'expires_at' => null,
                'status' => 'active',
                'created_by' => null,
            ],
        );

        $this->command?->info('Coupon SPORT (5% on subtotal) is ready.');
    }
}
