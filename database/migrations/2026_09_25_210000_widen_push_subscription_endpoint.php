<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('push_subscriptions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint TEXT NOT NULL');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('push_subscriptions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint VARCHAR(500) NOT NULL');
        }
    }
};
