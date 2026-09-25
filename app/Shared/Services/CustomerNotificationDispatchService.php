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
                'data' => ['sent_by' => $sentByUserId],
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
}
