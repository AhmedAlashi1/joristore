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

        if (Product::withoutGlobalScopes()->where('merchant_id', $merchantId)->exists()) {
            $this->command?->info('Catalog demo data already exists — skipping.');

            return;
        }

        // Clean orphan categories/brands from partial seeds
        Category::withoutGlobalScopes()->where('merchant_id', $merchantId)->delete();
        Brand::withoutGlobalScopes()->where('merchant_id', $merchantId)->delete();

        $location = InventoryLocation::withoutGlobalScopes()->firstOrCreate(
            ['merchant_id' => $merchantId, 'is_default' => true],
            ['name' => 'Main Warehouse', 'code' => 'MAIN', 'status' => 'active']
        );

        $brands = [];
        foreach (['Jori', 'Premium', 'Essentials', 'Nova'] as $name) {
            $brands[$name] = Brand::withoutGlobalScopes()->create([
                'merchant_id' => $merchantId,
                'name' => $name,
                'slug' => Str::slug($name),
                'status' => 'active',
            ]);
        }

        $catalog = [
            [
                'name' => 'إلكترونيات',
                'slug' => 'electronics',
                'image' => '/categories/electronics.svg',
                'products' => [
                    ['name' => 'سماعات بلوتوث لاسلكية', 'price' => 149.00, 'compare' => 199.00, 'featured' => true, 'qty' => 45],
                    ['name' => 'شاحن سريع 65W', 'price' => 89.00, 'compare' => 120.00, 'featured' => true, 'qty' => 80],
                    ['name' => 'ساعة ذكية رياضية', 'price' => 299.00, 'compare' => 399.00, 'featured' => false, 'qty' => 25],
                    ['name' => 'حامل جوال للسيارة', 'price' => 45.00, 'compare' => null, 'featured' => false, 'qty' => 120],
                ],
            ],
            [
                'name' => 'أزياء',
                'slug' => 'fashion',
                'image' => '/categories/fashion.svg',
                'products' => [
                    ['name' => 'قميص قطني كلاسيك', 'price' => 79.00, 'compare' => 99.00, 'featured' => true, 'qty' => 60],
                    ['name' => 'حذاء رياضي مريح', 'price' => 249.00, 'compare' => 320.00, 'featured' => true, 'qty' => 35],
                    ['name' => 'حقيبة ظهر عصرية', 'price' => 129.00, 'compare' => null, 'featured' => false, 'qty' => 40],
                    ['name' => 'نظارة شمسية UV400', 'price' => 59.00, 'compare' => 85.00, 'featured' => false, 'qty' => 90],
                ],
            ],
            [
                'name' => 'منزل ومطبخ',
                'slug' => 'home-kitchen',
                'image' => '/categories/home-kitchen.svg',
                'products' => [
                    ['name' => 'طقم أواني طبخ 5 قطع', 'price' => 189.00, 'compare' => 240.00, 'featured' => true, 'qty' => 30],
                    ['name' => 'خلاط كهربائي 800W', 'price' => 159.00, 'compare' => null, 'featured' => false, 'qty' => 22],
                    ['name' => 'مكتب LED قابل للطي', 'price' => 119.00, 'compare' => 150.00, 'featured' => false, 'qty' => 18],
                    ['name' => 'مجموعة أكواب زجاج', 'price' => 49.00, 'compare' => null, 'featured' => false, 'qty' => 100],
                ],
            ],
            [
                'name' => 'جمال وعناية',
                'slug' => 'beauty',
                'image' => '/categories/beauty.svg',
                'products' => [
                    ['name' => 'سيرum فيتامين C', 'price' => 69.00, 'compare' => 95.00, 'featured' => true, 'qty' => 55],
                    ['name' => 'مجموعة عناية بالبشرة', 'price' => 139.00, 'compare' => 180.00, 'featured' => true, 'qty' => 28],
                    ['name' => 'عطر فاخر 100ml', 'price' => 199.00, 'compare' => 260.00, 'featured' => false, 'qty' => 20],
                    ['name' => 'فرشاة شعر احترافية', 'price' => 39.00, 'compare' => null, 'featured' => false, 'qty' => 75],
                ],
            ],
            [
                'name' => 'رياضة',
                'slug' => 'sports',
                'image' => '/categories/sports.svg',
                'products' => [
                    ['name' => 'دامبل قابل للتعديل 20kg', 'price' => 279.00, 'compare' => 350.00, 'featured' => true, 'qty' => 15],
                    ['name' => 'حصيرة يoga مضادة للانزلاق', 'price' => 89.00, 'compare' => null, 'featured' => false, 'qty' => 50],
                    ['name' => 'زجاجة ماء رياضية 1L', 'price' => 29.00, 'compare' => 45.00, 'featured' => false, 'qty' => 200],
                    ['name' => 'قفازات جيم', 'price' => 35.00, 'compare' => null, 'featured' => false, 'qty' => 85],
                ],
            ],
        ];

        $brandKeys = array_keys($brands);
        $sort = 0;

        foreach ($catalog as $group) {
            $category = Category::withoutGlobalScopes()->create([
                'merchant_id' => $merchantId,
                'name' => $group['name'],
                'slug' => $group['slug'],
                'image' => $group['image'] ?? null,
                'description' => 'تشكيلة '.$group['name'].' من Jori Store',
                'status' => 'active',
                'sort_order' => $sort++,
            ]);

            foreach ($group['products'] as $i => $item) {
                $slug = Str::slug($item['name']).'-'.$i;
                $brand = $brands[$brandKeys[$i % count($brandKeys)]];

                $product = Product::withoutGlobalScopes()->create([
                    'merchant_id' => $merchantId,
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'name' => $item['name'],
                    'slug' => $slug,
                    'product_type' => 'simple',
                    'status' => 'active',
                    'short_description' => 'منتج عالي الجودة من متجر جوري',
                    'description' => 'تفاصيل المنتج: '.$item['name'].'. مناسب للاستخدام اليومي مع ضمان الجودة.',
                    'featured' => $item['featured'],
                    'published_at' => now(),
                ]);

                $variant = ProductVariant::withoutGlobalScopes()->create([
                    'product_id' => $product->id,
                    'merchant_id' => $merchantId,
                    'name' => 'Default',
                    'sku' => 'JORI-'.strtoupper(Str::random(6)),
                    'price_amount' => (int) round($item['price'] * 100),
                    'compare_at_price_amount' => isset($item['compare']) ? (int) round($item['compare'] * 100) : null,
                    'is_default' => true,
                    'status' => 'active',
                ]);

                Inventory::withoutGlobalScopes()->create([
                    'merchant_id' => $merchantId,
                    'product_variant_id' => $variant->id,
                    'inventory_location_id' => $location->id,
                    'quantity' => $item['qty'],
                    'reserved_quantity' => 0,
                    'low_stock_threshold' => 5,
                    'allow_backorder' => false,
                ]);
            }
        }

        $this->command?->info('Catalog demo: 5 categories, 20 products seeded.');
    }
}
