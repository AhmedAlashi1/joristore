<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedBigInteger('wallet_balance_amount')->default(0)->after('total_spent_amount');
        });

        Schema::create('customer_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('type', 16);
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('balance_after');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'reference_type', 'reference_id'], 'wallet_txn_idempotent_ref');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_wallet_transactions');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('wallet_balance_amount');
        });
    }
};
