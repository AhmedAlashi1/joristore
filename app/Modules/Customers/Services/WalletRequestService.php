<?php

namespace App\Modules\Customers\Services;

use App\Models\User;
use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerWalletRequest;
use App\Shared\Services\PaymentApprovalNotificationService;
use Illuminate\Support\Facades\DB;

class WalletRequestService
{
    public function __construct(
        protected WalletService $wallet,
        protected PaymentApprovalNotificationService $paymentNotifications,
    ) {}

    public function createTopUp(
        Customer $customer,
        int $amountMinor,
        string $paymentMethod,
        ?string $transferReference,
        ?string $accountHolderName,
        ?string $receiptPath,
        ?string $note,
    ): CustomerWalletRequest {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Amount must be positive');
        }

        return CustomerWalletRequest::create([
            'customer_id' => $customer->id,
            'type' => CustomerWalletRequest::TYPE_TOP_UP,
            'amount' => $amountMinor,
            'status' => CustomerWalletRequest::STATUS_PENDING,
            'payment_method' => $paymentMethod,
            'transfer_reference' => $transferReference ?: null,
            'account_holder_name' => $accountHolderName ?: null,
            'receipt_path' => $receiptPath,
            'customer_note' => $note,
        ]);
    }

    public function createWithdrawal(
        Customer $customer,
        int $amountMinor,
        string $paymentMethod,
        string $transferReference,
        string $accountHolderName,
        ?string $note,
    ): CustomerWalletRequest {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Amount must be positive');
        }

        $balance = (int) ($customer->wallet_balance_amount ?? 0);
        if ($balance < $amountMinor) {
            throw new \RuntimeException('Insufficient wallet balance');
        }

        $pendingWithdrawals = CustomerWalletRequest::query()
            ->where('customer_id', $customer->id)
            ->where('type', CustomerWalletRequest::TYPE_WITHDRAWAL)
            ->where('status', CustomerWalletRequest::STATUS_PENDING)
            ->sum('amount');

        if ($balance < $amountMinor + (int) $pendingWithdrawals) {
            throw new \RuntimeException('Amount exceeds available balance (pending withdrawals included)');
        }

        return CustomerWalletRequest::create([
            'customer_id' => $customer->id,
            'type' => CustomerWalletRequest::TYPE_WITHDRAWAL,
            'amount' => $amountMinor,
            'status' => CustomerWalletRequest::STATUS_PENDING,
            'payment_method' => $paymentMethod,
            'transfer_reference' => $transferReference,
            'account_holder_name' => $accountHolderName,
            'customer_note' => $note,
        ]);
    }

    public function approve(
        CustomerWalletRequest $request,
        User $admin,
        ?string $adminNote = null,
        ?string $adminTransferReceiptPath = null,
    ): CustomerWalletRequest {
        if ($request->status !== CustomerWalletRequest::STATUS_PENDING) {
            throw new \RuntimeException('Request is not pending');
        }

        return DB::transaction(function () use ($request, $admin, $adminNote, $adminTransferReceiptPath) {
            $locked = CustomerWalletRequest::query()->whereKey($request->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== CustomerWalletRequest::STATUS_PENDING) {
                throw new \RuntimeException('Request is not pending');
            }

            $customer = Customer::query()->whereKey($locked->customer_id)->lockForUpdate()->firstOrFail();

            if ($locked->type === CustomerWalletRequest::TYPE_TOP_UP) {
                $txn = $this->wallet->credit(
                    $customer,
                    (int) $locked->amount,
                    WalletService::REF_WALLET_TOP_UP,
                    $locked->id,
                    $locked->customer_note ?: 'Wallet top-up',
                );
            } else {
                $txn = $this->wallet->debit(
                    $customer,
                    (int) $locked->amount,
                    WalletService::REF_WALLET_WITHDRAWAL,
                    $locked->id,
                    $locked->customer_note ?: 'Wallet withdrawal',
                );
            }

            $locked->update([
                'status' => CustomerWalletRequest::STATUS_APPROVED,
                'wallet_transaction_id' => $txn->id,
                'admin_note' => $adminNote,
                'admin_transfer_receipt_path' => $adminTransferReceiptPath ?? $locked->admin_transfer_receipt_path,
                'processed_by' => $admin->id,
                'processed_at' => now(),
            ]);

            $fresh = $locked->fresh();

            if ($fresh->type === CustomerWalletRequest::TYPE_TOP_UP) {
                $this->paymentNotifications->notifyWalletTopUpApproved($fresh, $adminTransferReceiptPath);
            } else {
                $this->paymentNotifications->notifyWalletWithdrawalApproved($fresh, $adminTransferReceiptPath);
            }

            return $fresh;
        });
    }

    public function reject(CustomerWalletRequest $request, User $admin, ?string $adminNote = null): CustomerWalletRequest
    {
        if ($request->status !== CustomerWalletRequest::STATUS_PENDING) {
            throw new \RuntimeException('Request is not pending');
        }

        $request->update([
            'status' => CustomerWalletRequest::STATUS_REJECTED,
            'admin_note' => $adminNote,
            'processed_by' => $admin->id,
            'processed_at' => now(),
        ]);

        return $request->fresh();
    }
}
