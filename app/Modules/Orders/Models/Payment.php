<?php

namespace App\Modules\Orders\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'merchant_id', 'order_id', 'payment_method', 'payment_provider', 'provider_reference',
        'status', 'amount', 'currency', 'paid_at', 'failed_at', 'metadata',
    ];

    protected function casts(): array
    {
        return ['paid_at' => 'datetime', 'failed_at' => 'datetime', 'metadata' => 'array'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
