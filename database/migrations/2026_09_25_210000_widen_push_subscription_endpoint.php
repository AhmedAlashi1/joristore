<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        if ($driver !== 'mysql') {
            return;
        }

        $column = DB::selectOne("SHOW COLUMNS FROM push_subscriptions WHERE Field = 'endpoint'");
        $type = strtolower((string) ($column->Type ?? ''));
        if (str_contains($type, 'text')) {
            return;
        }

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->index('merchant_id', 'push_subscriptions_merchant_id_idx');
        });

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['merchant_id', 'endpoint']);
        });

        DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint TEXT NOT NULL');

        DB::statement(
            'CREATE UNIQUE INDEX push_subscriptions_merchant_endpoint_unique ON push_subscriptions (merchant_id, endpoint(191))'
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('push_subscriptions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        DB::statement('DROP INDEX push_subscriptions_merchant_endpoint_unique ON push_subscriptions');

        DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint VARCHAR(500) NOT NULL');

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->unique(['merchant_id', 'endpoint']);
            $table->dropIndex('push_subscriptions_merchant_id_idx');
        });
    }
};
