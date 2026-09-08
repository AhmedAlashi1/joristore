<?php

namespace App\Modules\Orders\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shipment extends Model
{
    protected $fillable = [
        'merchant_id', 'order_id', 'shipping_method_id', 'provider', 'tracking_number',
        'status', 'shipping_cost_amount', 'shipped_at', 'delivered_at', 'returned_at',
    ];

    protected function casts(): array
    {
        return [
            'shipped_at' => 'datetime', 'delivered_at' => 'datetime', 'returned_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
