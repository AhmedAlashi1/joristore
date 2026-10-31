<?php

namespace App\Modules\Customers\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerWalletRequest;
use App\Modules\Customers\Models\CustomerWalletTransaction;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Customer::query()->withCount('addresses')->orderByDesc('id');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Customer $c) => $this->format($c));

        return sendResponse($paginator, 'Customers fetched');
    }

    public function options()
    {
        $items = Customer::query()->where('status', 'active')->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'phone']);
        return sendResponse($items->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->full_name,
            'email' => $c->email,
            'phone' => $c->phone,
        ]), 'Customer options');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,blocked,inactive',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $customer = Customer::create([...$validator->validated(), 'status' => $request->input('status', 'active')]);
        $this->activityLog->log('customer.created', 'customers', "Customer {$customer->full_name} created", Customer::class, $customer->id, request: $request);

        return sendResponse($this->format($customer), 'Customer created');
    }

    public function show(int $id)
    {
        $customer = Customer::with('addresses')->find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        return sendResponse($this->format($customer, true), 'Customer details');
    }

    public function update(Request $request, int $id)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,blocked,inactive',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $customer->update($validator->validated());
        $this->activityLog->log('customer.updated', 'customers', "Customer {$customer->full_name} updated", Customer::class, $customer->id, request: $request);

        return sendResponse($this->format($customer->fresh()), 'Customer updated');
    }

    public function destroy(Request $request, int $id)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        if ($customer->orders()->exists()) {
            return sendError('Customer has orders', [], 422);
        }

        $name = $customer->full_name;
        $customer->delete();
        $this->activityLog->log('customer.deleted', 'customers', "Customer {$name} deleted", request: $request);

        return sendResponse([], 'Customer deleted');
    }

    public function storeAddress(Request $request, int $id)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'nullable|in:shipping,billing',
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'city' => 'required|string|max:255',
            'area' => 'nullable|string|max:255',
            'street' => 'nullable|string|max:255',
            'building' => 'nullable|string|max:255',
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
            $customer->addresses()->update(['is_default' => false]);
        }

        $address = $customer->addresses()->create([
            ...$data,
            'type' => $data['type'] ?? 'shipping',
            'country_code' => 'SA',
            'is_default' => $data['is_default'] ?? ! $customer->addresses()->exists(),
        ]);

        return sendResponse($address, 'Address created');
    }

    public function updateAddress(Request $request, int $id, int $addressId)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        $address = $customer->addresses()->find($addressId);
        if (! $address) {
            return sendError('Address not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'full_name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'city' => 'sometimes|required|string|max:255',
            'area' => 'nullable|string|max:255',
            'street' => 'nullable|string|max:255',
            'building' => 'nullable|string|max:255',
            'is_default' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        if ($data['is_default'] ?? false) {
            $customer->addresses()->where('id', '!=', $addressId)->update(['is_default' => false]);
        }

        $address->update($data);

        return sendResponse($address->fresh(), 'Address updated');
    }

    public function destroyAddress(int $id, int $addressId)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        $customer->addresses()->where('id', $addressId)->delete();

        return sendResponse([], 'Address deleted');
    }

    public function cart(int $id)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        $items = is_array($customer->cart_snapshot) ? $customer->cart_snapshot : [];
        $total = 0.0;
        $count = 0;
        foreach ($items as $row) {
            if (! is_array($row)) {
                continue;
            }
            $qty = max(1, (int) ($row['quantity'] ?? 1));
            $price = (float) ($row['price'] ?? 0);
            $total += $price * $qty;
            $count += $qty;
        }

        return sendResponse([
            'customer_id' => $customer->id,
            'customer_name' => $customer->full_name,
            'items' => $items,
            'item_count' => $count,
            'total' => round($total, 2),
            'synced_at' => $customer->cart_synced_at,
        ], 'Customer cart');
    }

    public function walletActivity(int $id)
    {
        $customer = Customer::find($id);
        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

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

        $transactions = CustomerWalletTransaction::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (CustomerWalletTransaction $tx) => [
                'id' => $tx->id,
                'type' => $tx->type,
                'amount' => MoneyHelper::fromMinor($tx->amount),
                'balance_after' => MoneyHelper::fromMinor($tx->balance_after),
                'note' => $tx->note,
                'created_at' => $tx->created_at,
            ]);

        $requests = CustomerWalletRequest::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->limit(30)
            ->get()
            ->map(fn (CustomerWalletRequest $r) => [
                'id' => $r->id,
                'type' => $r->type,
                'amount' => MoneyHelper::fromMinor($r->amount),
                'status' => $r->status,
                'payment_method' => $r->payment_method,
                'created_at' => $r->created_at,
            ]);

        return sendResponse([
            'customer_id' => $customer->id,
            'customer_name' => $customer->full_name,
            'balance' => MoneyHelper::fromMinor($customer->wallet_balance_amount ?? 0),
            'pending_top_up' => MoneyHelper::fromMinor((int) $pendingTopUp),
            'pending_withdrawal' => MoneyHelper::fromMinor((int) $pendingWithdrawal),
            'transactions' => $transactions,
            'requests' => $requests,
        ], 'Wallet activity');
    }

    protected function format(Customer $c, bool $detailed = false): array
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
            'last_order_at' => $c->last_order_at,
            'created_at' => $c->created_at,
            'addresses_count' => $detailed ? null : ($c->addresses_count ?? $c->addresses()->count()),
        ];

        if ($detailed) {
            $data['notes'] = $c->notes;
            $data['addresses'] = $c->addresses ?? [];
        }

        return $data;
    }
}
