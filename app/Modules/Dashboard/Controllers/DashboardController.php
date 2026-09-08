<?php

namespace App\Modules\Dashboard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Product;
use App\Modules\Customers\Models\Customer;
use App\Modules\Dashboard\Models\ActivityLog;
use App\Modules\Merchants\Models\MerchantMember;
use App\Modules\Orders\Models\Order;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\MerchantContext;

class DashboardController extends Controller
{
    public function stats()
    {
        $merchantId = MerchantContext::merchantId();

        $productsCount = Product::query()->count();
        $staffCount = MerchantMember::where('merchant_id', $merchantId)->count();
        $customersCount = Customer::query()->count();
        $lowStock = Product::query()
            ->whereHas('defaultVariant.inventory', fn ($q) => $q->whereColumn('quantity', '<=', 'low_stock_threshold'))
            ->count();

        $totalSales = Order::query()
            ->whereIn('status', ['completed', 'shipped'])
            ->sum('total_amount');

        $ordersToday = Order::query()
            ->whereDate('placed_at', today())
            ->count();

        $processingOrders = Order::query()
            ->whereIn('status', ['pending', 'confirmed', 'processing', 'ready'])
            ->count();

        $recentOrders = Order::query()
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'order_number', 'customer_name', 'status', 'total_amount', 'placed_at'])
            ->map(fn (Order $o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'customer_name' => $o->customer_name,
                'status' => $o->status,
                'total' => MoneyHelper::fromMinor($o->total_amount),
                'placed_at' => $o->placed_at,
            ]);

        return sendResponse([
            'total_sales' => MoneyHelper::fromMinor($totalSales),
            'orders_today' => $ordersToday,
            'processing_orders' => $processingOrders,
            'customers_count' => $customersCount,
            'products_count' => $productsCount,
            'staff_count' => $staffCount,
            'low_stock_count' => $lowStock,
            'recent_orders' => $recentOrders,
            'recent_activities' => ActivityLog::query()
                ->where('merchant_id', $merchantId)
                ->with('user:id,name')
                ->latest('created_at')
                ->limit(10)
                ->get(),
        ], 'Dashboard stats fetched');
    }
}
