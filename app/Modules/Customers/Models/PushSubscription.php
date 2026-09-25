<?php

namespace App\Modules\Customers\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id',
        'customer_id',
        'endpoint',
        'public_key',
        'auth_token',
        'content_encoding',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
