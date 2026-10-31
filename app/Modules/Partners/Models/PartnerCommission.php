<?php

namespace App\Modules\Partners\Models;

use App\Modules\Orders\Models\Order;
use App\Modules\Promotions\Models\Coupon;
use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerCommission extends Model
{
    use BelongsToMerchant;

    public $timestamps = false;

    protected $fillable = [
        'merchant_id', 'partner_id', 'order_id', 'coupon_id',
        'order_subtotal_amount', 'commission_amount', 'status', 'partner_payout_id', 'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function payout(): BelongsTo
    {
        return $this->belongsTo(PartnerPayout::class, 'partner_payout_id');
    }
}
