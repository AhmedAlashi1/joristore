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
            'icon' => url('/pwa-192.png'),
            'badge' => url('/pwa-192.png'),
            'dir' => 'rtl',
            'lang' => 'ar',
            'nid' => (string) (microtime(true) * 10000),
        ], JSON_UNESCAPED_UNICODE);

        $auth = [
            'VAPID' => [
                'subject' => $this->vapidSubject(),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ];

        $sent = 0;
        try {
            $webPush = new WebPush($auth);
            $pushOptions = ['TTL' => 86400, 'urgency' => 'high'];
            foreach ($subscriptions as $row) {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint' => $row->endpoint,
                        'publicKey' => $row->public_key,
                        'authToken' => $row->auth_token,
                        'contentEncoding' => $this->normalizeContentEncoding($row->content_encoding),
                    ]),
                    $payload,
                    $pushOptions,
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

    protected function vapidSubject(): string
    {
        $subject = trim((string) config('services.webpush.subject', config('app.url')));
        if ($subject === '') {
            return 'mailto:admin@localhost';
        }
        if (str_starts_with($subject, 'mailto:') || str_starts_with($subject, 'http://') || str_starts_with($subject, 'https://')) {
            return $subject;
        }
        if (filter_var($subject, FILTER_VALIDATE_EMAIL)) {
            return 'mailto:'.$subject;
        }

        return $subject;
    }

    protected function normalizeContentEncoding(?string $encoding): string
    {
        $encoding = strtolower(trim((string) $encoding));
        if (in_array($encoding, ['aes128gcm', 'aesgcm', 'aescbc'], true)) {
            return $encoding;
        }

        return 'aes128gcm';
    }
}
