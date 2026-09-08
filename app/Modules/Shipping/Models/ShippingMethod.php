<?php

namespace App\Modules\Shipping\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;

class ShippingMethod extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id', 'name', 'type', 'price_amount', 'free_shipping_minimum',
        'estimated_days_min', 'estimated_days_max', 'status',
    ];
}
