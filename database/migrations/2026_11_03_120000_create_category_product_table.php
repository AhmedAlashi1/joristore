<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['category_id', 'product_id']);
            $table->index('product_id');
        });

        if (Schema::hasColumn('products', 'category_id')) {
            $rows = DB::table('products')->whereNotNull('category_id')->select('id', 'category_id')->get();
            foreach ($rows as $row) {
                DB::table('category_product')->insertOrIgnore([
                    'category_id' => $row->category_id,
                    'product_id' => $row->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('category_product');
    }
};
