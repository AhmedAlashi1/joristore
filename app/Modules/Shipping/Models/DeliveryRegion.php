<?php

namespace App\Modules\Shipping\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryRegion extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id', 'slug', 'name', 'name_en', 'price_amount', 'sort_order', 'status',
    ];

    public function streets(): HasMany
    {
        return $this->hasMany(DeliveryStreet::class);
    }
}
