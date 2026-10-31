<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->string('default_commission_type')->nullable()->after('status');
            $table->unsignedBigInteger('default_commission_value')->nullable()->after('default_commission_type');
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn(['default_commission_type', 'default_commission_value']);
        });
    }
};
