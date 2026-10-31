<?php

namespace App\Shared\Services;

use App\Modules\Customers\Models\Customer;
use App\Modules\Customers\Models\CustomerNotification;
use App\Modules\Customers\Models\PushSubscription;
use Illuminate\Support\Collection;

class CustomerNotificationDispatchService
{
    public function __construct(
        protected WebPushService $webPush,
    ) {}

    /**
     * @return array{sent_count: int, push_count: int}
     */
    public function sendToCustomers(
        int $merchantId,
        string $title,
        string $message,
        ?int $customerId = null,
        ?int $sentByUserId = null,
        string $type = 'broadcast',
    ): array {
        $customersQuery = Customer::query()->where('merchant_id', $merchantId)->where('status', 'active');
        if ($customerId) {
            $customersQuery->where('id', $customerId);
        }

        /** @var Collection<int, Customer> $customers */
        $customers = $customersQuery->get(['id']);
        if ($customers->isEmpty()) {
            return ['sent_count' => 0, 'push_count' => 0];
        }

        $now = now();
        $customerIds = $customers->pluck('id')->all();

        foreach ($customers as $customer) {
            CustomerNotification::query()->create([
                'merchant_id' => $merchantId,
                'customer_id' => $customer->id,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'data' => [
                    'sent_by' => $sentByUserId,
                    'title_en' => $title,
                    'message_en' => $message,
                ],
                'created_at' => $now,
            ]);
        }

        $subscriptions = PushSubscription::query()
            ->where('merchant_id', $merchantId)
            ->whereIn('customer_id', $customerIds)
            ->get();

        $pushCount = $this->webPush->sendMany($subscriptions, $title, $message, '/notifications');

        return [
            'sent_count' => count($customerIds),
            'push_count' => $pushCount,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function notifyCustomer(
        int $merchantId,
        int $customerId,
        string $titleAr,
        string $messageAr,
        string $type,
        array $data = [],
        ?string $titleEn = null,
        ?string $messageEn = null,
    ): void {
        $now = now();
        $data['title_en'] = $titleEn ?? $titleAr;
        $data['message_en'] = $messageEn ?? $messageAr;

        CustomerNotification::query()->create([
            'merchant_id' => $merchantId,
            'customer_id' => $customerId,
            'title' => $titleAr,
            'message' => $messageAr,
            'type' => $type,
            'data' => $data,
            'created_at' => $now,
        ]);

        $subscriptions = PushSubscription::query()
            ->where('merchant_id', $merchantId)
            ->where('customer_id', $customerId)
            ->get();

        $this->webPush->sendMany($subscriptions, $titleAr, $messageAr, '/notifications');
    }
}
