<?php

namespace Database\Seeders;

use App\Modules\Shipping\Models\DeliveryRegion;
use App\Modules\Shipping\Models\DeliveryStreet;
use App\Shared\Helpers\MoneyHelper;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeliveryRegionsSeeder extends Seeder
{
    public function run(): void
    {
        $merchantId = (int) DB::table('merchants')->value('id');
        if (! $merchantId) {
            return;
        }

        $regions = [
            ['slug' => 'gaza', 'name' => 'غزة', 'name_en' => 'Gaza', 'price' => 10, 'sort' => 1],
            ['slug' => 'khan-yunis', 'name' => 'خانيونس', 'name_en' => 'Khan Yunis', 'price' => 20, 'sort' => 2],
            ['slug' => 'nuseirat', 'name' => 'النصيرات', 'name_en' => 'Nuseirat', 'price' => 20, 'sort' => 3],
            ['slug' => 'maghazi', 'name' => 'المغازي', 'name_en' => 'Maghazi', 'price' => 20, 'sort' => 4],
            ['slug' => 'bureij', 'name' => 'البريج', 'name_en' => 'Al-Bureij', 'price' => 20, 'sort' => 5],
            ['slug' => 'north-gaza', 'name' => 'شمال غزة', 'name_en' => 'North Gaza', 'price' => 15, 'sort' => 6],
            ['slug' => 'deir-al-balah', 'name' => 'دير البلح', 'name_en' => 'Deir al-Balah', 'price' => 20, 'sort' => 7],
            ['slug' => 'zawayda', 'name' => 'الزوايدة', 'name_en' => 'Al-Zawayda', 'price' => 20, 'sort' => 8],
        ];

        $activeSlugs = [];

        foreach ($regions as $row) {
            $activeSlugs[] = $row['slug'];
            DeliveryRegion::query()->updateOrCreate(
                ['merchant_id' => $merchantId, 'slug' => $row['slug']],
                [
                    'name' => $row['name'],
                    'name_en' => $row['name_en'],
                    'price_amount' => MoneyHelper::toMinor($row['price']),
                    'sort_order' => $row['sort'],
                    'status' => 'active',
                ],
            );
        }

        DeliveryRegion::query()
            ->where('merchant_id', $merchantId)
            ->whereNotIn('slug', $activeSlugs)
            ->update(['status' => 'inactive']);

        $regionIds = DeliveryRegion::query()
            ->where('merchant_id', $merchantId)
            ->pluck('id');

        DeliveryStreet::query()->whereIn('delivery_region_id', $regionIds)->delete();
    }
}
