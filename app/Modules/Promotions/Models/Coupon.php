<?php

namespace App\Modules\Promotions\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id', 'code', 'name', 'type', 'value', 'minimum_order_amount',
        'maximum_discount_amount', 'usage_limit', 'usage_limit_per_customer',
        'used_count', 'starts_at', 'expires_at', 'status', 'created_by',
    ];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'expires_at' => 'datetime'];
    }
}
