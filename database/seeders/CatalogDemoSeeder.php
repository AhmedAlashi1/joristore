<?php

namespace Database\Seeders;

use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\InventoryLocation;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Merchants\Models\Merchant;
use App\Modules\Shipping\Models\ShippingMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogDemoSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();

        if (! $merchant) {
            $this->command?->warn('Demo merchant not found — run DemoMerchantSeeder first.');

            return;
        }

        $merchantId = $merchant->id;

        ShippingMethod::withoutGlobalScopes()->firstOrCreate(
            ['merchant_id' => $merchantId, 'name' => 'توصيل عادي'],
            [
                'type' => 'flat',
                'price_amount' => 1500,
                'free_shipping_minimum' => 20000,
                'estimated_days_min' => 2,
                'estimated_days_max' => 5,
                'status' => 'active',
            ]
        );

        $this->wipeMerchantCatalog($merchantId);

        $location = InventoryLocation::withoutGlobalScopes()->firstOrCreate(
            ['merchant_id' => $merchantId, 'is_default' => true],
            ['name' => 'Main Warehouse', 'code' => 'MAIN', 'status' => 'active']
        );

        (new StoreBrandsSeeder)->run();
        $brands = Brand::withoutGlobalScopes()
            ->where('merchant_id', $merchantId)
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->keyBy('id');
        $brandIds = $brands->keys()->all();

        $tree = [
            [
                'name' => 'ملابس رجالية',
                'slug' => 'men-apparel',
                'image' => '/categories/fashion.svg',
                'children' => [
                    'أطقم رياضية',
                    'تيشيرتات',
                    'بناطيل رياضية',
                    'شورتات',
                    'هوديز وسويت شيرت',
                    'جاكيتات',
                    'ملابس ضاغطة',
                    'ملابس داخلية',
                ],
            ],
            [
                'name' => 'ملابس نسائية',
                'slug' => 'women-apparel',
                'image' => '/categories/fashion.svg',
                'children' => [
                    'أطقم رياضية',
                    'تيشيرتات وتوبات',
                    'ليغنز وبناطيل',
                    'شورتات',
                    'جاكيتات وهوديز',
                    'ملابس رياضية محتشمة',
                ],
            ],
            [
                'name' => 'أحذية',
                'slug' => 'footwear',
                'image' => '/categories/sports.svg',
                'children' => [
                    'أحذية كرة قدم',
                    'أحذية ملاعب وصالات',
                    'أحذية جري',
                    'أحذية مشي',
                    'أحذية تدريب وجيم',
                    'سنيكرز',
                    'شباشب وصنادل',
                ],
            ],
            [
                'name' => 'أدوات رياضية',
                'slug' => 'sports-equipment',
                'image' => '/categories/sports.svg',
                'children' => [
                    'كرات',
                    'أدوات لياقة منزلية',
                    'أوزان ودامبلز',
                    'حبال مقاومة',
                    'حبال قفز',
                    'حصائر تمارين',
                    'أدوات تدريب كرة القدم',
                ],
            ],
            [
                'name' => 'إكسسوارات رياضية',
                'slug' => 'sports-accessories',
                'image' => '/categories/fashion.svg',
                'children' => [
                    'حقائب رياضية',
                    'قفازات جيم',
                    'قفازات حارس مرمى',
                    'واقيات ساق',
                    'دعامات رياضية',
                    'زجاجات مياه',
                ],
            ],
            [
                'name' => 'الجرابين والطواقي',
                'slug' => 'socks-caps',
                'image' => '/categories/fashion.svg',
                'children' => [
                    'جرابين رياضية',
                    'جرابين كرة قدم',
                    'جرابين تدريب',
                    'طواقي',
                    'قبعات رياضية',
                    'شباشب جراب',
                ],
            ],
            [
                'name' => 'ملابس الفرق والأندية',
                'slug' => 'teams-clubs',
                'image' => '/categories/sports.svg',
                'children' => [
                    'أطقم أندية',
                    'أطقم منتخبات',
                    'ملابس تدريب',
                ],
            ],
        ];

        $sort = 0;
        $productCount = 0;
        $priceBase = 49;

        foreach ($tree as $dept) {
            $parent = Category::withoutGlobalScopes()->create([
                'merchant_id' => $merchantId,
                'name' => $dept['name'],
                'slug' => $dept['slug'],
                'image' => $dept['image'],
                'description' => $dept['name'].' — معرض عالم الرياضة',
                'status' => 'active',
                'sort_order' => $sort++,
            ]);

            $childSort = 0;
            foreach ($dept['children'] as $childName) {
                $childSlug = $dept['slug'].'-'.Str::slug($childName);
                $child = Category::withoutGlobalScopes()->create([
                    'merchant_id' => $merchantId,
                    'parent_id' => $parent->id,
                    'name' => $childName,
                    'slug' => $childSlug,
                    'image' => null,
                    'description' => $childName.' — '.$dept['name'],
                    'status' => 'active',
                    'sort_order' => $childSort++,
                ]);

                $price = $priceBase + ($childSort * 7) + ($sort * 3);
                $demoColors = [
                    ['name' => 'أسود', 'hex' => '#1a1a1a'],
                    ['name' => 'أبيض', 'hex' => '#f5f5f5'],
                    ['name' => 'كحلي', 'hex' => '#1e3a5f'],
                    ['name' => 'رمادي', 'hex' => '#8a8da8'],
                ];
                $color = $demoColors[($childSort + $sort) % count($demoColors)];
                $brandId = $brandIds[($childSort + $sort) % max(1, count($brandIds))] ?? null;

                $productCount += $this->seedProduct(
                    $merchantId,
                    $location,
                    $brandId,
                    $child,
                    [
                        'name' => $childName.' — تشكيلة مميزة',
                        'price' => (float) $price,
                        'compare' => $price + 25,
                        'featured' => $childSort <= 2,
                        'qty' => 30 + ($childSort * 5),
                        'color_name' => $color['name'],
                        'color_hex' => $color['hex'],
                        'sizes' => ['S', 'M', 'L', 'XL'],
                    ],
                    $childSort,
                );

                $productCount += $this->seedProduct(
                    $merchantId,
                    $location,
                    $brandId,
                    $child,
                    [
                        'name' => $childName.' — إصدار Pro',
                        'price' => (float) ($price + 15),
                        'compare' => null,
                        'featured' => false,
                        'qty' => 20,
                        'color_name' => $demoColors[($childSort + 1) % count($demoColors)]['name'],
                        'color_hex' => $demoColors[($childSort + 1) % count($demoColors)]['hex'],
                        'sizes' => ['M', 'L'],
                    ],
                    $childSort + 10,
                );
            }
        }

        $this->command?->info("Catalog demo: sports-world tree seeded ({$productCount} products).");
    }

    protected function wipeMerchantCatalog(int $merchantId): void
    {
        $productIds = Product::withoutGlobalScopes()->where('merchant_id', $merchantId)->pluck('id');
        if ($productIds->isNotEmpty()) {
            ProductVariant::withoutGlobalScopes()->whereIn('product_id', $productIds)->delete();
            Inventory::withoutGlobalScopes()->where('merchant_id', $merchantId)->delete();
            Product::withoutGlobalScopes()->where('merchant_id', $merchantId)->forceDelete();
        }
        Category::withoutGlobalScopes()->where('merchant_id', $merchantId)->forceDelete();
    }

    /**
     * @param  array{name: string, price: float, compare?: float|null, featured: bool, qty: int, color_name?: string, color_hex?: string, sizes?: string[]}  $item
     */
    protected function seedProduct(
        int $merchantId,
        InventoryLocation $location,
        ?int $brandId,
        Category $category,
        array $item,
        int $index,
    ): int {
        $slug = Str::slug($item['name']).'-'.$category->id.'-'.$index;

        $product = Product::withoutGlobalScopes()->create([
            'merchant_id' => $merchantId,
            'category_id' => $category->id,
            'brand_id' => $brandId,
            'color_name' => $item['color_name'] ?? null,
            'color_hex' => $item['color_hex'] ?? null,
            'name' => $item['name'],
            'slug' => $slug,
            'product_type' => 'simple',
            'status' => 'active',
            'short_description' => 'من معرض عالم الرياضة',
            'description' => $item['name'].' — '.$category->name.'. جودة عالية للاستخدام الرياضي.',
            'featured' => $item['featured'],
            'published_at' => now(),
        ]);

        $sizes = $item['sizes'] ?? [];
        if ($sizes === []) {
            $sizes = ['Default'];
        }

        foreach ($sizes as $i => $sizeName) {
            $variant = ProductVariant::withoutGlobalScopes()->create([
                'product_id' => $product->id,
                'merchant_id' => $merchantId,
                'name' => $sizeName,
                'sku' => 'SW-'.strtoupper(Str::random(6)),
                'price_amount' => (int) round($item['price'] * 100),
                'compare_at_price_amount' => isset($item['compare']) ? (int) round($item['compare'] * 100) : null,
                'is_default' => $i === 0,
                'status' => 'active',
            ]);

            Inventory::withoutGlobalScopes()->create([
                'merchant_id' => $merchantId,
                'product_variant_id' => $variant->id,
                'inventory_location_id' => $location->id,
                'quantity' => max(1, (int) floor($item['qty'] / count($sizes))),
                'reserved_quantity' => 0,
                'low_stock_threshold' => 5,
                'allow_backorder' => false,
            ]);
        }

        return 1;
    }
}
