<?php

namespace App\Shared\Middleware;

use App\Modules\Customers\Models\Customer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetStoreCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        $customerId = $request->header('X-Customer-Id') ?? $request->input('customer_id');

        if (! $customerId) {
            return sendError('Customer authentication required', [], 401);
        }

        $customer = Customer::query()->find($customerId);

        if (! $customer) {
            return sendError('Customer not found', [], 404);
        }

        $request->attributes->set('store_customer', $customer);

        return $next($request);
    }
}
