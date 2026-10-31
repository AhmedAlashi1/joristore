<?php

namespace App\Modules\Partners\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Orders\Models\Order;
use App\Modules\Partners\Models\PartnerCommission;
use App\Shared\Helpers\MoneyHelper;
use Illuminate\Http\Request;

class AdminPartnerCommissionController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $partnerId = $request->input('partner_id');
        $status = $request->input('status');

        $query = PartnerCommission::query()
            ->with(['partner', 'order', 'coupon'])
            ->orderByDesc('id');

        if ($partnerId) {
            $query->where('partner_id', (int) $partnerId);
        }
        if ($status) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (PartnerCommission $c) => $this->format($c));

        return sendResponse($paginator, 'Partner commissions fetched');
    }

    protected function format(PartnerCommission $c): array
    {
        /** @var Order|null $order */
        $order = $c->order;

        return [
            'id' => $c->id,
            'partner_id' => $c->partner_id,
            'partner_name' => $c->partner?->name,
            'order_id' => $c->order_id,
            'order_number' => $order?->order_number,
            'coupon_code' => $c->coupon?->code,
            'order_subtotal' => MoneyHelper::fromMinor($c->order_subtotal_amount),
            'commission_amount' => MoneyHelper::fromMinor($c->commission_amount),
            'status' => $c->status,
            'partner_payout_id' => $c->partner_payout_id,
            'created_at' => $c->created_at,
        ];
    }
}
