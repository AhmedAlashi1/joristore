<?php

namespace App\Modules\Customers\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAddress extends Model
{
    protected $fillable = [
        'customer_id', 'delivery_region_id', 'type', 'label', 'full_name', 'phone', 'country_code', 'city',
        'area', 'street', 'building', 'floor', 'apartment', 'postal_code', 'notes', 'is_default',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function deliveryRegion(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Shipping\Models\DeliveryRegion::class, 'delivery_region_id');
    }
}
