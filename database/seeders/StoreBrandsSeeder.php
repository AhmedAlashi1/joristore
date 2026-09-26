<?php

namespace Database\Seeders;

use App\Modules\Catalog\Models\Brand;
use App\Modules\Merchants\Models\Merchant;
use Illuminate\Database\Seeder;

class StoreBrandsSeeder extends Seeder
{
    /** @return array<int, array{name: string, slug: string}> */
    public static function brandDefinitions(): array
    {
        return [
            ['name' => 'Adidas', 'slug' => 'adidas'],
            ['name' => 'Nike', 'slug' => 'nike'],
            ['name' => 'Under Armour', 'slug' => 'under-armour'],
            ['name' => 'Tommy Life', 'slug' => 'tommy-life'],
        ];
    }

    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();
        if (! $merchant) {
            $this->command?->warn('Demo merchant not found — skip StoreBrandsSeeder.');

            return;
        }

        foreach (self::brandDefinitions() as $brand) {
            Brand::withoutGlobalScopes()->updateOrCreate(
                ['merchant_id' => $merchant->id, 'slug' => $brand['slug']],
                ['name' => $brand['name'], 'status' => 'active']
            );
        }

        $this->command?->info('Store brands ensured (Adidas, Nike, Under Armour, Tommy Life).');
    }
}
