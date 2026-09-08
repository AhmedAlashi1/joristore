<?php

namespace App\Modules\Inventory\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    use BelongsToMerchant;

    public $timestamps = false;

    protected $fillable = [
        'merchant_id', 'product_variant_id', 'inventory_location_id', 'type',
        'quantity', 'quantity_before', 'quantity_after', 'reference_type',
        'reference_id', 'reason', 'created_by', 'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Catalog\Models\ProductVariant::class, 'product_variant_id');
    }
}
