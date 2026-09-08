<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->foreignId('merchant_id')->nullable()->after('id')->constrained('merchants')->nullOnDelete();
            $table->string('key')->nullable()->after('name');
            $table->string('description')->nullable()->after('key');
            $table->boolean('is_system')->default(false)->after('description');
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->string('key')->nullable()->after('name');
            $table->string('module')->nullable()->after('key');
            $table->string('description')->nullable()->after('module');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('merchant_id');
            $table->dropColumn(['key', 'description', 'is_system']);
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->dropColumn(['key', 'module', 'description']);
        });
    }
};
