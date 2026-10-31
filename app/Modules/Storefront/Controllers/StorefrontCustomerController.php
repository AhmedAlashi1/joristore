<?php

namespace App\Modules\Storefront\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerWalletRequest;
use App\Modules\Customers\Models\CustomerWalletTransaction;
use App\Modules\Customers\Services\WalletRequestService;
use App\Modules\Customers\Services\WalletService;
use App\Modules\Customers\Models\CustomerNotification;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Customers\Models\CustomerAddress;
use App\Modules\Dashboard\Models\Notification;
use App\Modules\Orders\Models\Order;
use App\Modules\Orders\Models\OrderAddress;
use App\Modules\Orders\Models\OrderItem;
use App\Modules\Orders\Models\OrderStatusHistory;
use App\Modules\Orders\Models\Payment;
use App\Modules\Orders\Models\Shipment;
use App\Modules\Shipping\Models\DeliveryRegion;
use App\Modules\Shipping\Models\ShippingMethod;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\StoreSettingService;
use App\Shared\Support\PaymentMethods;
use App\Shared\Support\PhoneNormalizer;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Partners\Services\PartnerCommissionService;
use App\Modules\Promotions\Services\CouponApplicationService;
use App\Shared\Services\DeliveryPricingService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class StorefrontCustomerController extends Controller
{
    public function __construct(
        protected DeliveryPricingService $deliveryPricing,
        protected InventoryService $inventoryService,
        protected WalletService $walletService,
        protected WalletRequestService $walletRequests,
        protected CouponApplicationService $coupons,
    ) {}

    public function register(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $request->merge($this->mergeStoreAuthInput($request));

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|min:9|max:20',
        ], [
            'first_name.required' => 'الاسم الأول مطلوب',
            'phone.required' => 'رقم الجوال مطلوب',
            'phone.min' => 'رقم الجوال غير صالح',
            'email.email' => 'البريد الإلكتروني غير صالح',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $data['phone'] = PhoneNormalizer::normalize($data['phone']);

        if ($data['phone'] === '' || strlen($data['phone']) < 9) {
            return sendError('رقم الجوال غير صالح', [], 422);
        }

        $existing = $this->findCustomerByPhone($merchantId, $data['phone']);

        if ($existing) {
            return sendError('رقم الجوال مسجّل مسبقاً — استخدم تسجيل الدخول', [], 422);
        }

        $customer = Customer::create([
            ...$data,
            'merchant_id' => $merchantId,
            'status' => 'active',
        ]);

        return sendResponse($this->formatCustomer($customer), 'Registered');
    }

    public function login(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $request->merge($this->mergeStoreAuthInput($request));

        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|min:9|max:20',
        ], [
            'phone.required' => 'رقم الجوال مطلوب',
            'phone.min' => 'رقم الجوال غير صالح',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $phone = PhoneNormalizer::normalize($request->input('phone'));
        if ($phone === '' || strlen($phone) < 9) {
            return sendError('رقم الجوال غير صالح', [], 422);
        }

        $customer = $this->findCustomerByPhone($merchantId, $phone);

        if (! $customer || $customer->status !== 'active') {
            return sendError('لا يوجد حساب بهذا الرقم — أنشئ حساباً جديداً', [], 404);
        }

        return sendResponse($this->formatCustomer($customer, true), 'Logged in');
    }

    public function profile(Request $request)
    {
        $customer = $this->customer($request);

        return sendResponse($this->formatCustomer($customer->fresh()->load('addresses'), true), 'Profile');
    }

    public function walletTransactions(Request $request)
    {
        $customer = $this->customer($request);
        $perPage = max(1, min((int) $request->input('per_page', 20), 50));

        $paginator = CustomerWalletTransaction::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        $paginator->getCollection()->transform(fn (CustomerWalletTransaction $tx) => $this->formatWalletTransaction($tx));

        return sendResponse($paginator, 'Wallet transactions');
    }

    public function syncCart(Request $request)
    {
        $customer = $this->customer($request);

        $validator = Validator::make($request->all(), [
            'items' => 'required|array|max:50',
            'items.*.productId' => 'nullable|integer',
            'items.*.productVariantId' => 'nullable|integer',
            'items.*.product_id' => 'nullable|integer',
            'items.*.product_variant_id' => 'nullable|integer',
            'items.*.name' => 'nullable|string|max:255',
            'items.*.price' => 'nullable|numeric|min:0',
            'items.*.quantity' => 'nullable|integer|min:1|max:999',
            'items.*.image' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $normalized = [];
        foreach ($request->input('items', []) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $variantId = (int) ($row['productVariantId'] ?? $row['product_variant_id'] ?? 0);
            $productId = (int) ($row['productId'] ?? $row['product_id'] ?? 0);
            if ($variantId <= 0 || $productId <= 0) {
                continue;
            }
            $normalized[] = [
                'productId' => $productId,
                'productVariantId' => $variantId,
                'name' => mb_substr((string) ($row['name'] ?? ''), 0, 255),
                'price' => (float) ($row['price'] ?? 0),
                'quantity' => max(1, min(999, (int) ($row['quantity'] ?? 1))),
                'image' => ! empty($row['image']) ? (string) $row['image'] : null,
            ];
        }

        $customer->update([
            'cart_snapshot' => $normalized,
            'cart_synced_at' => now(),
        ]);

        return sendResponse(['synced_at' => $customer->cart_synced_at], 'Cart synced');
    }

    public function walletOverview(Request $request)
    {
        return sendResponse($this->buildWalletOverview($this->customer($request)), 'Wallet overview');
    }

    /** Single round-trip for wallet screen (overview + recent activity). */
    public function walletFeed(Request $request)
    {
        $schemaError = $this->walletSchemaError();
        if ($schemaError) {
            return $schemaError;
        }

        try {
            $customer = $this->customer($request);
            $customerId = $customer->id;

            $transactions = CustomerWalletTransaction::query()
                ->where('customer_id', $customerId)
                ->orderByDesc('id')
                ->limit(30)
                ->get()
                ->map(fn (CustomerWalletTransaction $tx) => $this->formatWalletTransaction($tx))
                ->values();

            $requests = CustomerWalletRequest::query()
                ->where('customer_id', $customerId)
                ->orderByDesc('id')
                ->limit(30)
                ->get()
                ->map(fn (CustomerWalletRequest $r) => $this->formatStorefrontWalletRequest($r))
                ->values();

            return sendResponse([
                'overview' => $this->buildWalletOverview($customer),
                'transactions' => $transactions,
                'requests' => $requests,
            ], 'Wallet feed');
        } catch (\Throwable $e) {
            report($e);

            return sendError('Wallet feed unavailable', [], 500);
        }
    }

    protected function walletSchemaError(): ?\Illuminate\Http\JsonResponse
    {
        if (! Schema::hasTable('customer_wallet_transactions')) {
            return sendError('Wallet tables missing. Run: php artisan migrate --force', [], 503);
        }
        if (! Schema::hasTable('customer_wallet_requests')) {
            return sendError('Wallet requests table missing. Run: php artisan migrate --force', [], 503);
        }

        return null;
    }

    /** @return array{balance: float, pending_top_up: float, pending_withdrawal: float} */
    protected function buildWalletOverview(Customer $customer): array
    {
        $pendingTopUp = CustomerWalletRequest::query()
            ->where('customer_id', $customer->id)
            ->where('type', CustomerWalletRequest::TYPE_TOP_UP)
            ->where('status', CustomerWalletRequest::STATUS_PENDING)
            ->sum('amount');

        $pendingWithdrawal = CustomerWalletRequest::query()
            ->where('customer_id', $customer->id)
            ->where('type', CustomerWalletRequest::TYPE_WITHDRAWAL)
            ->where('status', CustomerWalletRequest::STATUS_PENDING)
            ->sum('amount');

        return [
            'balance' => MoneyHelper::fromMinor($customer->wallet_balance_amount ?? 0),
            'pending_top_up' => MoneyHelper::fromMinor((int) $pendingTopUp),
            'pending_withdrawal' => MoneyHelper::fromMinor((int) $pendingWithdrawal),
        ];
    }

    public function walletRequests(Request $request)
    {
        $customer = $this->customer($request);
        $perPage = max(1, min((int) $request->input('per_page', 20), 50));

        $paginator = CustomerWalletRequest::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        $paginator->getCollection()->transform(fn (CustomerWalletRequest $r) => $this->formatStorefrontWalletRequest($r));

        return sendResponse($paginator, 'Wallet requests');
    }

    public function storeWalletTopUp(Request $request)
    {
        $customer = $this->customer($request);

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|'.PaymentMethods::validationRule(),
            'transfer_reference' => 'nullable|string|max:120',
            'account_holder_name' => 'nullable|string|max:120',
            'receipt_path' => 'nullable|string|max:500',
            'note' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $storeId = MerchantContext::store()->id;
        $paymentMethod = $data['payment_method'];

        if (! PaymentMethods::isWalletTopUpMethod($storeId, $paymentMethod)) {
            return sendError('Payment method is not available for wallet top-up', [], 422);
        }

        if (PaymentMethods::requiresReceipt($paymentMethod, $storeId) && empty($data['receipt_path'])) {
            return sendError('Payment receipt is required for this payment method', [], 422);
        }

        $amountMinor = MoneyHelper::toMinor((float) $data['amount']);

        try {
            $row = $this->walletRequests->createTopUp(
                $customer,
                $amountMinor,
                $paymentMethod,
                null,
                null,
                $data['receipt_path'] ?? null,
                $data['note'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return sendError($e->getMessage(), [], 422);
        } catch (\Throwable $e) {
            report($e);

            return sendError('Could not save top-up request. Ensure database migrations are up to date.', [], 500);
        }

        return sendResponse($this->formatStorefrontWalletRequest($row), 'Top-up request submitted');
    }

    public function storeWalletWithdrawal(Request $request)
    {
        $customer = $this->customer($request);

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|'.PaymentMethods::validationRule(),
            'transfer_reference' => 'required|string|max:120',
            'account_holder_name' => 'required|string|max:120',
            'note' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $storeId = MerchantContext::store()->id;
        $paymentMethod = $data['payment_method'];

        if (! PaymentMethods::isWalletWithdrawMethod($storeId, $paymentMethod)) {
            return sendError('Payment method is not available for wallet withdrawal', [], 422);
        }

        $amountMinor = MoneyHelper::toMinor((float) $data['amount']);

        try {
            $row = $this->walletRequests->createWithdrawal(
                $customer->fresh(),
                $amountMinor,
                $paymentMethod,
                trim((string) $data['transfer_reference']),
                trim((string) $data['account_holder_name']),
                $data['note'] ?? null,
            );
        } catch (\RuntimeException|\InvalidArgumentException $e) {
            return sendError($e->getMessage(), [], 422);
        } catch (\Throwable $e) {
            report($e);

            return sendError('Could not save withdrawal request. Ensure database migrations are up to date.', [], 500);
        }

        return sendResponse($this->formatStorefrontWalletRequest($row), 'Withdrawal request submitted');
    }

    protected function formatWalletTransaction(CustomerWalletTransaction $tx): array
    {
        $ref = $tx->reference_type ?? '';

        return [
            'id' => $tx->id,
            'type' => $tx->type,
            'amount' => MoneyHelper::fromMinor($tx->amount),
            'balance_after' => MoneyHelper::fromMinor($tx->balance_after),
            'reference_type' => $ref,
            'reference_id' => $tx->reference_id,
            'label_ar' => $this->walletTransactionLabel($tx->type, $ref, 'ar'),
            'label_en' => $this->walletTransactionLabel($tx->type, $ref, 'en'),
            'note' => $tx->note,
            'created_at' => $tx->created_at,
        ];
    }

    protected function walletTransactionLabel(string $type, string $referenceType, string $locale): string
    {
        $ar = $locale === 'ar';

        if ($referenceType === WalletService::REF_ORDER_RETURN) {
            return $ar ? 'استرداد طلب مرتجع' : 'Returned order refund';
        }
        if ($referenceType === WalletService::REF_ORDER_PAYMENT) {
            return $ar ? 'دفع طلب من المحفظة' : 'Order paid from wallet';
        }
        if ($referenceType === WalletService::REF_WALLET_TOP_UP) {
            return $ar ? 'شحن المحفظة' : 'Wallet top-up';
        }
        if ($referenceType === WalletService::REF_WALLET_WITHDRAWAL) {
            return $ar ? 'سحب من المحفظة' : 'Wallet withdrawal';
        }

        return $type === 'credit'
            ? ($ar ? 'إضافة رصيد' : 'Credit')
            : ($ar ? 'خصم رصيد' : 'Debit');
    }

    protected function formatStorefrontWalletRequest(CustomerWalletRequest $r): array
    {
        return [
            'id' => $r->id,
            'type' => $r->type,
            'amount' => MoneyHelper::fromMinor($r->amount),
            'status' => $r->status,
            'payment_method' => $r->payment_method,
            'transfer_reference' => $r->transfer_reference,
            'account_holder_name' => $r->account_holder_name,
            'receipt_path' => $r->receipt_path,
            'admin_transfer_receipt_path' => $r->admin_transfer_receipt_path,
            'customer_note' => $r->customer_note,
            'admin_note' => $r->admin_note,
            'created_at' => $r->created_at,
            'processed_at' => $r->processed_at,
        ];
    }

    public function updateProfile(Request $request)
    {
        $customer = $this->customer($request);

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'sometimes|required|string|max:20',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $customer->update($validator->validated());

        return sendResponse($this->formatCustomer($customer->fresh()->load('addresses'), true), 'Updated');
    }

    public function orders(Request $request)
    {
        $customer = $this->customer($request);
        $perPage = max(1, min((int) $request->input('per_page', 15), 50));

        $paginator = Order::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        $paginator->getCollection()->transform(fn (Order $o) => [
            'id' => $o->id,
            'order_number' => $o->order_number,
            'status' => $o->status,
            'total' => MoneyHelper::fromMinor($o->total_amount),
            'placed_at' => $o->placed_at,
        ]);

        return sendResponse($paginator, 'Orders');
    }

    public function orderShow(Request $request, int $id)
    {
        $customer = $this->customer($request);

        $order = Order::query()
            ->where('customer_id', $customer->id)
            ->where('id', $id)
            ->with([
                'items',
                'addresses',
                'statusHistories' => fn ($q) => $q->orderBy('created_at'),
                'shipments',
            ])
            ->first();

        if (! $order) {
            return sendError('Order not found', [], 404);
        }

        return sendResponse($this->formatStorefrontOrder($order), 'Order details');
    }

    public function validateCoupon(Request $request)
    {
        $customer = $this->customer($request);
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'subtotal' => 'required|numeric|min:0',
            'shipping' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $subtotalMinor = MoneyHelper::toMinor((float) $data['subtotal']);
        $shippingMinor = MoneyHelper::toMinor((float) ($data['shipping'] ?? 0));

        $coupon = $this->coupons->findActiveByCode($merchantId, $data['code']);
        if (! $coupon) {
            return sendError('Invalid coupon code', [], 422);
        }

        try {
            $this->coupons->assertUsable($coupon, $customer, $subtotalMinor, $shippingMinor);
        } catch (\RuntimeException $e) {
            return sendError($e->getMessage(), [], 422);
        }

        $applied = $this->coupons->apply($coupon, $subtotalMinor, $shippingMinor);

        return sendResponse([
            'code' => $coupon->code,
            'name' => $coupon->name,
            'type' => $applied['discount_type'],
            'applies_to' => $applied['applies_to'],
            'subtotal_discount' => MoneyHelper::fromMinor($applied['subtotal_discount_minor']),
            'shipping' => MoneyHelper::fromMinor($applied['shipping_amount_minor']),
            'savings' => MoneyHelper::fromMinor($applied['savings_minor']),
        ], 'Coupon applied');
    }

    public function storeOrder(Request $request)
    {
        $customer = $this->customer($request);
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'fulfillment_type' => 'nullable|in:delivery,pickup',
            'customer_address_id' => 'nullable|integer',
            'payment_method' => 'nullable|'.PaymentMethods::validationRule(),
            'payment_receipt_path' => 'nullable|string|max:500',
            'transfer_reference' => 'nullable|string|max:120',
            'account_holder_name' => 'nullable|string|max:120',
            'shipping_method_id' => 'nullable|integer|exists:shipping_methods,id',
            'customer_note' => 'nullable|string|max:500',
            'coupon_code' => 'nullable|string|max:50',
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $paymentMethod = $data['payment_method'] ?? 'cash_on_delivery';
        $storeId = MerchantContext::store()->id;
        $fulfillment = $data['fulfillment_type'] ?? 'delivery';

        if (! PaymentMethods::isEnabledForStore($storeId, $paymentMethod)) {
            return sendError('Payment method is not available', [], 422);
        }

        if (PaymentMethods::requiresReceipt($paymentMethod, $storeId)) {
            if (empty($data['payment_receipt_path'])) {
                return sendError('Payment receipt is required for this payment method', [], 422);
            }
        }

        $address = null;
        if ($fulfillment === 'delivery') {
            if (empty($data['customer_address_id'])) {
                return sendError('Delivery address is required', [], 422);
            }
            $address = $customer->addresses()->find($data['customer_address_id']);
            if (! $address) {
                return sendError('Address not found', [], 404);
            }
            if (! $address->delivery_region_id) {
                return sendError('Please update your address with a delivery region', [], 422);
            }
        }

        try {
            $order = DB::transaction(function () use ($data, $customer, $merchantId, $address, $paymentMethod, $fulfillment) {
                /** @var \App\Modules\Promotions\Models\Coupon|null $appliedCoupon */
                $appliedCoupon = null;
                $subtotal = 0;
                $orderItems = [];

                foreach ($data['items'] as $item) {
                    $variant = ProductVariant::with(['product', 'inventory'])->findOrFail($item['product_variant_id']);
                    if ($variant->merchant_id !== $merchantId) {
                        throw new \RuntimeException('Invalid product variant');
                    }
                    $available = ($variant->inventory?->quantity ?? 0);
                    if ($available < $item['quantity']) {
                        throw new \RuntimeException("Insufficient stock for {$variant->product->name}");
                    }
                    $lineTotal = $variant->price_amount * $item['quantity'];
                    $subtotal += $lineTotal;
                    $orderItems[] = compact('variant', 'item', 'lineTotal');
                }

                $shippingMethodId = $data['shipping_method_id'] ?? null;
                $shippingAmount = 0;
                if ($fulfillment === 'delivery' && $address) {
                    $deliveryQuote = $this->deliveryPricing->quoteForAddress($merchantId, $address);
                    if ($deliveryQuote) {
                        $shippingAmount = $deliveryQuote['amount_minor'];
                    } elseif ($shippingMethodId) {
                        $shipping = ShippingMethod::find($shippingMethodId);
                        if ($shipping && $shipping->merchant_id === $merchantId) {
                            $freeMin = $shipping->free_shipping_minimum ?? 0;
                            $shippingAmount = ($freeMin > 0 && $subtotal >= $freeMin) ? 0 : ($shipping->price_amount ?? 0);
                        }
                    }
                }

                $discountAmount = 0;
                $couponUsageDiscount = 0;
                $couponCode = trim((string) ($data['coupon_code'] ?? ''));
                if ($couponCode !== '') {
                    $appliedCoupon = $this->coupons->findActiveByCode($merchantId, $couponCode);
                    if (! $appliedCoupon) {
                        throw new \RuntimeException('Invalid coupon code');
                    }
                    $this->coupons->assertUsable($appliedCoupon, $customer, $subtotal, $shippingAmount);
                    $applied = $this->coupons->apply($appliedCoupon, $subtotal, $shippingAmount);
                    $discountAmount = $applied['subtotal_discount_minor'];
                    $shippingAmount = $applied['shipping_amount_minor'];
                    $couponUsageDiscount = $applied['savings_minor'];
                }

                $total = max(0, $subtotal + $shippingAmount - $discountAmount);

                if ($paymentMethod === 'wallet') {
                    $freshCustomer = Customer::query()->whereKey($customer->id)->lockForUpdate()->first();
                    if (($freshCustomer->wallet_balance_amount ?? 0) < $total) {
                        throw new \RuntimeException('Insufficient wallet balance');
                    }
                }

                $orderNumber = 'ORD-'.now()->format('Ymd').'-'.str_pad((string) (Order::withoutGlobalScopes()->where('merchant_id', $merchantId)->count() + 1), 4, '0', STR_PAD_LEFT);

                $paymentStatus = $paymentMethod === 'wallet' ? 'paid' : 'pending';

                $order = Order::create([
                    'merchant_id' => $merchantId,
                    'customer_id' => $customer->id,
                    'order_number' => $orderNumber,
                    'status' => 'pending',
                    'payment_status' => $paymentStatus,
                    'shipping_status' => $fulfillment === 'pickup' ? 'not_required' : 'pending',
                    'currency' => MerchantContext::merchant()?->currency ?? 'SAR',
                    'subtotal_amount' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'shipping_amount' => $shippingAmount,
                    'tax_amount' => 0,
                    'total_amount' => $total,
                    'customer_name' => $address?->full_name ?: $customer->full_name,
                    'customer_email' => $customer->email,
                    'customer_phone' => $address?->phone ?: $customer->phone,
                    'customer_note' => $fulfillment === 'pickup'
                        ? trim((($data['customer_note'] ?? '') !== '' ? $data['customer_note']."\n" : '').'[pickup]')
                        : ($data['customer_note'] ?? null),
                    'source' => 'storefront',
                    'placed_at' => now(),
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
                    $this->inventoryService->reserveForOrder(
                        $row['variant']->id,
                        $row['item']['quantity'],
                        $order->id,
                    );
                }

                if ($fulfillment === 'delivery' && $address) {
                    OrderAddress::create([
                        'order_id' => $order->id,
                        'type' => 'shipping',
                        'full_name' => $address->full_name,
                        'phone' => $address->phone,
                        'city' => $address->city,
                        'area' => $address->area,
                        'street' => $address->street,
                        'building' => $address->building,
                        'floor' => $address->floor,
                        'apartment' => $address->apartment,
                        'postal_code' => $address->postal_code,
                        'country_code' => $address->country_code ?? 'SA',
                    ]);
                } else {
                    $storeName = MerchantContext::store()->name ?? 'Showroom';
                    OrderAddress::create([
                        'order_id' => $order->id,
                        'type' => 'shipping',
                        'full_name' => $customer->full_name,
                        'phone' => $customer->phone,
                        'city' => $storeName,
                        'area' => 'Pickup',
                        'street' => 'Showroom pickup',
                        'country_code' => 'SA',
                    ]);
                }

                $paymentMeta = [];
                if (! empty($data['payment_receipt_path'])) {
                    $paymentMeta['receipt_path'] = $data['payment_receipt_path'];
                    $paymentMeta['receipt_uploaded_at'] = now()->toIso8601String();
                }
                if (! empty($data['transfer_reference'])) {
                    $paymentMeta['transfer_reference'] = trim((string) $data['transfer_reference']);
                }
                if (! empty($data['account_holder_name'])) {
                    $paymentMeta['account_holder_name'] = trim((string) $data['account_holder_name']);
                }

                Payment::create([
                    'merchant_id' => $merchantId,
                    'order_id' => $order->id,
                    'payment_method' => $paymentMethod,
                    'status' => $paymentMethod === 'wallet' ? 'paid' : 'pending',
                    'amount' => $total,
                    'currency' => $order->currency,
                    'paid_at' => $paymentMethod === 'wallet' ? now() : null,
                    'metadata' => $paymentMeta ?: null,
                ]);

                if ($paymentMethod === 'wallet') {
                    $this->walletService->debit(
                        $customer,
                        $total,
                        'order_payment',
                        $order->id,
                        'Payment for order '.$orderNumber,
                    );
                }

                if ($shippingMethodId) {
                    Shipment::create([
                        'merchant_id' => $merchantId,
                        'order_id' => $order->id,
                        'shipping_method_id' => $shippingMethodId,
                        'status' => 'pending',
                        'shipping_cost_amount' => $shippingAmount,
                    ]);
                }

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => null,
                    'to_status' => 'pending',
                    'note' => 'Order placed from storefront',
                    'changed_by' => null,
                    'created_at' => now(),
                ]);

                if ($appliedCoupon) {
                    $this->coupons->recordUsage($appliedCoupon, $customer, $order->id, $couponUsageDiscount);
                    app(PartnerCommissionService::class)->recordFromOrder(
                        $appliedCoupon,
                        $order,
                        max(0, $subtotal - $discountAmount),
                    );
                }

                $customer->increment('orders_count');
                $customer->increment('total_spent_amount', $total);
                $customer->update(['last_order_at' => now()]);

                Notification::create([
                    'merchant_id' => $merchantId,
                    'type' => 'new_order',
                    'title' => 'طلب جديد',
                    'message' => "Order {$orderNumber} from storefront",
                    'data' => ['order_id' => $order->id],
                    'created_at' => now(),
                ]);

                return $order;
            });
        } catch (\RuntimeException $e) {
            return sendError($e->getMessage(), [], 422);
        }

        return sendResponse([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'total' => MoneyHelper::fromMinor($order->total_amount),
            'placed_at' => $order->placed_at,
        ], 'Order placed');
    }

    public function storeAddress(Request $request)
    {
        $customer = $this->customer($request);

        $validator = Validator::make($request->all(), [
            'type' => 'nullable|in:shipping,billing',
            'label' => 'nullable|string|max:120',
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'delivery_region_id' => 'required|integer|exists:delivery_regions,id',
            'street' => 'required|string|max:255',
            'building' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'city' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:255',
            'floor' => 'nullable|string|max:50',
            'apartment' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        $region = DeliveryRegion::query()
            ->where('merchant_id', MerchantContext::merchantId())
            ->find($data['delivery_region_id']);
        if (! $region) {
            return sendError('Invalid delivery region', [], 422);
        }

        if ($data['is_default'] ?? false) {
            $customer->addresses()->update(['is_default' => false]);
        }

        $address = $customer->addresses()->create([
            ...$data,
            'type' => $data['type'] ?? 'shipping',
            'city' => $region->name,
            'area' => $data['area'] ?? null,
            'country_code' => 'PS',
            'is_default' => $data['is_default'] ?? ! $customer->addresses()->exists(),
        ]);

        return sendResponse($this->formatAddress($address->load('deliveryRegion')), 'Address created');
    }

    public function updateAddress(Request $request, int $addressId)
    {
        $customer = $this->customer($request);
        $address = $customer->addresses()->find($addressId);

        if (! $address) {
            return sendError('Address not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'label' => 'nullable|string|max:120',
            'full_name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'delivery_region_id' => 'sometimes|required|integer|exists:delivery_regions,id',
            'street' => 'sometimes|required|string|max:255',
            'building' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'city' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:255',
            'floor' => 'nullable|string|max:50',
            'apartment' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        if ($data['is_default'] ?? false) {
            $customer->addresses()->where('id', '!=', $addressId)->update(['is_default' => false]);
        }

        if (isset($data['delivery_region_id'])) {
            $region = DeliveryRegion::query()
                ->where('merchant_id', MerchantContext::merchantId())
                ->find($data['delivery_region_id']);
            if (! $region) {
                return sendError('Invalid delivery region', [], 422);
            }
            $data['city'] = $region->name;
        }

        $address->update($data);

        return sendResponse($this->formatAddress($address->fresh()->load('deliveryRegion')), 'Address updated');
    }

    public function destroyAddress(Request $request, int $addressId)
    {
        $customer = $this->customer($request);
        $address = $customer->addresses()->find($addressId);

        if (! $address) {
            return sendError('Address not found', [], 404);
        }

        $address->delete();

        return sendResponse($address, 'Address deleted');
    }

    public function notifications(Request $request)
    {
        $customer = $this->customer($request);
        $perPage = max(1, min((int) $request->input('per_page', 20), 50));
        $locale = strtolower((string) $request->input('locale', 'ar')) === 'en' ? 'en' : 'ar';

        $paginator = CustomerNotification::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (CustomerNotification $n) => $this->formatStorefrontCustomerNotification($n, $locale));

        return sendResponse($paginator, 'Notifications');
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatStorefrontCustomerNotification(CustomerNotification $n, string $locale): array
    {
        $data = is_array($n->data) ? $n->data : [];
        $useEn = $locale === 'en';

        return [
            'id' => $n->id,
            'title' => $useEn ? (string) ($data['title_en'] ?? $n->title) : (string) $n->title,
            'message' => $useEn ? (string) ($data['message_en'] ?? $n->message) : (string) $n->message,
            'type' => (string) $n->type,
            'data' => $data,
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }

    public function unreadNotificationsCount(Request $request)
    {
        $customer = $this->customer($request);
        $count = CustomerNotification::query()
            ->where('customer_id', $customer->id)
            ->whereNull('read_at')
            ->count();

        return sendResponse(['count' => $count], 'Unread count');
    }

    public function markNotificationRead(Request $request, int $id)
    {
        $customer = $this->customer($request);
        $notification = CustomerNotification::query()
            ->where('customer_id', $customer->id)
            ->find($id);

        if (! $notification) {
            return sendError('Not found', [], 404);
        }

        $notification->update(['read_at' => now()]);

        return sendResponse([], 'Marked as read');
    }

    public function markAllNotificationsRead(Request $request)
    {
        $customer = $this->customer($request);
        CustomerNotification::query()
            ->where('customer_id', $customer->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return sendResponse([], 'All marked as read');
    }

    protected function formatStorefrontOrder(Order $order): array
    {
        $steps = collect($order->statusHistories ?? [])
            ->map(fn (OrderStatusHistory $h) => [
                'status' => $h->to_status,
                'note' => $h->note,
                'at' => $h->created_at,
            ])
            ->values()
            ->all();

        $skipShippingStep = ['pending', 'not_required'];
        if ($order->shipping_status && ! in_array($order->shipping_status, $skipShippingStep, true)) {
            $steps[] = [
                'status' => 'shipping_'.$order->shipping_status,
                'note' => null,
                'at' => $order->updated_at,
            ];
        }

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'shipping_status' => $order->shipping_status,
            'subtotal' => MoneyHelper::fromMinor($order->subtotal_amount),
            'shipping' => MoneyHelper::fromMinor($order->shipping_amount),
            'total' => MoneyHelper::fromMinor($order->total_amount),
            'currency' => $order->currency,
            'placed_at' => $order->placed_at,
            'customer_note' => $order->customer_note,
            'items' => $order->items->map(fn (OrderItem $i) => [
                'id' => $i->id,
                'product_name' => $i->product_name,
                'variant_name' => $i->variant_name,
                'quantity' => $i->quantity,
                'unit_price' => MoneyHelper::fromMinor($i->unit_price_amount),
                'total' => MoneyHelper::fromMinor($i->total_amount),
            ])->values()->all(),
            'address' => $order->addresses->firstWhere('type', 'shipping') ?? $order->addresses->first(),
            'tracking_steps' => $steps,
        ];
    }

    protected function customer(Request $request): Customer
    {
        return $request->attributes->get('store_customer');
    }

    /**
     * @return array<string, mixed>
     */
    protected function mergeStoreAuthInput(Request $request): array
    {
        $email = $request->input('email');
        $phone = PhoneNormalizer::normalize($request->input('phone'));

        return [
            'phone' => $phone !== '' ? $phone : $request->input('phone'),
            'email' => is_string($email) && trim($email) === '' ? null : $email,
            'last_name' => $request->filled('last_name') ? $request->input('last_name') : null,
        ];
    }

    protected function findCustomerByPhone(int $merchantId, string $normalizedPhone): ?Customer
    {
        $candidates = array_values(array_unique(array_filter([
            $normalizedPhone,
            str_starts_with($normalizedPhone, '0') ? substr($normalizedPhone, 1) : null,
            str_starts_with($normalizedPhone, '0') ? $normalizedPhone : '0'.$normalizedPhone,
        ])));

        return Customer::query()
            ->where('merchant_id', $merchantId)
            ->whereIn('phone', $candidates)
            ->first();
    }

    protected function formatCustomer(Customer $c, bool $detailed = false): array
    {
        $data = [
            'id' => $c->id,
            'first_name' => $c->first_name,
            'last_name' => $c->last_name,
            'full_name' => $c->full_name,
            'email' => $c->email,
            'phone' => $c->phone,
            'status' => $c->status,
            'orders_count' => $c->orders_count,
            'total_spent' => MoneyHelper::fromMinor($c->total_spent_amount),
            'wallet_balance' => MoneyHelper::fromMinor($c->wallet_balance_amount ?? 0),
        ];

        if ($detailed) {
            $addresses = $c->relationLoaded('addresses')
                ? $c->addresses
                : $c->addresses()->with('deliveryRegion')->get();
            $data['addresses'] = $addresses->map(fn (CustomerAddress $a) => $this->formatAddress($a))->values()->all();
            $data['last_order_at'] = $c->last_order_at;
        }

        return $data;
    }

    protected function formatAddress(CustomerAddress $a): array
    {
        return [
            'id' => $a->id,
            'label' => $a->label,
            'full_name' => $a->full_name,
            'phone' => $a->phone,
            'delivery_region_id' => $a->delivery_region_id,
            'region_name' => $a->deliveryRegion?->name ?? $a->city,
            'city' => $a->city,
            'area' => $a->area,
            'street' => $a->street,
            'building' => $a->building,
            'notes' => $a->notes,
            'is_default' => (bool) $a->is_default,
        ];
    }
}
