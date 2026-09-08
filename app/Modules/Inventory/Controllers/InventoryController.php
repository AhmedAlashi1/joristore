<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Inventory\Models\InventoryMovement;
use App\Modules\Inventory\Services\InventoryService;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InventoryController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected ActivityLogService $activityLog,
    ) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));
        $lowStock = $request->boolean('low_stock');

        $query = Inventory::query()
            ->with(['variant.product', 'location'])
            ->where('merchant_id', MerchantContext::merchantId());

        if ($search !== '') {
            $query->whereHas('variant.product', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }
        if ($lowStock) {
            $query->whereColumn('quantity', '<=', 'low_stock_threshold');
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(function (Inventory $inv) {
            return [
                'id' => $inv->id,
                'product_name' => $inv->variant?->product?->name,
                'variant_id' => $inv->product_variant_id,
                'sku' => $inv->variant?->sku,
                'quantity' => $inv->quantity,
                'reserved_quantity' => $inv->reserved_quantity,
                'available' => $inv->available_quantity,
                'low_stock_threshold' => $inv->low_stock_threshold,
                'location' => $inv->location?->name,
            ];
        });

        return sendResponse($paginator, 'Inventory fetched');
    }

    public function adjust(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'variant_id' => 'required|integer|exists:product_variants,id',
            'quantity' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $type = $data['quantity'] >= 0 ? 'manual_add' : 'manual_remove';

        $this->inventoryService->adjust(
            $data['variant_id'],
            $data['quantity'],
            $type,
            $data['reason'] ?? 'Manual adjustment',
        );

        $this->activityLog->log('inventory.adjusted', 'inventory', 'Inventory adjusted', request: $request);

        return sendResponse([], 'Inventory adjusted');
    }

    public function movements(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));

        $paginator = InventoryMovement::query()
            ->with(['variant.product'])
            ->where('merchant_id', MerchantContext::merchantId())
            ->latest('created_at')
            ->paginate($perPage);

        return sendResponse($paginator, 'Movements fetched');
    }
}
