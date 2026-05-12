<?php

namespace Tests\Feature\Admin;

use App\Enums\AuditEvent;
use App\Enums\CurrencyCode;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_record_a_payment_with_saved_usd_snapshot(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Ahmed Client',
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
        $subscription = Subscription::query()->create([
            'internal_order_number' => 'AH-20260423-0001',
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Premium',
            'account_identifier' => 'ahmed@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'duration_days' => 30,
            'sale_recorded_at' => '2026-04-23 11:00:00',
            'start_date' => '2026-04-23',
            'end_date' => '2026-05-23',
            'sale_amount_original' => '40.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.25000000',
            'sale_amount_usd' => '10.0000',
            'cost_usd' => '2.0000',
            'profit_usd' => '8.0000',
            'status' => SubscriptionStatus::Active->value,
        ]);

        $response = $this->actingAs($user)->post(route('payments.store'), [
            'subscription_id' => $subscription->id,
            'customer_id' => $customer->id,
            'amount_original' => '15.00',
            'currency' => CurrencyCode::ILS->value,
            'exchange_rate_to_usd' => '0.27000000',
            'paid_at' => '2026-04-23 13:30:00',
            'method' => 'cash',
            'reference' => 'Receipt 15',
            'notes' => 'Paid on delivery',
            'return_to_customer' => true,
        ]);

        $payment = Payment::query()->firstOrFail();
        $subscription->refresh();

        $response->assertRedirect(route('customers.show', $customer->id));

        $this->assertSame('4.0500', $payment->amount_usd);
        $this->assertCount(1, $payment->exchangeRateSnapshots);
        $this->assertSame(PaymentStatus::Partial, $subscription->payment_status);

        $this->assertDatabaseHas('exchange_rate_snapshots', [
            'source_type' => $payment->getMorphClass(),
            'source_id' => $payment->id,
            'from_currency' => CurrencyCode::ILS->value,
            'to_currency' => CurrencyCode::USD->value,
            'rate' => '0.27000000',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'auditable_type' => $payment->getMorphClass(),
            'auditable_id' => $payment->id,
            'event' => AuditEvent::Created->value,
        ]);
    }
}
