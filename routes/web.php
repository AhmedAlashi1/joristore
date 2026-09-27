<?php

use App\Http\Controllers\SpaShellController;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

if (! function_exists('publicMimeType')) {
    function publicMimeType(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'css' => 'text/css; charset=utf-8',
            'js' => 'application/javascript; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            default => 'application/octet-stream',
        };
    }
}

if (! function_exists('publicFileResponse')) {
    function publicFileResponse(string $absolutePath): BinaryFileResponse
    {
        $response = response()->file($absolutePath);
        $response->headers->set('Content-Type', publicMimeType($absolutePath));

        return $response;
    }
}

Route::get('/', function () {
    $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
    if ($appHost && strcasecmp($appHost, request()->getHost()) === 0) {
        return redirect('/admin/login');
    }

    return response()->json([
        'app' => config('app.name'),
        'type' => 'api',
        'message' => 'Jori Store API — storefront at https://joristore.com',
        'api' => url('/api'),
        'storage' => url('/storage'),
    ]);
});

Route::get('/storage/{path}', function (string $path) {
    $storageFile = public_path('storage/'.$path);
    abort_unless(File::isFile($storageFile), 404);

    return publicFileResponse($storageFile);
})->where('path', '.*');

/** Admin UI (React) — static assets from `public/` or `public/spa/`; HTML shell here. */
Route::get('/admin', [SpaShellController::class, 'admin']);
Route::get('/admin/{spaPath}', [SpaShellController::class, 'admin'])->where('spaPath', '.*');
