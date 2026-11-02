<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/admin/index';

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $path = $request->path();
            $isStorefrontApi = str_contains($path, 'api/store')
                || str_contains($path, 'index.php/api/store');

            if ($isStorefrontApi) {
                return Limit::perMinute(400)->by($request->ip());
            }

            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
