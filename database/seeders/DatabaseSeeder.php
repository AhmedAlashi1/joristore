<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            MerchantPermissionSeeder::class,
            SystemRolesSeeder::class,
            DemoMerchantSeeder::class,
            PromoBannersDemoSeeder::class,
            CatalogDemoSeeder::class,
            CustomersDemoSeeder::class,
            LegalDemoSeeder::class,
        ]);
    }
}
