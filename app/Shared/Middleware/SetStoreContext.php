<?php

namespace App\Shared\Middleware;

use App\Modules\Merchants\Models\Store;
use App\Shared\Enums\StoreStatus;
use App\Shared\Services\MerchantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetStoreContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->route('store')
            ?? $request->header('X-Store-Slug')
            ?? config('storefront.default_slug', 'jori-store');

        $store = Store::query()
            ->with('merchant')
            ->where('slug', $slug)
            ->where('status', StoreStatus::Active)
            ->first();

        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        MerchantContext::setStorefront($store->merchant_id, $store);

        $response = $next($request);

        MerchantContext::clear();

        return $response;
    }
}
