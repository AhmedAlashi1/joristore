<?php

namespace Database\Seeders;

use App\Modules\Catalog\Models\Category;
use App\Modules\Merchants\Models\Merchant;
use Illuminate\Database\Seeder;

class CategoryImagesDemoSeeder extends Seeder
{
    /** @var array<string, string> */
    protected array $images = [
        'electronics' => '/categories/electronics.svg',
        'fashion' => '/categories/fashion.svg',
        'home-kitchen' => '/categories/home-kitchen.svg',
        'beauty' => '/categories/beauty.svg',
        'sports' => '/categories/sports.svg',
    ];

    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();

        if (! $merchant) {
            $this->command?->warn('Demo merchant not found.');

            return;
        }

        foreach ($this->images as $slug => $image) {
            Category::withoutGlobalScopes()
                ->where('merchant_id', $merchant->id)
                ->where('slug', $slug)
                ->whereNull('image')
                ->update(['image' => $image]);
        }

        $this->command?->info('Category images updated.');
    }
}
