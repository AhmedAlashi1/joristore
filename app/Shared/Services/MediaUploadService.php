<?php

namespace App\Shared\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadService
{
    /** @var list<string> */
    protected array $allowedFolders = ['logos', 'banners', 'categories', 'products'];

    public function upload(UploadedFile $file, int $merchantId, string $folder): string
    {
        if (! in_array($folder, $this->allowedFolders, true)) {
            throw new \InvalidArgumentException('Invalid upload folder');
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $filename = Str::uuid()->toString().'.'.$extension;
        $directory = "merchants/{$merchantId}/{$folder}";

        Storage::disk('public')->putFileAs($directory, $file, $filename);

        return '/storage/'.$directory.'/'.$filename;
    }

    public function deleteByPublicPath(?string $publicPath): void
    {
        if (! $publicPath || ! str_starts_with($publicPath, '/storage/')) {
            return;
        }

        $relative = ltrim(substr($publicPath, strlen('/storage/')), '/');
        if ($relative && Storage::disk('public')->exists($relative)) {
            Storage::disk('public')->delete($relative);
        }
    }
}
