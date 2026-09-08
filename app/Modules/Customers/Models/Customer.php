<?php

namespace App\Modules\Customers\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToMerchant, SoftDeletes;

    protected $fillable = [
        'merchant_id', 'first_name', 'last_name', 'email', 'phone', 'gender',
        'birth_date', 'status', 'orders_count', 'total_spent_amount', 'last_order_at', 'notes',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date', 'last_order_at' => 'datetime'];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(\App\Modules\Orders\Models\Order::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.($this->last_name ?? ''));
    }
}
