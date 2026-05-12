<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_channel_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('message_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('telegram_target_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('schedule_times');
            $table->unsignedSmallInteger('daily_limit')->default(5);
            $table->boolean('active')->default(true)->index();
            $table->date('last_queued_for')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_campaigns');
    }
};
