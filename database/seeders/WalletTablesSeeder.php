<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

/**
 * Ensures wallet schema exists (safe to run after migrate).
 */
class WalletTablesSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('customer_wallet_transactions')) {
            $this->command?->error('Missing customer_wallet_transactions. Run: php artisan migrate --force');

            return;
        }

        if (! Schema::hasTable('customer_wallet_requests')) {
            $this->command?->error('Missing customer_wallet_requests. Run: php artisan migrate --force');

            return;
        }

        $this->command?->info('Wallet tables OK.');
    }
}
