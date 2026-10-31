<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->json('cart_snapshot')->nullable()->after('notes');
            $table->timestamp('cart_synced_at')->nullable()->after('cart_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['cart_snapshot', 'cart_synced_at']);
        });
    }
};
