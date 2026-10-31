<?php

namespace App\Modules\Partners\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Partners\Models\PartnerCommission;
use App\Modules\Partners\Models\PartnerPayout;
use App\Modules\Partners\Services\PartnerCommissionService;
use App\Modules\Partners\Services\PartnerPayoutService;
use App\Shared\Helpers\MoneyHelper;
use Illuminate\Http\Request;

class PartnerPortalController extends Controller
{
    public function __construct(
        protected PartnerCommissionService $commissions,
        protected PartnerPayoutService $payouts,
    ) {}

    public function dashboard(Request $request)
    {
        $partner = $request->attributes->get('partner');
        $partnerId = $partner->id;

        $pendingMinor = $this->commissions->pendingTotalForPartner($partnerId);
        $paidMinor = (int) PartnerCommission::query()
            ->where('partner_id', $partnerId)
            ->where('status', 'paid')
            ->sum('commission_amount');
        $ordersCount = PartnerCommission::query()->where('partner_id', $partnerId)->count();

        return sendResponse([
            'pending_commission' => MoneyHelper::fromMinor($pendingMinor),
            'paid_commission' => MoneyHelper::fromMinor($paidMinor),
            'orders_count' => $ordersCount,
        ], 'Partner dashboard');
    }

    public function commissions(Request $request)
    {
        $partner = $request->attributes->get('partner');
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));

        $paginator = PartnerCommission::query()
            ->with(['order', 'coupon'])
            ->where('partner_id', $partner->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        $paginator->getCollection()->transform(function (PartnerCommission $c) {
            return [
                'id' => $c->id,
                'order_id' => $c->order_id,
                'order_number' => $c->order?->order_number,
                'coupon_code' => $c->coupon?->code,
                'order_subtotal' => MoneyHelper::fromMinor($c->order_subtotal_amount),
                'commission_amount' => MoneyHelper::fromMinor($c->commission_amount),
                'status' => $c->status,
                'created_at' => $c->created_at,
            ];
        });

        return sendResponse($paginator, 'Commissions fetched');
    }

    public function payouts(Request $request)
    {
        $partner = $request->attributes->get('partner');
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));

        $paginator = PartnerPayout::query()
            ->where('partner_id', $partner->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        $paginator->getCollection()->transform(fn (PartnerPayout $p) => $this->payouts->formatPayout($p));

        return sendResponse($paginator, 'Payouts fetched');
    }
}
