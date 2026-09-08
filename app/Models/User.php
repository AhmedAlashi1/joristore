<?php

namespace App\Models;

use App\Modules\Merchants\Models\Merchant;
use App\Modules\Merchants\Models\MerchantMember;
use App\Shared\Enums\UserStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'avatar',
        'status',
        'email_verified_at',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'status' => UserStatus::class,
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function ownedMerchant(): HasOne
    {
        return $this->hasOne(Merchant::class, 'owner_user_id');
    }

    public function merchantMembers(): HasMany
    {
        return $this->hasMany(MerchantMember::class);
    }

    public function activeMerchantMember(): ?MerchantMember
    {
        return $this->merchantMembers()
            ->where('status', 'active')
            ->with(['merchant.store', 'role.permissions'])
            ->first();
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }
}
