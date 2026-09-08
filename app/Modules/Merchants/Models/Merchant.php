<?php

namespace App\Modules\Merchants\Models;

use App\Models\User;
use App\Shared\Enums\MerchantStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Merchant extends Model
{
    protected $fillable = [
        'owner_user_id',
        'business_name',
        'slug',
        'legal_name',
        'email',
        'phone',
        'logo',
        'commercial_registration_number',
        'tax_number',
        'country_code',
        'currency',
        'timezone',
        'default_language',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => MerchantStatus::class,
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function store(): HasOne
    {
        return $this->hasOne(Store::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(MerchantMember::class);
    }
}
