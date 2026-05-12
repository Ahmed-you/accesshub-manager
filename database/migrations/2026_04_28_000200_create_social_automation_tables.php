<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('telegram_username')->nullable()->index();
            $table->string('telegram_chat_id')->nullable()->index();
            $table->boolean('telegram_notifications_enabled')->default(false)->index();
            $table->timestamp('telegram_opted_in_at')->nullable();
        });

        Schema::create('social_channels', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->index();
            $table->string('name');
            $table->boolean('active')->default(true)->index();
            $table->jsonb('settings')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('message_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_channel_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name')->index();
            $table->string('purpose')->default('marketing')->index();
            $table->text('body');
            $table->string('source_message_ref')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('telegram_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_channel_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('target_type')->default('group')->index();
            $table->string('target_identifier')->index();
            $table->string('permission_status')->default('allowed')->index();
            $table->boolean('active')->default(true)->index();
            $table->string('posting_hours')->nullable();
            $table->unsignedSmallInteger('daily_limit')->default(2);
            $table->timestamp('last_queued_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('automation_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_channel_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('message_template_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('telegram_target_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('expiry_reminder_id')->nullable()->constrained()->nullOnDelete();
            $table->string('platform')->index();
            $table->string('purpose')->index();
            $table->string('target_type')->index();
            $table->string('target_identifier')->index();
            $table->text('message_body');
            $table->string('source_message_ref')->nullable();
            $table->string('status')->default('queued')->index();
            $table->timestamp('scheduled_for')->nullable()->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['platform', 'status', 'scheduled_for']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_deliveries');
        Schema::dropIfExists('telegram_targets');
        Schema::dropIfExists('message_templates');
        Schema::dropIfExists('social_channels');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'telegram_username',
                'telegram_chat_id',
                'telegram_notifications_enabled',
                'telegram_opted_in_at',
            ]);
        });
    }
};
