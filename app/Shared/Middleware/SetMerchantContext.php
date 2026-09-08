<?php

namespace App\Shared\Middleware;

use App\Shared\Services\MerchantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetMerchantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $member = MerchantContext::resolveForUser($user);

            if (! $member) {
                return sendError('No active merchant membership found', [], 403);
            }

            MerchantContext::set($member);
        }

        $response = $next($request);

        MerchantContext::clear();

        return $response;
    }
}
