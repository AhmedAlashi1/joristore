<?php

namespace App\Modules\Shipping\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryStreet extends Model
{
    protected $fillable = [
        'delivery_region_id', 'name', 'price_amount', 'status',
    ];

    public function region(): BelongsTo
    {
        return $this->belongsTo(DeliveryRegion::class, 'delivery_region_id');
    }
}
