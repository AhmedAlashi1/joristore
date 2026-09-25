<?php

namespace App\Modules\Storefront\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customers\Models\PushSubscription;
use App\Shared\Services\MerchantContext;
use App\Shared\Services\WebPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StorefrontPushController extends Controller
{
    public function vapidPublicKey(WebPushService $webPush)
    {
        return sendResponse([
            'enabled' => $webPush->isConfigured(),
            'public_key' => $webPush->publicKey(),
        ], 'VAPID public key');
    }

    public function subscribe(Request $request)
    {
        $customer = $request->attributes->get('store_customer');
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string|max:500',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string|max:255',
            'keys.auth' => 'required|string|max:255',
            'content_encoding' => 'nullable|string|max:32',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        PushSubscription::query()->updateOrCreate(
            [
                'merchant_id' => $merchantId,
                'endpoint' => $data['endpoint'],
            ],
            [
                'customer_id' => $customer->id,
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'content_encoding' => $data['content_encoding'] ?? 'aesgcm',
            ],
        );

        return sendResponse([], 'Push subscription saved');
    }

    public function unsubscribe(Request $request)
    {
        $customer = $request->attributes->get('store_customer');
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        PushSubscription::query()
            ->where('merchant_id', $merchantId)
            ->where('customer_id', $customer->id)
            ->where('endpoint', $validator->validated()['endpoint'])
            ->delete();

        return sendResponse([], 'Push subscription removed');
    }
}
