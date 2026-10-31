<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_wallet_requests', function (Blueprint $table) {
            $table->string('transfer_reference', 120)->nullable()->after('payment_method');
            $table->string('account_holder_name', 120)->nullable()->after('transfer_reference');
            $table->string('admin_transfer_receipt_path')->nullable()->after('receipt_path');
        });
    }

    public function down(): void
    {
        Schema::table('customer_wallet_requests', function (Blueprint $table) {
            $table->dropColumn(['transfer_reference', 'account_holder_name', 'admin_transfer_receipt_path']);
        });
    }
};
