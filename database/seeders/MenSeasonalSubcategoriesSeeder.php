<?php

namespace Database\Seeders;

use App\Modules\Catalog\Models\Category;
use App\Modules\Merchants\Models\Merchant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Adds men's seasonal subcategories without wiping the catalog. */
class MenSeasonalSubcategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();
        if (! $merchant) {
            $this->command?->warn('Merchant jori-store not found.');

            return;
        }

        $parent = Category::withoutGlobalScopes()
            ->where('merchant_id', $merchant->id)
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('slug', 'men-apparel')->orWhere('name', 'ملابس رجالية');
            })
            ->first();

        if (! $parent) {
            $this->command?->warn('Parent category «ملابس رجالية» not found.');

            return;
        }

        /** @var array{children: array<string, array{0: string, 1: string}>} $en */
        $en = require __DIR__.'/data/category_english.php';

        $children = [
            'طقم شتوي',
            'طقم صيفي',
            'طقم خريفي',
            'بلوزة خريفي',
            'بلوزة شتوي',
        ];

        $maxSort = (int) Category::withoutGlobalScopes()
            ->where('merchant_id', $merchant->id)
            ->where('parent_id', $parent->id)
            ->max('sort_order');

        $added = 0;
        $sort = $maxSort;

        foreach ($children as $name) {
            $slug = 'men-apparel-'.Str::slug($name);
            $exists = Category::withoutGlobalScopes()
                ->where('merchant_id', $merchant->id)
                ->where('parent_id', $parent->id)
                ->where(function ($q) use ($name, $slug) {
                    $q->where('name', $name)->orWhere('slug', $slug);
                })
                ->exists();

            if ($exists) {
                continue;
            }

            $sort++;
            $key = $parent->name.'|'.$name;
            $pair = $en['children'][$key] ?? null;

            Category::withoutGlobalScopes()->create([
                'merchant_id' => $merchant->id,
                'parent_id' => $parent->id,
                'name' => $name,
                'name_en' => $pair[0] ?? null,
                'slug' => $slug,
                'description' => $name.' — '.$parent->name,
                'description_en' => $pair[1] ?? null,
                'status' => 'active',
                'sort_order' => $sort,
            ]);
            $added++;
        }

        $this->command?->info("Men's seasonal subcategories: {$added} added under «{$parent->name}».");
    }
}
