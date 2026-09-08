<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'guard_name',
        'merchant_id',
        'key',
        'description',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Merchants\Models\Merchant::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(\App\Modules\Merchants\Models\MerchantMember::class);
    }

    public function isOwnerRole(): bool
    {
        return $this->key === 'owner';
    }

    public function permissionKeys(): BelongsToMany
    {
        return $this->permissions();
    }
}
