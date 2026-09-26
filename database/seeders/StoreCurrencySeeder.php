<?php

namespace Database\Seeders;

use App\Modules\Merchants\Models\Store;
use App\Shared\Services\StoreSettingService;
use Illuminate\Database\Seeder;

class StoreCurrencySeeder extends Seeder
{
    public function run(): void
    {
        Store::query()->each(function (Store $store) {
            StoreSettingService::setCurrencySymbol($store->id, StoreSettingService::defaultCurrencySymbol());
            if ($store->currency === 'SAR' || $store->currency === null || $store->currency === '') {
                $store->update(['currency' => 'ILS']);
            }
        });

        \App\Modules\Merchants\Models\Merchant::query()
            ->where(function ($q) {
                $q->where('currency', 'SAR')->orWhere('currency', '')->orWhereNull('currency');
            })
            ->update(['currency' => 'ILS']);
    }
}
