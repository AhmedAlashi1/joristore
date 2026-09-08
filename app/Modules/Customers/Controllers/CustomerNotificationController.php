<?php

namespace App\Modules\Customers\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerNotification;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerNotificationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));

        $paginator = CustomerNotification::query()
            ->with('customer:id,first_name,last_name,phone')
            ->orderByDesc('id')
            ->paginate($perPage);

        return sendResponse($paginator, 'Customer notifications fetched');
    }

    public function send(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:2000',
            'customer_id' => 'nullable|integer|exists:customers,id',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $merchantId = MerchantContext::merchantId();
        $now = now();

        $customersQuery = Customer::query()->where('merchant_id', $merchantId)->where('status', 'active');
        if (! empty($data['customer_id'])) {
            $customersQuery->where('id', $data['customer_id']);
        }

        $customers = $customersQuery->get(['id']);
        if ($customers->isEmpty()) {
            return sendError('No customers found', [], 422);
        }

        $rows = $customers->map(fn (Customer $c) => [
            'merchant_id' => $merchantId,
            'customer_id' => $c->id,
            'title' => $data['title'],
            'message' => $data['message'],
            'type' => 'broadcast',
            'data' => json_encode(['sent_by' => auth()->id()]),
            'created_at' => $now,
        ])->all();

        CustomerNotification::query()->insert($rows);

        return sendResponse(['sent_count' => count($rows)], 'Notifications sent');
    }
}
