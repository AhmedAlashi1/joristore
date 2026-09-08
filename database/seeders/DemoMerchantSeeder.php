<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Authentication\Actions\RegisterMerchantAction;
use App\Shared\Enums\UserStatus;
use Illuminate\Database\Seeder;

class DemoMerchantSeeder extends Seeder
{
    public function run(): void
    {
        if (User::where('email', 'admin@admin.net')->exists()) {
            return;
        }

        app(RegisterMerchantAction::class)->execute([
            'owner_name' => 'Store Owner',
            'business_name' => 'Jori Store',
            'email' => 'admin@admin.net',
            'phone' => null,
            'password' => '123456',
            'country_code' => 'SA',
            'currency' => 'SAR',
            'default_language' => 'ar',
        ]);
    }
}
