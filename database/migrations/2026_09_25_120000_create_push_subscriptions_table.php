<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('endpoint', 500);
            $table->string('public_key', 255);
            $table->string('auth_token', 255);
            $table->string('content_encoding', 32)->default('aesgcm');
            $table->timestamps();

            $table->unique(['merchant_id', 'endpoint']);
            $table->index(['customer_id', 'merchant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
