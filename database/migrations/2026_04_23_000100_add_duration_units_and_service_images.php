<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedInteger('default_duration_value')->nullable()->after('description');
            $table->string('default_duration_unit', 16)->nullable()->after('default_duration_value');
            $table->string('image_path')->nullable()->after('active');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('duration_value')->nullable()->after('duration_days');
            $table->string('duration_unit', 16)->nullable()->after('duration_value');
        });

        DB::table('services')
            ->whereNotNull('default_duration_days')
            ->update([
                'default_duration_value' => DB::raw('default_duration_days'),
                'default_duration_unit' => 'day',
            ]);

        DB::table('subscriptions')
            ->whereNotNull('duration_days')
            ->update([
                'duration_value' => DB::raw('duration_days'),
                'duration_unit' => 'day',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['duration_value', 'duration_unit']);
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['default_duration_value', 'default_duration_unit', 'image_path']);
        });
    }
};
