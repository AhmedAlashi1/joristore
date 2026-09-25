<?php

namespace App\Shared\Services;

use App\Modules\Customers\Models\PushSubscription;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    public function isConfigured(): bool
    {
        return (bool) config('services.webpush.public_key')
            && (bool) config('services.webpush.private_key');
    }

    public function publicKey(): ?string
    {
        $key = config('services.webpush.public_key');

        return $key ? (string) $key : null;
    }

    /**
     * @param  Collection<int, PushSubscription>|array<int, PushSubscription>  $subscriptions
     */
    public function sendMany(Collection|array $subscriptions, string $title, string $body, string $url = '/notifications'): int
    {
        if (! $this->isConfigured() || empty($subscriptions)) {
            return 0;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $url,
        ], JSON_UNESCAPED_UNICODE);

        $auth = [
            'VAPID' => [
                'subject' => config('services.webpush.subject', config('app.url')),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ];

        $sent = 0;
        try {
            $webPush = new WebPush($auth);
            foreach ($subscriptions as $row) {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint' => $row->endpoint,
                        'publicKey' => $row->public_key,
                        'authToken' => $row->auth_token,
                        'contentEncoding' => $row->content_encoding ?: 'aesgcm',
                    ]),
                    $payload,
                );
            }

            foreach ($webPush->flush() as $report) {
                if ($report->isSuccess()) {
                    $sent++;
                    continue;
                }
                $endpoint = $report->getRequest()->getUri()->__toString();
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::query()->where('endpoint', $endpoint)->delete();
                }
                Log::warning('Web push failed', [
                    'endpoint' => $endpoint,
                    'reason' => $report->getReason(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Web push batch error', ['message' => $e->getMessage()]);
        }

        return $sent;
    }
}
