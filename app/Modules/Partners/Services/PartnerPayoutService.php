<?php

namespace App\Modules\Partners\Services;

use App\Modules\Partners\Models\Partner;
use App\Modules\Partners\Models\PartnerCommission;
use App\Modules\Partners\Models\PartnerPayout;
use App\Shared\Services\MerchantContext;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PartnerPayoutService
{
    public function __construct(protected PartnerCommissionService $commissions) {}

    public function createPayout(
        Partner $partner,
        int $amountMinor,
        ?string $receiptPath,
        ?string $adminNote,
        ?int $createdByUserId,
    ): PartnerPayout {
        $pending = $this->commissions->pendingTotalForPartner($partner->id);
        if ($amountMinor <= 0) {
            throw new RuntimeException('Payout amount must be greater than zero');
        }
        if ($amountMinor > $pending) {
            throw new RuntimeException('Payout amount exceeds pending partner balance');
        }

        return DB::transaction(function () use ($partner, $amountMinor, $receiptPath, $adminNote, $createdByUserId) {
            $payout = PartnerPayout::create([
                'merchant_id' => $partner->merchant_id,
                'partner_id' => $partner->id,
                'amount' => $amountMinor,
                'receipt_path' => $receiptPath,
                'admin_note' => $adminNote,
                'created_by' => $createdByUserId,
                'paid_at' => now(),
            ]);

            $remaining = $amountMinor;
            $rows = PartnerCommission::query()
                ->where('partner_id', $partner->id)
                ->where('status', 'pending')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($rows as $row) {
                if ($remaining <= 0) {
                    break;
                }
                if ($row->commission_amount <= $remaining) {
                    $row->update([
                        'status' => 'paid',
                        'partner_payout_id' => $payout->id,
                    ]);
                    $remaining -= $row->commission_amount;
                }
            }

            if ($remaining > 0) {
                throw new RuntimeException('Could not allocate payout to pending commissions');
            }

            return $payout->fresh(['partner']);
        });
    }

    public function formatPayout(PartnerPayout $payout): array
    {
        return [
            'id' => $payout->id,
            'partner_id' => $payout->partner_id,
            'partner_name' => $payout->partner?->name,
            'amount' => \App\Shared\Helpers\MoneyHelper::fromMinor($payout->amount),
            'receipt_path' => $payout->receipt_path,
            'receipt_url' => $payout->receipt_path ? url($payout->receipt_path) : null,
            'admin_note' => $payout->admin_note,
            'paid_at' => $payout->paid_at,
            'created_at' => $payout->created_at,
        ];
    }
}
