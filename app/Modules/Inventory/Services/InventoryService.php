<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\InventoryLocation;
use App\Modules\Inventory\Models\InventoryMovement;
use App\Modules\Orders\Models\Order;
use App\Shared\Services\MerchantContext;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function adjust(int $variantId, int $quantity, string $type = 'manual_add', ?string $reason = null, ?string $refType = null, ?int $refId = null): Inventory
    {
        $merchantId = MerchantContext::merchantId();

        return DB::transaction(function () use ($variantId, $quantity, $type, $reason, $refType, $refId, $merchantId) {
            $location = InventoryLocation::where('merchant_id', $merchantId)->where('is_default', true)->first()
                ?? InventoryLocation::where('merchant_id', $merchantId)->firstOrFail();

            $inventory = Inventory::firstOrCreate(
                ['product_variant_id' => $variantId, 'inventory_location_id' => $location->id],
                ['merchant_id' => $merchantId, 'quantity' => 0, 'reserved_quantity' => 0]
            );

            $before = $inventory->quantity;
            $after = max(0, $before + $quantity);
            $inventory->update(['quantity' => $after]);

            InventoryMovement::create([
                'merchant_id' => $merchantId,
                'product_variant_id' => $variantId,
                'inventory_location_id' => $location->id,
                'type' => $type,
                'quantity' => $quantity,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reference_type' => $refType,
                'reference_id' => $refId,
                'reason' => $reason,
                'created_by' => auth()->id(),
                'created_at' => now(),
            ]);

            return $inventory->fresh();
        });
    }

    public function reserveForOrder(int $variantId, int $qty, int $orderId): void
    {
        $this->adjust($variantId, -$qty, 'sale', 'Order sale', Order::class, $orderId);
    }
}
