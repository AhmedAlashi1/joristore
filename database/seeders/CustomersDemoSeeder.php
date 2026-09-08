<?php

namespace Database\Seeders;

use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerAddress;
use App\Modules\Merchants\Models\Merchant;
use Illuminate\Database\Seeder;

class CustomersDemoSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();

        if (! $merchant) {
            $this->command?->warn('Demo merchant not found.');

            return;
        }

        if (Customer::withoutGlobalScopes()->where('merchant_id', $merchant->id)->count() >= 5) {
            $this->command?->info('Demo customers already exist — skipping.');

            return;
        }

        $customers = [
            ['first_name' => 'أحمد', 'last_name' => 'العلي', 'email' => 'ahmed@test.com', 'phone' => '0501111111', 'city' => 'الرياض', 'area' => 'العليا'],
            ['first_name' => 'سارة', 'last_name' => 'محمد', 'email' => 'sara@test.com', 'phone' => '0502222222', 'city' => 'جدة', 'area' => 'الروضة'],
            ['first_name' => 'خالد', 'last_name' => 'السعد', 'email' => 'khaled@test.com', 'phone' => '0503333333', 'city' => 'الدمام', 'area' => 'الفيصلية'],
            ['first_name' => 'نورة', 'last_name' => 'القحطاني', 'email' => 'nora@test.com', 'phone' => '0504444444', 'city' => 'مكة', 'area' => 'العزيزية'],
            ['first_name' => 'فهد', 'last_name' => 'الدوسري', 'email' => 'fahad@test.com', 'phone' => '0505555555', 'city' => 'الرياض', 'area' => 'النرجس'],
        ];

        foreach ($customers as $row) {
            $customer = Customer::withoutGlobalScopes()->create([
                'merchant_id' => $merchant->id,
                'first_name' => $row['first_name'],
                'last_name' => $row['last_name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'status' => 'active',
                'orders_count' => 0,
                'total_spent_amount' => 0,
            ]);

            CustomerAddress::create([
                'customer_id' => $customer->id,
                'type' => 'shipping',
                'full_name' => $customer->full_name,
                'phone' => $row['phone'],
                'country_code' => 'SA',
                'city' => $row['city'],
                'area' => $row['area'],
                'street' => 'شارع الملك فهد',
                'building' => '12',
                'is_default' => true,
            ]);
        }

        $this->command?->info('5 demo customers with addresses seeded.');
    }
}
