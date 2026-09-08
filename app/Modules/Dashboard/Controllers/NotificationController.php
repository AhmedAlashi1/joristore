<?php

namespace App\Modules\Dashboard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Dashboard\Models\Notification;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));
        $userId = auth()->id();

        $query = Notification::query()
            ->where('merchant_id', MerchantContext::merchantId())
            ->where(function ($q) use ($userId) {
                $q->whereNull('user_id')->orWhere('user_id', $userId);
            })
            ->latest('created_at');

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        return sendResponse($query->paginate($perPage), 'Notifications fetched');
    }

    public function unreadCount()
    {
        $count = Notification::query()
            ->where('merchant_id', MerchantContext::merchantId())
            ->whereNull('read_at')
            ->count();

        return sendResponse(['count' => $count], 'Unread count');
    }

    public function markRead(int $id)
    {
        $notification = Notification::query()
            ->where('merchant_id', MerchantContext::merchantId())
            ->find($id);

        if (! $notification) {
            return sendError('Not found', [], 404);
        }

        $notification->update(['read_at' => now()]);

        return sendResponse([], 'Marked as read');
    }

    public function markAllRead()
    {
        Notification::query()
            ->where('merchant_id', MerchantContext::merchantId())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return sendResponse([], 'All marked as read');
    }
}
