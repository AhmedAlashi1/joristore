<?php

namespace App\Modules\Customers\Controllers;

use App\Http\Controllers\Controller;
use App\Shared\Services\CustomerNotificationDispatchService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerNotificationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));

        $paginator = \App\Modules\Customers\Models\CustomerNotification::query()
            ->with('customer:id,first_name,last_name,phone')
            ->orderByDesc('id')
            ->paginate($perPage);

        return sendResponse($paginator, 'Customer notifications fetched');
    }

    public function send(Request $request, CustomerNotificationDispatchService $dispatch)
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

        if (! empty($data['customer_id'])) {
            $belongs = \App\Modules\Customers\Models\Customer::query()
                ->where('merchant_id', $merchantId)
                ->where('id', $data['customer_id'])
                ->exists();
            if (! $belongs) {
                return sendError('Customer not found', [], 404);
            }
        }

        $result = $dispatch->sendToCustomers(
            $merchantId,
            $data['title'],
            $data['message'],
            $data['customer_id'] ?? null,
            auth()->id(),
        );

        if ($result['sent_count'] === 0) {
            return sendError('No customers found', [], 422);
        }

        return sendResponse($result, 'Notifications sent');
    }
}
