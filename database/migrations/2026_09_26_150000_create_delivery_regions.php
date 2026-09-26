<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_regions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->string('slug');
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->unsignedBigInteger('price_amount')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['merchant_id', 'slug']);
        });

        Schema::create('delivery_streets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_region_id')->constrained('delivery_regions')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedBigInteger('price_amount');
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index(['delivery_region_id', 'name']);
        });

        Schema::table('customer_addresses', function (Blueprint $table) {
            $table->foreignId('delivery_region_id')->nullable()->after('customer_id')->constrained('delivery_regions')->nullOnDelete();
            $table->string('label')->nullable()->after('type');
            $table->text('notes')->nullable()->after('postal_code');
        });
    }

    public function down(): void
    {
        Schema::table('customer_addresses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_region_id');
            $table->dropColumn(['label', 'notes']);
        });
        Schema::dropIfExists('delivery_streets');
        Schema::dropIfExists('delivery_regions');
    }
};
