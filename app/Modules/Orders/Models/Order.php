<?php

namespace App\Modules\Orders\Models;

use App\Modules\Customers\Models\Customer;
use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id', 'customer_id', 'order_number', 'status', 'payment_status', 'shipping_status',
        'currency', 'subtotal_amount', 'discount_amount', 'shipping_amount', 'tax_amount', 'total_amount',
        'customer_name', 'customer_email', 'customer_phone', 'customer_note', 'admin_note', 'source',
        'placed_at', 'confirmed_at', 'completed_at', 'canceled_at',
    ];

    protected function casts(): array
    {
        return [
            'placed_at' => 'datetime', 'confirmed_at' => 'datetime',
            'completed_at' => 'datetime', 'canceled_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(OrderAddress::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }
}
