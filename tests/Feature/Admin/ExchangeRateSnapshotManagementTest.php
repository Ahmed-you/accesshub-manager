<?php

namespace Tests\Feature\Admin;

use App\Enums\AuditEvent;
use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\CapitalBatch;
use App\Models\Customer;
use App\Models\ExchangeRateSnapshot;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExchangeRateSnapshotManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_view_manual_exchange_rate_snapshot(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('exchange-rate-snapshots.store'), [
            'from_currency' => CurrencyCode::ILS->value,
            'to_currency' => CurrencyCode::USD->value,
            'rate' => '0.27000000',
            'captured_at' => '2026-04-23 10:00:00',
            'provider' => 'manual_test',
            'notes' => 'Manual reporting rate',
        ]);

        $snapshot = ExchangeRateSnapshot::query()->firstOrFail();

        $response->assertRedirect(route('exchange-rate-snapshots.index'));

        $this->assertDatabaseHas('exchange_rate_snapshots', [
            'source_type' => null,
            'source_id' => null,
            'from_currency' => CurrencyCode::ILS->value,
            'to_currency' => CurrencyCode::USD->value,
            'rate' => '0.27000000',
            'provider' => 'manual_test',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'auditable_type' => $snapshot->getMorphClass(),
            'auditable_id' => $snapshot->id,
            'event' => AuditEvent::Created->value,
        ]);

        $this->actingAs($user)
            ->get(route('exchange-rate-snapshots.index', ['from_currency' => CurrencyCode::ILS->value]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/exchange-rate-snapshots/index')
                ->where('snapshots.data.0.source_label', 'Manual snapshot')
                ->where('snapshots.data.0.rate', '0.27000000')
                ->where('summary.total', '1')
                ->where('summary.manual', '1')
            );
    }

    public function test_admin_can_fetch_latest_exchange_rate_from_provider(): void
    {
        Http::fake([
            'https://api.frankfurter.dev/v2/rate/ILS/USD' => Http::response([
                'date' => '2026-05-02',
                'base' => 'ILS',
                'quote' => 'USD',
                'rate' => 0.27027027,
            ]),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('exchange-rates.latest', [
                'from_currency' => CurrencyCode::ILS->value,
                'to_currency' => CurrencyCode::USD->value,
            ]))
            ->assertOk()
            ->assertJsonPath('from_currency', CurrencyCode::ILS->value)
            ->assertJsonPath('to_currency', CurrencyCode::USD->value)
            ->assertJsonPath('rate', '0.27027027')
            ->assertJsonPath('date', '2026-05-02')
            ->assertJsonPath('provider', 'Frankfurter');

        Http::assertSentCount(1);
    }

    public function test_same_currency_latest_exchange_rate_does_not_call_provider(): void
    {
        Http::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('exchange-rates.latest', [
                'from_currency' => CurrencyCode::USD->value,
                'to_currency' => CurrencyCode::USD->value,
            ]))
            ->assertOk()
            ->assertJsonPath('rate', '1.00000000')
            ->assertJsonPath('provider', 'Same currency');

        Http::assertNothingSent();
    }

    public function test_subscription_sales_and_capital_batches_write_exchange_rate_snapshots(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Snapshot Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);
        $service = Service::query()->create([
            'name' => 'Netflix',
            'active' => true,
        ]);
        $supplier = Supplier::query()->create([
            'name' => 'Snapshot Supplier',
            'active' => true,
        ]);

        $this->actingAs($user)->post(route('subscriptions.store'), [
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Premium',
            'account_identifier' => 'snapshot@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'sale_recorded_at' => '2026-04-23 11:00:00',
            'start_date' => '2026-04-23',
            'sale_amount_original' => '100.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'cost_usd' => '10.0000',
            'status' => SubscriptionStatus::Active->value,
        ]);

        $subscription = Subscription::query()->firstOrFail();

        $this->assertDatabaseHas('exchange_rate_snapshots', [
            'source_type' => $subscription->getMorphClass(),
            'source_id' => $subscription->id,
            'from_currency' => CurrencyCode::ILS->value,
            'to_currency' => CurrencyCode::USD->value,
            'rate' => '0.27000000',
            'provider' => 'manual_admin_entry',
        ]);

        $this->actingAs($user)->post(route('capital-batches.store'), [
            'usd_amount' => '500.00',
            'funding_date' => '2026-04-23',
            'reference_currency' => CurrencyCode::ILS->value,
            'reference_exchange_rate_to_usd' => '0.26000000',
            'reference_original_amount' => '1923.08',
            'remaining_usd' => '',
            'notes' => 'Snapshot capital',
        ]);

        $capitalBatch = CapitalBatch::query()->firstOrFail();

        $this->assertDatabaseHas('exchange_rate_snapshots', [
            'source_type' => $capitalBatch->getMorphClass(),
            'source_id' => $capitalBatch->id,
            'from_currency' => CurrencyCode::ILS->value,
            'to_currency' => CurrencyCode::USD->value,
            'rate' => '0.26000000',
            'provider' => 'manual_admin_entry',
        ]);
    }

    public function test_admin_can_sync_missing_exchange_rate_snapshots_for_existing_records(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Backfill Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);
        $service = Service::query()->create([
            'name' => 'Spotify',
            'active' => true,
        ]);
        $supplier = Supplier::query()->create([
            'name' => 'Backfill Supplier',
            'active' => true,
        ]);
        $subscription = Subscription::query()->create([
            'internal_order_number' => 'AH-20260423-9999',
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Family',
            'account_identifier' => 'backfill@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'duration_days' => 30,
            'sale_recorded_at' => '2026-04-23 12:00:00',
            'start_date' => '2026-04-23',
            'end_date' => '2026-05-23',
            'sale_amount_original' => '50.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'sale_amount_usd' => '13.5000',
            'cost_usd' => '5.0000',
            'profit_usd' => '8.5000',
            'status' => SubscriptionStatus::Active->value,
        ]);
        $capitalBatch = CapitalBatch::query()->create([
            'usd_amount' => '300.00',
            'funding_date' => '2026-04-23',
            'reference_currency' => CurrencyCode::ILS->value,
            'reference_exchange_rate_to_usd' => '0.26000000',
            'reference_original_amount' => '1153.85',
            'remaining_usd' => '300.00',
        ]);

        $this->assertSame(0, ExchangeRateSnapshot::query()->count());

        $this->actingAs($user)
            ->post(route('exchange-rate-snapshots.sync-missing'))
            ->assertRedirect(route('exchange-rate-snapshots.index'));

        $this->assertDatabaseHas('exchange_rate_snapshots', [
            'source_type' => $subscription->getMorphClass(),
            'source_id' => $subscription->id,
            'rate' => '0.27000000',
        ]);
        $this->assertDatabaseHas('exchange_rate_snapshots', [
            'source_type' => $capitalBatch->getMorphClass(),
            'source_id' => $capitalBatch->id,
            'rate' => '0.26000000',
        ]);
    }
}
