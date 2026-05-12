<?php

namespace Tests\Feature\Admin;

use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReportManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_usd_profit_reports_from_saved_snapshots(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Report Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);
        $service = Service::query()->create([
            'name' => 'Netflix',
            'active' => true,
        ]);
        $supplier = Supplier::query()->create([
            'name' => 'Report Supplier',
            'active' => true,
        ]);
        $subscription = Subscription::query()->create([
            'internal_order_number' => 'AH-20260410-0001',
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Premium',
            'account_identifier' => 'report@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'duration_days' => 30,
            'sale_recorded_at' => '2026-04-10 12:00:00',
            'start_date' => '2026-04-10',
            'end_date' => '2026-05-10',
            'sale_amount_original' => '80.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.25000000',
            'sale_amount_usd' => '20.0000',
            'cost_usd' => '5.0000',
            'profit_usd' => '15.0000',
            'status' => SubscriptionStatus::Active->value,
        ]);

        Payment::query()->create([
            'subscription_id' => $subscription->id,
            'customer_id' => $customer->id,
            'amount_original' => '40.00',
            'currency' => CurrencyCode::ILS->value,
            'exchange_rate_to_usd' => '0.25000000',
            'amount_usd' => '10.0000',
            'paid_at' => '2026-04-12 15:00:00',
            'method' => 'cash',
        ]);

        $response = $this->actingAs($user)->get(route('reports.index', [
            'from' => '2026-04-01',
            'to' => '2026-04-30',
        ]));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/reports/index')
                ->where('summary.revenue_usd', '20.0000')
                ->where('summary.cost_usd', '5.0000')
                ->where('summary.profit_usd', '15.0000')
                ->where('summary.payments_received_usd', '10.0000')
                ->where('summary.outstanding_usd', '10.0000')
                ->where('serviceBreakdown.0.name', 'Netflix')
                ->where('customerBreakdown.0.name', 'Report Client')
                ->where('paymentCurrencies.0.currency', CurrencyCode::ILS->value)
            );
    }
}
