<?php

namespace Tests\Feature\Admin;

use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\ExpiryReminder;
use App\Models\Customer;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReminderManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_and_dismiss_expiry_reminders(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Reminder Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);
        $service = Service::query()->create([
            'name' => 'Spotify',
            'active' => true,
        ]);
        $supplier = Supplier::query()->create([
            'name' => 'Reminder Supplier',
            'active' => true,
        ]);

        $subscription = Subscription::query()->create([
            'internal_order_number' => 'AH-20260423-0009',
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Family',
            'account_identifier' => 'reminder@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'duration_days' => 30,
            'sale_recorded_at' => now()->subDay()->toDateTimeString(),
            'start_date' => now()->subDay()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'sale_amount_original' => '30.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'sale_amount_usd' => '8.1000',
            'cost_usd' => '2.0000',
            'profit_usd' => '6.1000',
            'status' => SubscriptionStatus::Active->value,
        ]);

        $indexResponse = $this->actingAs($user)->get(route('reminders.index'));

        $indexResponse->assertOk();

        $reminder = ExpiryReminder::query()
            ->where('subscription_id', $subscription->id)
            ->where('days_before_expiry', 3)
            ->firstOrFail();

        $dismissResponse = $this->actingAs($user)->patch(route('reminders.dismiss', $reminder));

        $dismissResponse->assertRedirect();

        $this->assertDatabaseHas('expiry_reminders', [
            'id' => $reminder->id,
            'status' => 'dismissed',
        ]);
    }
}
