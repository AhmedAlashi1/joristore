<?php

namespace App\Modules\Orders\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Customers\Models\Customer;
use App\Modules\Dashboard\Models\Notification;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Orders\Models\Order;
use App\Modules\Orders\Models\OrderAddress;
use App\Modules\Orders\Models\OrderItem;
use App\Modules\Orders\Models\OrderStatusHistory;
use App\Modules\Orders\Models\Payment;
use App\Modules\Orders\Models\Shipment;
use App\Modules\Shipping\Models\ShippingMethod;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected ActivityLogService $activityLog,
    ) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status');

        $query = Order::query()->with('customer')->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }
        if ($status) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Order $o) => $this->formatList($o));

        return sendResponse($paginator, 'Orders fetched');
    }

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|integer|exists:customers,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string|max:20',
            'customer_note' => 'nullable|string',
            'admin_note' => 'nullable|string',
            'payment_method' => 'nullable|in:cash_on_delivery,bank_transfer,card,wallet',
            'shipping_method_id' => 'nullable|integer|exists:shipping_methods,id',
            'status' => 'nullable|in:pending,confirmed,processing,ready,shipped,completed',
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'address' => 'nullable|array',
            'address.city' => 'required_with:address|string',
            'address.full_name' => 'required_with:address|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        $order = DB::transaction(function () use ($data, $merchantId) {
            $subtotal = 0;
            $orderItems = [];

            foreach ($data['items'] as $item) {
                $variant = ProductVariant::with('product')->findOrFail($item['product_variant_id']);
                if ($variant->merchant_id !== $merchantId) {
                    throw new \RuntimeException('Invalid product variant');
                }
                $lineTotal = $variant->price_amount * $item['quantity'];
                $subtotal += $lineTotal;
                $orderItems[] = compact('variant', 'item', 'lineTotal');
            }

            $shippingAmount = 0;
            if (! empty($data['shipping_method_id'])) {
                $shipping = ShippingMethod::find($data['shipping_method_id']);
                $shippingAmount = $shipping?->price_amount ?? 0;
            }

            $total = $subtotal + $shippingAmount;
            $orderNumber = 'ORD-'.now()->format('Ymd').'-'.str_pad((string) (Order::withoutGlobalScopes()->where('merchant_id', $merchantId)->count() + 1), 4, '0', STR_PAD_LEFT);

            $status = $data['status'] ?? 'pending';

            $order = Order::create([
                'customer_id' => $data['customer_id'] ?? null,
                'order_number' => $orderNumber,
                'status' => $status,
                'payment_status' => 'pending',
                'shipping_status' => 'pending',
                'currency' => MerchantContext::merchant()?->currency ?? 'SAR',
                'subtotal_amount' => $subtotal,
                'discount_amount' => 0,
                'shipping_amount' => $shippingAmount,
                'tax_amount' => 0,
                'total_amount' => $total,
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_note' => $data['customer_note'] ?? null,
                'admin_note' => $data['admin_note'] ?? null,
                'source' => 'admin',
                'placed_at' => now(),
                'confirmed_at' => in_array($status, ['confirmed', 'processing', 'ready', 'shipped', 'completed']) ? now() : null,
            ]);

            foreach ($orderItems as $row) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $row['variant']->product_id,
                    'product_variant_id' => $row['variant']->id,
                    'product_name' => $row['variant']->product->name,
                    'variant_name' => $row['variant']->name,
                    'sku' => $row['variant']->sku,
                    'quantity' => $row['item']['quantity'],
                    'unit_price_amount' => $row['variant']->price_amount,
                    'total_amount' => $row['lineTotal'],
                    'cost_amount' => $row['variant']->cost_amount,
                ]);

                if (in_array($status, ['confirmed', 'processing', 'ready', 'shipped', 'completed'])) {
                    $this->inventoryService->reserveForOrder($row['variant']->id, $row['item']['quantity'], $order->id);
                }
            }

            if (! empty($data['address'])) {
                OrderAddress::create([
                    'order_id' => $order->id,
                    'type' => 'shipping',
                    ...$data['address'],
                ]);
            }

            Payment::create([
                'merchant_id' => $merchantId,
                'order_id' => $order->id,
                'payment_method' => $data['payment_method'] ?? 'cash_on_delivery',
                'status' => 'pending',
                'amount' => $total,
                'currency' => $order->currency,
            ]);

            if (! empty($data['shipping_method_id'])) {
                Shipment::create([
                    'merchant_id' => $merchantId,
                    'order_id' => $order->id,
                    'shipping_method_id' => $data['shipping_method_id'],
                    'status' => 'pending',
                    'shipping_cost_amount' => $shippingAmount,
                ]);
            }

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => $status,
                'note' => 'Order created from admin',
                'changed_by' => auth()->id(),
                'created_at' => now(),
            ]);

            if ($order->customer_id) {
                Customer::where('id', $order->customer_id)->increment('orders_count');
                Customer::where('id', $order->customer_id)->increment('total_spent_amount', $total);
                Customer::where('id', $order->customer_id)->update(['last_order_at' => now()]);
            }

            Notification::create([
                'merchant_id' => $merchantId,
                'type' => 'new_order',
                'title' => 'New Order',
                'message' => "Order {$orderNumber} placed",
                'data' => ['order_id' => $order->id],
                'created_at' => now(),
            ]);

            return $order->load(['items', 'addresses', 'statusHistories', 'payments', 'shipments']);
        });

        $this->activityLog->log('order.created', 'orders', "Order {$order->order_number} created", Order::class, $order->id, request: $request);

        return sendResponse($this->formatDetail($order), 'Order created');
    }

    public function show(int $id)
    {
        $order = Order::with(['items', 'addresses', 'statusHistories', 'payments', 'shipments', 'customer'])->find($id);
        if (! $order) {
            return sendError('Order not found', [], 404);
        }

        return sendResponse($this->formatDetail($order), 'Order details');
    }

    public function updateStatus(Request $request, int $id)
    {
        $order = Order::find($id);
        if (! $order) {
            return sendError('Order not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,confirmed,processing,ready,shipped,completed,canceled,returned',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $newStatus = $request->input('status');
        $oldStatus = $order->status;

        if ($oldStatus === $newStatus) {
            return sendResponse($this->formatDetail($order), 'No change');
        }

        if ($newStatus === 'canceled' && ! in_array($oldStatus, ['pending', 'confirmed'])) {
            return sendError('Cannot cancel order in current status', [], 422);
        }

        $order->update([
            'status' => $newStatus,
            'confirmed_at' => $newStatus === 'confirmed' && ! $order->confirmed_at ? now() : $order->confirmed_at,
            'completed_at' => $newStatus === 'completed' ? now() : $order->completed_at,
            'canceled_at' => $newStatus === 'canceled' ? now() : $order->canceled_at,
        ]);

        if ($newStatus === 'confirmed' && $oldStatus === 'pending') {
            foreach ($order->items as $item) {
                if ($item->product_variant_id) {
                    $this->inventoryService->reserveForOrder($item->product_variant_id, $item->quantity, $order->id);
                }
            }
        }

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'from_status' => $oldStatus,
            'to_status' => $newStatus,
            'note' => $request->input('note'),
            'changed_by' => auth()->id(),
            'created_at' => now(),
        ]);

        $this->activityLog->log('order.status_changed', 'orders', "Order {$order->order_number}: {$oldStatus} → {$newStatus}", Order::class, $order->id, request: $request);

        return sendResponse($this->formatDetail($order->fresh()->load(['items', 'statusHistories'])), 'Status updated');
    }

    public function update(Request $request, int $id)
    {
        $order = Order::find($id);
        if (! $order) {
            return sendError('Order not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'admin_note' => 'nullable|string',
            'payment_status' => 'nullable|in:pending,paid,partially_paid,failed,refunded',
            'shipping_status' => 'nullable|in:not_required,pending,preparing,shipped,delivered,returned',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $order->update($validator->validated());

        if ($request->has('payment_status') && $request->input('payment_status') === 'paid') {
            $order->payments()->update(['status' => 'paid', 'paid_at' => now()]);
        }

        return sendResponse($this->formatDetail($order->fresh()->load(['items', 'payments'])), 'Order updated');
    }

    public function destroy(Request $request, int $id)
    {
        $order = Order::find($id);
        if (! $order) {
            return sendError('Order not found', [], 404);
        }

        if (! in_array($order->status, ['pending', 'canceled'])) {
            return sendError('Only pending or canceled orders can be deleted', [], 422);
        }

        $order->delete();
        $this->activityLog->log('order.deleted', 'orders', "Order {$order->order_number} deleted", request: $request);

        return sendResponse([], 'Order deleted');
    }

    protected function formatList(Order $o): array
    {
        return [
            'id' => $o->id,
            'order_number' => $o->order_number,
            'customer_name' => $o->customer_name,
            'customer_phone' => $o->customer_phone,
            'status' => $o->status,
            'payment_status' => $o->payment_status,
            'shipping_status' => $o->shipping_status,
            'total' => MoneyHelper::fromMinor($o->total_amount),
            'source' => $o->source,
            'placed_at' => $o->placed_at,
            'created_at' => $o->created_at,
        ];
    }

    protected function formatDetail(Order $o): array
    {
        return [
            ...$this->formatList($o),
            'customer_id' => $o->customer_id,
            'customer_email' => $o->customer_email,
            'customer_note' => $o->customer_note,
            'admin_note' => $o->admin_note,
            'subtotal' => MoneyHelper::fromMinor($o->subtotal_amount),
            'discount' => MoneyHelper::fromMinor($o->discount_amount),
            'shipping' => MoneyHelper::fromMinor($o->shipping_amount),
            'tax' => MoneyHelper::fromMinor($o->tax_amount),
            'currency' => $o->currency,
            'items' => $o->items->map(fn ($i) => [
                'id' => $i->id,
                'product_name' => $i->product_name,
                'variant_name' => $i->variant_name,
                'sku' => $i->sku,
                'quantity' => $i->quantity,
                'unit_price' => MoneyHelper::fromMinor($i->unit_price_amount),
                'total' => MoneyHelper::fromMinor($i->total_amount),
            ]),
            'addresses' => $o->addresses,
            'status_histories' => $o->statusHistories,
            'payments' => $o->payments,
            'shipments' => $o->shipments,
        ];
    }
}
