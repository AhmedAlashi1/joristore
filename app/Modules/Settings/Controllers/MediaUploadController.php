<?php

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Shared\Services\MediaUploadService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MediaUploadController extends Controller
{
    public function __construct(protected MediaUploadService $media) {}

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        if (! $merchantId) {
            return sendError('Merchant not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:jpeg,jpg,png,webp,gif,svg|max:5120',
            'folder' => ['required', Rule::in($this->media->allowedFolders())],
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $folder = $validator->validated()['folder'];
        $path = $this->media->upload($request->file('file'), $merchantId, $folder);

        return sendResponse([
            'path' => $path,
            'url' => url($path),
        ], 'File uploaded');
    }
}
