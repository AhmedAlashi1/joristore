<?php

namespace App\Modules\Merchants\Models;

use App\Models\Role;
use App\Models\User;
use App\Shared\Enums\MerchantMemberStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantMember extends Model
{
    protected $fillable = [
        'merchant_id',
        'user_id',
        'role_id',
        'status',
        'invited_by',
        'invited_at',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => MerchantMemberStatus::class,
            'invited_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function isActive(): bool
    {
        return $this->status === MerchantMemberStatus::Active;
    }

    public function isOwner(): bool
    {
        return $this->role?->key === 'owner';
    }
}
