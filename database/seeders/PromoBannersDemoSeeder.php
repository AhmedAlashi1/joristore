<?php

namespace Database\Seeders;

use App\Modules\Merchants\Models\Merchant;
use App\Modules\Promotions\Models\PromoBanner;
use Illuminate\Database\Seeder;

class PromoBannersDemoSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();

        if (! $merchant) {
            $this->command?->warn('Demo merchant not found.');

            return;
        }

        if (PromoBanner::withoutGlobalScopes()->where('merchant_id', $merchant->id)->exists()) {
            $this->command?->info('Promo banners already exist — skipping.');

            return;
        }

        $banners = [
            ['title' => 'خصم 30%', 'title_en' => '30% off', 'image' => '/promos/banner-1.svg', 'link' => '/shop?search=سماعات', 'sort_order' => 0],
            ['title' => 'شحن مجاني', 'title_en' => 'Free shipping', 'image' => '/promos/banner-2.svg', 'link' => '/shop', 'sort_order' => 1],
            ['title' => 'عروض الأسبوع', 'title_en' => 'Weekly deals', 'image' => '/promos/banner-3.svg', 'link' => '/shop', 'sort_order' => 2],
            ['title' => 'منتجات مميزة', 'title_en' => 'Featured products', 'image' => '/promos/banner-4.svg', 'link' => '/shop', 'sort_order' => 3],
        ];

        foreach ($banners as $banner) {
            PromoBanner::withoutGlobalScopes()->create([
                'merchant_id' => $merchant->id,
                ...$banner,
                'status' => 'active',
            ]);
        }

        $this->command?->info('Promo banners seeded.');
    }
}
