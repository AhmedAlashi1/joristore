<?php

namespace App\Modules\Dashboard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Dashboard\Models\ActivityLog;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));

        $query = ActivityLog::query()
            ->where('merchant_id', $merchantId)
            ->with('user:id,name')
            ->latest('created_at');

        if ($module = $request->input('module')) {
            $query->where('module', $module);
        }

        return sendResponse($query->paginate($perPage), 'Activity logs fetched');
    }
}
