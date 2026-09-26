<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->uuid('product_group_id')->nullable()->after('brand_id');
            $table->string('color_name', 64)->nullable()->after('product_group_id');
            $table->string('color_hex', 16)->nullable()->after('color_name');
            $table->index(['merchant_id', 'product_group_id']);
        });

        Schema::create('gyms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->string('sector')->nullable();
            $table->string('city')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();
            $table->text('description')->nullable();
            $table->text('subscription_info')->nullable();
            $table->json('opening_hours')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gyms');

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['merchant_id', 'product_group_id']);
            $table->dropColumn(['product_group_id', 'color_name', 'color_hex']);
        });
    }
};
