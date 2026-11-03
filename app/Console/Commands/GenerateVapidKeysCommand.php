<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeysCommand extends Command
{
    protected $signature = 'webpush:vapid';

    protected $description = 'Generate VAPID keys for Web Push (add to .env)';

    public function handle(): int
    {
        $keys = VAPID::createVapidKeys();

        $this->line('Add to .env:');
        $this->newLine();
        $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $url = (string) config('app.url');
        $subject = filter_var($url, FILTER_VALIDATE_URL) ? $url : 'mailto:admin@example.com';
        $this->line('VAPID_SUBJECT='.$subject);
        $this->newLine();
        $this->comment('Then: php artisan config:cache (on server after editing .env)');

        return self::SUCCESS;
    }
}
