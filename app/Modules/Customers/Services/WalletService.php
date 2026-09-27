<?php

namespace App\Modules\Customers\Services;

use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerWalletTransaction;
use App\Modules\Orders\Models\Order;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public const REF_ORDER_RETURN = 'order_return';

    public function credit(Customer $customer, int $amountMinor, ?string $referenceType = null, ?int $referenceId = null, ?string $note = null): CustomerWalletTransaction
    {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Credit amount must be positive');
        }

        return DB::transaction(function () use ($customer, $amountMinor, $referenceType, $referenceId, $note) {
            if ($referenceType !== null && $referenceId !== null) {
                $existing = CustomerWalletTransaction::query()
                    ->where('customer_id', $customer->id)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            $locked = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $newBalance = $locked->wallet_balance_amount + $amountMinor;
            $locked->update(['wallet_balance_amount' => $newBalance]);

            return CustomerWalletTransaction::create([
                'customer_id' => $locked->id,
                'type' => 'credit',
                'amount' => $amountMinor,
                'balance_after' => $newBalance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
            ]);
        });
    }

    public function debit(Customer $customer, int $amountMinor, ?string $referenceType = null, ?int $referenceId = null, ?string $note = null): CustomerWalletTransaction
    {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Debit amount must be positive');
        }

        return DB::transaction(function () use ($customer, $amountMinor, $referenceType, $referenceId, $note) {
            if ($referenceType !== null && $referenceId !== null) {
                $existing = CustomerWalletTransaction::query()
                    ->where('customer_id', $customer->id)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            $locked = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            if ($locked->wallet_balance_amount < $amountMinor) {
                throw new \RuntimeException('Insufficient wallet balance');
            }

            $newBalance = $locked->wallet_balance_amount - $amountMinor;
            $locked->update(['wallet_balance_amount' => $newBalance]);

            return CustomerWalletTransaction::create([
                'customer_id' => $locked->id,
                'type' => 'debit',
                'amount' => $amountMinor,
                'balance_after' => $newBalance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
            ]);
        });
    }

    public function creditForReturnedOrder(Order $order): ?CustomerWalletTransaction
    {
        if (! $order->customer_id) {
            return null;
        }

        $customer = Customer::find($order->customer_id);
        if (! $customer) {
            return null;
        }

        $amount = (int) $order->total_amount;
        if ($amount <= 0) {
            return null;
        }

        return $this->credit(
            $customer,
            $amount,
            self::REF_ORDER_RETURN,
            $order->id,
            'Refund for returned order '.$order->order_number,
        );
    }
}
