<?php

namespace App\Modules\Authentication\Actions;

use App\Models\Role;
use App\Models\User;
use App\Modules\Merchants\Models\Merchant;
use App\Modules\Merchants\Models\MerchantMember;
use App\Modules\Merchants\Models\Store;
use App\Shared\Enums\MerchantMemberStatus;
use App\Shared\Enums\MerchantStatus;
use App\Shared\Enums\StoreStatus;
use App\Shared\Enums\UserStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RegisterMerchantAction
{
    public function execute(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['owner_name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'status' => UserStatus::Active,
            ]);

            $slug = Str::slug($data['business_name']);
            $baseSlug = $slug;
            $counter = 1;
            while (Merchant::where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.$counter++;
            }

            $merchant = Merchant::create([
                'owner_user_id' => $user->id,
                'business_name' => $data['business_name'],
                'slug' => $slug,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'country_code' => $data['country_code'] ?? 'SA',
                'currency' => $data['currency'] ?? 'SAR',
                'timezone' => $data['timezone'] ?? 'Asia/Riyadh',
                'default_language' => $data['default_language'] ?? 'ar',
                'status' => MerchantStatus::Active,
            ]);

            Store::create([
                'merchant_id' => $merchant->id,
                'name' => $data['business_name'],
                'slug' => $slug,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'country_code' => $data['country_code'] ?? 'SA',
                'currency' => $data['currency'] ?? 'SAR',
                'timezone' => $data['timezone'] ?? 'Asia/Riyadh',
                'default_language' => $data['default_language'] ?? 'ar',
                'status' => StoreStatus::Active,
            ]);

            $ownerRole = Role::where('key', 'owner')->where('is_system', true)->firstOrFail();

            $member = MerchantMember::create([
                'merchant_id' => $merchant->id,
                'user_id' => $user->id,
                'role_id' => $ownerRole->id,
                'status' => MerchantMemberStatus::Active,
                'joined_at' => now(),
            ]);

            return compact('user', 'merchant', 'member');
        });
    }
}
