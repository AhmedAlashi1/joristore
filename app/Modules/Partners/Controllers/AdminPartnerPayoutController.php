<?php

namespace App\Modules\Partners\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Partners\Models\Partner;
use App\Modules\Partners\Models\PartnerPayout;
use App\Modules\Partners\Services\PartnerPayoutService;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminPartnerPayoutController extends Controller
{
    public function __construct(
        protected PartnerPayoutService $payouts,
        protected ActivityLogService $activityLog,
    ) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $partnerId = $request->input('partner_id');

        $query = PartnerPayout::query()->with('partner')->orderByDesc('id');
        if ($partnerId) {
            $query->where('partner_id', (int) $partnerId);
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (PartnerPayout $p) => $this->payouts->formatPayout($p));

        return sendResponse($paginator, 'Partner payouts fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'partner_id' => 'required|integer|exists:partners,id',
            'amount' => 'required|numeric|min:0.01',
            'receipt_path' => 'nullable|string|max:500',
            'admin_note' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $partner = Partner::find($data['partner_id']);
        if (! $partner) {
            return sendError('Partner not found', [], 404);
        }

        try {
            $payout = $this->payouts->createPayout(
                $partner,
                MoneyHelper::toMinor((float) $data['amount']),
                $data['receipt_path'] ?? null,
                $data['admin_note'] ?? null,
                auth()->id(),
            );
        } catch (\RuntimeException $e) {
            return sendError($e->getMessage(), [], 422);
        }

        $this->activityLog->log(
            'partner_payout.created',
            'partners',
            "Payout for partner {$partner->name}",
            PartnerPayout::class,
            $payout->id,
            request: $request,
        );

        return sendResponse($this->payouts->formatPayout($payout), 'Payout recorded');
    }
}
