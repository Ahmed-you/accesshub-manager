<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable()->index();
            $table->string('phone')->nullable()->index();
            $table->string('preferred_currency', 3)->default('ILS');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->string('category')->nullable()->index();
            $table->text('description')->nullable();
            $table->unsignedInteger('default_duration_days')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('internal_order_number')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('renewed_from_subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->string('plan_name');
            $table->string('account_identifier');
            $table->text('account_secret_encrypted')->nullable();
            $table->unsignedInteger('duration_days');
            $table->timestamp('sale_recorded_at');
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamp('delivered_at')->nullable();
            $table->decimal('sale_amount_original', 14, 2);
            $table->string('sale_currency', 3);
            $table->decimal('sale_exchange_rate_to_usd', 18, 8);
            $table->decimal('sale_amount_usd', 14, 4);
            $table->decimal('cost_usd', 14, 4);
            $table->decimal('profit_usd', 14, 4);
            $table->string('status')->default('pending')->index();
            $table->text('cancel_reason')->nullable();
            $table->text('refund_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['customer_id', 'status']);
            $table->index(['end_date', 'status']);
            $table->index(['sale_recorded_at', 'sale_currency']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('amount_original', 14, 2);
            $table->string('currency', 3);
            $table->decimal('exchange_rate_to_usd', 18, 8);
            $table->decimal('amount_usd', 14, 4);
            $table->timestamp('paid_at');
            $table->string('method')->nullable();
            $table->string('reference')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['subscription_id', 'paid_at']);
            $table->index(['customer_id', 'paid_at']);
        });

        Schema::create('exchange_rate_snapshots', function (Blueprint $table) {
            $table->id();
            $table->nullableMorphs('source');
            $table->string('from_currency', 3);
            $table->string('to_currency', 3)->default('USD');
            $table->decimal('rate', 18, 8);
            $table->timestamp('captured_at');
            $table->string('provider')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['from_currency', 'to_currency', 'captured_at']);
        });

        Schema::create('capital_batches', function (Blueprint $table) {
            $table->id();
            $table->decimal('usd_amount', 14, 2);
            $table->date('funding_date')->index();
            $table->string('reference_currency', 3)->default('ILS');
            $table->decimal('reference_exchange_rate_to_usd', 18, 8)->nullable();
            $table->decimal('reference_original_amount', 14, 2)->nullable();
            $table->decimal('remaining_usd', 14, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->nullableMorphs('auditable');
            $table->string('event')->index();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });

        Schema::create('expiry_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->date('reminder_date')->index();
            $table->unsignedSmallInteger('days_before_expiry');
            $table->string('status')->default('pending')->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['subscription_id', 'days_before_expiry']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expiry_reminders');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('capital_batches');
        Schema::dropIfExists('exchange_rate_snapshots');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('services');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('customers');
    }
};
