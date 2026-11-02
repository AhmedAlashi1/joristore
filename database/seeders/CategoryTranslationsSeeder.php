<?php

namespace Database\Seeders;

use App\Modules\Catalog\Models\Category;
use App\Modules\Merchants\Models\Merchant;
use Illuminate\Database\Seeder;

/** Fill name_en / description_en on existing demo categories (no catalog wipe). */
class CategoryTranslationsSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();
        if (! $merchant) {
            $this->command?->warn('Merchant jori-store not found.');

            return;
        }

        /** @var array{parents: array<string, array{0: string, 1: string}>, children: array<string, array{0: string, 1: string}>} $map */
        $map = require __DIR__.'/data/category_english.php';

        $parents = Category::withoutGlobalScopes()
            ->where('merchant_id', $merchant->id)
            ->whereNull('parent_id')
            ->get()
            ->keyBy('name');

        $updated = 0;

        foreach ($parents as $parentName => $parent) {
            $parentEn = $map['parents'][$parentName] ?? null;
            if ($parentEn) {
                $parent->update([
                    'name_en' => $parentEn[0],
                    'description_en' => $parentEn[1],
                ]);
                $updated++;
            }

            $children = Category::withoutGlobalScopes()
                ->where('merchant_id', $merchant->id)
                ->where('parent_id', $parent->id)
                ->get();

            foreach ($children as $child) {
                $key = $parentName.'|'.$child->name;
                $childEn = $map['children'][$key] ?? null;
                if (! $childEn) {
                    continue;
                }
                $child->update([
                    'name_en' => $childEn[0],
                    'description_en' => $childEn[1],
                ]);
                $updated++;
            }
        }

        $this->command?->info("Category English fields updated ({$updated} categories).");
    }
}
