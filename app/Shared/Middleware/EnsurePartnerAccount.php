<?php

namespace App\Shared\Middleware;

use App\Modules\Partners\Models\PartnerAccount;
use App\Shared\Services\MerchantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePartnerAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof PartnerAccount) {
            return sendError('Partner authentication required', [], 401);
        }

        $user->loadMissing('partner');
        $merchantId = MerchantContext::merchantId();
        if ($merchantId && (int) $user->partner->merchant_id !== (int) $merchantId) {
            return sendError('Partner not found for this store', [], 404);
        }

        if ($user->partner->status !== 'active') {
            return sendError('Partner account is inactive', [], 403);
        }

        $request->attributes->set('partner_account', $user);
        $request->attributes->set('partner', $user->partner);

        return $next($request);
    }
}
