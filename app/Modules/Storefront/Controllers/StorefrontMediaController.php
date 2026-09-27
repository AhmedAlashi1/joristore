<?php

namespace App\Modules\Storefront\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customers\Models\Customer;
use App\Shared\Services\MediaUploadService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StorefrontMediaController extends Controller
{
    public function __construct(protected MediaUploadService $media) {}

    public function uploadPaymentReceipt(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        if (! $merchantId) {
            return sendError('Store not found', [], 404);
        }

        /** @var Customer $customer */
        $customer = $request->attributes->get('store_customer');

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $path = $this->media->upload($request->file('file'), $merchantId, 'payment-receipts');

        return sendResponse([
            'path' => $path,
            'url' => url($path),
            'customer_id' => $customer->id,
        ], 'Receipt uploaded');
    }
}
