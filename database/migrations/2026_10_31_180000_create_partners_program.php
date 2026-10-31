<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->foreignId('gym_id')->nullable()->constrained('gyms')->nullOnDelete();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('city')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('partner_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->string('login_phone', 20);
            $table->string('password');
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->unique(['partner_id']);
            $table->unique(['login_phone']);
        });

        Schema::table('coupons', function (Blueprint $table) {
            $table->foreignId('partner_id')->nullable()->after('merchant_id')->constrained('partners')->nullOnDelete();
            $table->string('commission_type')->nullable()->after('status');
            $table->unsignedBigInteger('commission_value')->nullable()->after('commission_type');
        });

        Schema::create('partner_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->unsignedBigInteger('order_subtotal_amount')->default(0);
            $table->unsignedBigInteger('commission_amount')->default(0);
            $table->string('status')->default('pending');
            $table->foreignId('partner_payout_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['order_id', 'coupon_id']);
            $table->index(['partner_id', 'status']);
        });

        Schema::create('partner_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->unsignedBigInteger('amount')->default(0);
            $table->string('receipt_path')->nullable();
            $table->text('admin_note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->useCurrent();
            $table->timestamps();
        });

        Schema::table('partner_commissions', function (Blueprint $table) {
            $table->foreign('partner_payout_id')->references('id')->on('partner_payouts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('partner_commissions', function (Blueprint $table) {
            $table->dropForeign(['partner_payout_id']);
        });
        Schema::dropIfExists('partner_payouts');
        Schema::dropIfExists('partner_commissions');
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropConstrainedForeignId('partner_id');
            $table->dropColumn(['commission_type', 'commission_value']);
        });
        Schema::dropIfExists('partner_accounts');
        Schema::dropIfExists('partners');
    }
};
