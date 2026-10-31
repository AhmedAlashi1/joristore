<?php

namespace App\Shared\Services;

use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerWalletRequest;
use App\Modules\Merchants\Models\Store;
use App\Modules\Orders\Models\Order;
use App\Modules\Orders\Models\Payment;
use App\Shared\Helpers\MoneyHelper;

class PaymentApprovalNotificationService
{
    public function __construct(
        protected CustomerNotificationDispatchService $dispatch,
    ) {}

    public function notifyWalletTopUpApproved(CustomerWalletRequest $request, ?string $adminReceiptPath = null): void
    {
        $this->notifyWalletRequestApproved($request, $adminReceiptPath, true);
    }

    public function notifyWalletWithdrawalApproved(CustomerWalletRequest $request, ?string $adminReceiptPath = null): void
    {
        $this->notifyWalletRequestApproved($request, $adminReceiptPath, false);
    }

    protected function notifyWalletRequestApproved(
        CustomerWalletRequest $request,
        ?string $adminReceiptPath,
        bool $isTopUp,
    ): void {
        $request->loadMissing('customer');
        $customer = $request->customer;
        if (! $customer instanceof Customer) {
            return;
        }

        $methodLabel = $this->paymentMethodLabel((int) $customer->merchant_id, (string) ($request->payment_method ?? ''));
        $amount = MoneyHelper::fromMinor((int) $request->amount);
        $ref = (string) ($request->transfer_reference ?? '');
        $holder = (string) ($request->account_holder_name ?? '');
        $adminNote = trim((string) ($request->admin_note ?? ''));

        if ($isTopUp) {
            $titleAr = 'تمت الموافقة على شحن المحفظة';
            $titleEn = 'Wallet top-up approved';
            $type = 'wallet_top_up_approved';
            $kind = 'wallet_top_up_approved';
            $messageAr = "تمت الموافقة على شحن محفظتك بمبلغ {$amount} ₪.";
            $messageEn = "Your wallet top-up of {$amount} was approved.";
        } else {
            $titleAr = 'تمت الموافقة على سحب المحفظة';
            $titleEn = 'Wallet withdrawal approved';
            $type = 'wallet_withdrawal_approved';
            $kind = 'wallet_withdrawal_approved';
            $messageAr = "تمت الموافقة على سحب {$amount} ₪ من محفظتك.";
            $messageEn = "Your withdrawal of {$amount} was approved.";
        }

        if ($methodLabel['ar'] !== '') {
            $messageAr .= " طريقة الدفع: {$methodLabel['ar']}.";
            $messageEn .= " Method: {$methodLabel['en']}.";
        }
        if ($ref !== '') {
            $messageAr .= " رقم التحويل: {$ref}.";
            $messageEn .= " Transfer ref: {$ref}.";
        }
        if ($holder !== '') {
            $messageAr .= " صاحب الحساب: {$holder}.";
            $messageEn .= " Account: {$holder}.";
        }
        if ($adminNote !== '') {
            $messageAr .= " {$adminNote}";
            $messageEn .= " {$adminNote}";
        }

        $this->dispatch->notifyCustomer(
            (int) $customer->merchant_id,
            (int) $customer->id,
            $titleAr,
            $messageAr,
            $type,
            $this->payload(
                kind: $kind,
                paymentMethod: (string) ($request->payment_method ?? ''),
                methodLabel: $methodLabel,
                transferReference: $ref,
                accountHolderName: $holder,
                amount: $amount,
                customerReceiptPath: $request->receipt_path,
                adminReceiptPath: $adminReceiptPath ?? $request->admin_transfer_receipt_path,
                adminNote: $adminNote !== '' ? $adminNote : null,
            ),
            $titleEn,
            $messageEn,
        );
    }

    public function notifyOrderPaymentApproved(Order $order, Payment $payment, ?string $adminReceiptPath = null): void
    {
        if (! $order->customer_id) {
            return;
        }

        $customer = Customer::query()->find($order->customer_id);
        if (! $customer) {
            return;
        }

        $meta = $payment->metadata ?? [];
        $methodLabel = $this->paymentMethodLabel((int) $order->merchant_id, (string) $payment->payment_method);
        $amount = MoneyHelper::fromMinor((int) $payment->amount);
        $ref = (string) ($meta['transfer_reference'] ?? '');
        $holder = (string) ($meta['account_holder_name'] ?? '');
        $orderNo = (string) $order->order_number;

        $titleAr = 'تم تأكيد دفع طلبك';
        $titleEn = 'Order payment confirmed';
        $messageAr = "تم تأكيد الدفع للطلب {$orderNo} بمبلغ {$amount}. طريقة الدفع: {$methodLabel['ar']}. رقم التحويل: {$ref}. اسم صاحب الحساب: {$holder}.";
        $messageEn = "Payment confirmed for order {$orderNo} ({$amount}). Method: {$methodLabel['en']}. Transfer ref: {$ref}. Account name: {$holder}.";

        $adminPath = $adminReceiptPath ?? ($meta['admin_transfer_receipt_path'] ?? null);

        $this->dispatch->notifyCustomer(
            (int) $order->merchant_id,
            (int) $customer->id,
            $titleAr,
            $messageAr,
            'order_payment_approved',
            $this->payload(
                kind: 'order_payment_approved',
                paymentMethod: (string) $payment->payment_method,
                methodLabel: $methodLabel,
                transferReference: $ref,
                accountHolderName: $holder,
                amount: $amount,
                orderNumber: $orderNo,
                customerReceiptPath: $meta['receipt_path'] ?? null,
                adminReceiptPath: is_string($adminPath) ? $adminPath : null,
            ),
            $titleEn,
            $messageEn,
        );
    }

    /** @return array{ar: string, en: string} */
    protected function storeIdForMerchant(int $merchantId): int
    {
        return (int) (Store::query()->where('merchant_id', $merchantId)->value('id') ?? $merchantId);
    }

    /** @return array{ar: string, en: string} */
    protected function paymentMethodLabel(int $merchantId, string $methodId): array
    {
        $row = StoreSettingService::findPaymentMethod($this->storeIdForMerchant($merchantId), $methodId);
        if ($row) {
            return [
                'ar' => (string) ($row['label_ar'] ?? $methodId),
                'en' => (string) ($row['label_en'] ?? $methodId),
            ];
        }

        return ['ar' => $methodId, 'en' => $methodId];
    }

    /**
     * @param  array{ar: string, en: string}  $methodLabel
     * @return array<string, mixed>
     */
    protected function payload(
        string $kind,
        string $paymentMethod,
        array $methodLabel,
        string $transferReference,
        string $accountHolderName,
        float $amount,
        ?string $customerReceiptPath,
        ?string $adminReceiptPath,
        ?string $orderNumber = null,
        ?string $adminNote = null,
    ): array {
        return [
            'kind' => $kind,
            'payment_method' => $paymentMethod,
            'payment_method_label_ar' => $methodLabel['ar'],
            'payment_method_label_en' => $methodLabel['en'],
            'transfer_reference' => $transferReference,
            'account_holder_name' => $accountHolderName,
            'amount' => $amount,
            'order_number' => $orderNumber,
            'admin_note' => $adminNote,
            'customer_receipt_url' => $customerReceiptPath ? url($customerReceiptPath) : null,
            'admin_transfer_receipt_url' => $adminReceiptPath ? url($adminReceiptPath) : null,
        ];
    }
}
