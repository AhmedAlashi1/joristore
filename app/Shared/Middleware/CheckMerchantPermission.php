<?php

namespace App\Shared\Middleware;

use App\Shared\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMerchantPermission
{
    public function __construct(protected PermissionService $permissions) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return sendError('Forbidden', [], 403);
        }

        foreach (explode('|', $permission) as $perm) {
            if ($this->permissions->hasPermission($user, trim($perm))) {
                return $next($request);
            }
        }

        return sendError('Forbidden', [], 403);
    }
}
