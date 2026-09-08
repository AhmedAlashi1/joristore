<?php

namespace App\Modules\Merchants\Models;

use App\Shared\Enums\StoreStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    protected $fillable = [
        'merchant_id',
        'name',
        'slug',
        'description',
        'logo',
        'favicon',
        'email',
        'phone',
        'country_code',
        'currency',
        'timezone',
        'default_language',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => StoreStatus::class,
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(StoreSetting::class);
    }
}
