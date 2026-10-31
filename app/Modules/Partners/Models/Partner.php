<?php

namespace App\Modules\Partners\Models;

use App\Modules\Catalog\Models\Gym;
use App\Modules\Promotions\Models\Coupon;
use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Partner extends Model
{
    use BelongsToMerchant, SoftDeletes;

    protected $fillable = [
        'merchant_id', 'gym_id', 'name', 'name_en', 'contact_phone', 'contact_email',
        'city', 'notes', 'status', 'default_commission_type', 'default_commission_value',
    ];

    public function gym(): BelongsTo
    {
        return $this->belongsTo(Gym::class);
    }

    public function account(): HasOne
    {
        return $this->hasOne(PartnerAccount::class);
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class);
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(PartnerCommission::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(PartnerPayout::class);
    }
}
