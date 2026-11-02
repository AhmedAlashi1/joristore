<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SpaShellController extends Controller
{
    /** Serve React index.html for client-side routes (admin panel on dashboard host). */
    public function admin(): BinaryFileResponse
    {
        $index = $this->resolveSpaIndex();
        abort_unless($index !== null, 404);

        return response()->file($index, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    private function resolveSpaIndex(): ?string
    {
        $path = public_path('spa/index.html');

        return File::isFile($path) ? $path : null;
    }
}
