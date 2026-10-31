<?php

namespace App\Modules\Partners\Models;

use App\Models\User;
use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartnerPayout extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id', 'partner_id', 'amount', 'receipt_path', 'admin_note', 'created_by', 'paid_at',
    ];

    protected function casts(): array
    {
        return ['paid_at' => 'datetime'];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(PartnerCommission::class, 'partner_payout_id');
    }
}
