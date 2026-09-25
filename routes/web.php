<?php

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
    return response()->json([
        'app' => config('app.name'),
        'type' => 'api',
        'message' => 'Jori Store API — frontend runs separately (see /frontend)',
        'api' => url('/api'),
        'storage' => url('/storage'),
    ]);
});

Route::get('/storage/{path}', function (string $path) {
    $storageFile = public_path('storage/'.$path);
    abort_unless(File::isFile($storageFile), 404);

    return publicFileResponse($storageFile);
})->where('path', '.*');
