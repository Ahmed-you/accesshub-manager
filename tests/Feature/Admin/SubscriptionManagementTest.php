<?php

namespace Tests\Feature\Admin;

use App\Enums\AuditEvent;
use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_service_with_an_image_and_duration_defaults(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=',
            true,
        );

        $response = $this->actingAs($user)->post(route('services.store'), [
            'name' => 'Canva Pro',
            'category' => 'Design',
            'description' => 'Shared team seat',
            'default_duration_value' => 12,
            'default_duration_unit' => SubscriptionDurationUnit::Month->value,
            'active' => true,
            'image' => UploadedFile::fake()->createWithContent('canva.png', $png ?: 'png'),
        ]);

        $service = Service::query()->firstOrFail();

        $response->assertRedirect(route('services.index'));

        $this->assertSame(12, $service->default_duration_value);
        $this->assertSame(SubscriptionDurationUnit::Month, $service->default_duration_unit);
        $this->assertSame(365, $service->default_duration_days);
        $this->assertNotNull($service->image_path);
        Storage::disk('public')->assertExists($service->image_path);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'auditable_type' => $service->getMorphClass(),
            'auditable_id' => $service->id,
            'event' => AuditEvent::Created->value,
        ]);
    }

    public function test_admin_can_create_a_month_based_subscription_with_saved_usd_profit_snapshot(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Joy Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);
        $service = Service::query()->create([
            'name' => 'Netflix',
            'active' => true,
        ]);
        $supplier = Supplier::query()->create([
            'name' => 'Main Supplier',
            'active' => true,
        ]);

        $response = $this->actingAs($user)->post(route('subscriptions.store'), [
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => '30 Month Shared',
            'account_identifier' => 'joy@example.com',
            'account_secret' => 'secret-value',
            'duration_value' => 30,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'sale_recorded_at' => '2026-04-23 11:00:00',
            'start_date' => '2026-04-23',
            'sale_amount_original' => '150.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'cost_usd' => '25.0000',
            'status' => SubscriptionStatus::Active->value,
            'return_to_customer' => true,
        ]);

        $subscription = Subscription::query()->firstOrFail();

        $response->assertRedirect(route('customers.show', $customer->id));

        $this->assertSame(30, $subscription->duration_value);
        $this->assertSame(SubscriptionDurationUnit::Month, $subscription->duration_unit);
        $this->assertSame(914, $subscription->duration_days);
        $this->assertSame('2028-10-23', $subscription->end_date?->toDateString());
        $this->assertSame('40.5000', $subscription->sale_amount_usd);
        $this->assertSame('15.5000', $subscription->profit_usd);
        $this->assertStringStartsWith('AH-', $subscription->internal_order_number);
        $this->assertNotSame('secret-value', $subscription->getRawOriginal('account_secret_encrypted'));
        $this->assertCount(3, $subscription->expiryReminders);
        $this->assertDatabaseHas('expiry_reminders', [
            'subscription_id' => $subscription->id,
            'days_before_expiry' => 7,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'auditable_type' => $subscription->getMorphClass(),
            'auditable_id' => $subscription->id,
            'event' => AuditEvent::Created->value,
        ]);
    }

    public function test_admin_can_reveal_a_saved_subscription_secret_and_the_reveal_is_audited(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Secret Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);
        $service = Service::query()->create([
            'name' => 'Netflix',
            'active' => true,
        ]);
        $supplier = Supplier::query()->create([
            'name' => 'Main Supplier',
            'active' => true,
        ]);

        $this->actingAs($user)->post(route('subscriptions.store'), [
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Private Account',
            'account_identifier' => 'private@example.com',
            'account_secret' => 'secret-value',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'sale_recorded_at' => '2026-04-23 11:00:00',
            'start_date' => '2026-04-23',
            'sale_amount_original' => '30.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'cost_usd' => '2.0000',
            'status' => SubscriptionStatus::Active->value,
            'return_to_customer' => false,
        ])->assertRedirect(route('subscriptions.index'));

        $subscription = Subscription::query()->firstOrFail();

        $this->actingAs($user)
            ->get(route('subscriptions.edit', $subscription))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/subscriptions/edit')
                ->where('subscription.has_account_secret', true)
                ->missing('subscription.account_secret_encrypted')
                ->missing('subscription.account_secret')
            );

        $this->actingAs($user)
            ->postJson(route('subscriptions.reveal-secret', $subscription))
            ->assertOk()
            ->assertJsonPath('secret', 'secret-value');

        $auditLog = AuditLog::query()
            ->where('event', AuditEvent::SecretRevealed->value)
            ->firstOrFail();

        $this->assertSame($user->id, $auditLog->user_id);
        $this->assertSame($subscription->getMorphClass(), $auditLog->auditable_type);
        $this->assertSame($subscription->id, $auditLog->auditable_id);
        $this->assertSame('account_secret_encrypted', $auditLog->new_values['field']);
        $this->assertStringNotContainsString('secret-value', json_encode($auditLog->new_values, JSON_THROW_ON_ERROR));
    }
}
