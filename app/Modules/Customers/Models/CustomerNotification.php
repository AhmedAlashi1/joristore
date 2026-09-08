<?php

namespace App\Modules\Customers\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerNotification extends Model
{
    use BelongsToMerchant;

    public $timestamps = false;

    protected $fillable = [
        'merchant_id', 'customer_id', 'title', 'message', 'type', 'data', 'read_at', 'created_at',
    ];

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime', 'created_at' => 'datetime'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
