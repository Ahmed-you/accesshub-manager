<?php

namespace Tests\Feature\Admin;

use App\Enums\AuditEvent;
use App\Enums\CurrencyCode;
use App\Models\CapitalBatch;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ManagementPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_phase_two_index_pages(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('customers.index'))->assertOk();
        $this->get(route('suppliers.index'))->assertOk();
        $this->get(route('services.index'))->assertOk();
        $this->get(route('capital-batches.index'))->assertOk();
        $this->get(route('audit-logs.index'))->assertOk();
    }

    public function test_admin_can_create_a_customer_and_an_audit_log_is_written(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('customers.store'), [
            'name' => 'Acme Client',
            'email' => 'client@example.com',
            'phone' => '+972500000000',
            'preferred_currency' => CurrencyCode::ILS->value,
            'notes' => 'VIP account',
        ]);

        $customer = Customer::query()->firstOrFail();

        $response->assertRedirect(route('customers.index'));

        $this->assertDatabaseHas('customers', [
            'name' => 'Acme Client',
            'email' => 'client@example.com',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'auditable_type' => $customer->getMorphClass(),
            'auditable_id' => $customer->id,
            'event' => AuditEvent::Created->value,
        ]);
    }

    public function test_admin_can_view_audit_logs_with_sanitized_change_details(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('customers.store'), [
            'name' => 'Audit Client',
            'email' => 'audit@example.com',
            'phone' => '+972599999999',
            'preferred_currency' => CurrencyCode::ILS->value,
            'notes' => 'Audit test',
        ]);

        $response = $this->actingAs($user)->get(route('audit-logs.index', [
            'search' => 'customer',
        ]));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/audit-logs/index')
                ->where('auditLogs.data.0.event', AuditEvent::Created->value)
                ->where('auditLogs.data.0.auditable_label', 'Customer')
                ->where('auditLogs.data.0.user_username', $user->username)
                ->where('auditLogs.data.0.new_values.name', 'Audit Client')
                ->missing('auditLogs.data.0.new_values.password')
            );
    }

    public function test_capital_batch_defaults_remaining_usd_to_the_full_amount_when_blank(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('capital-batches.store'), [
                'usd_amount' => '1000.00',
                'funding_date' => '2026-04-23',
                'reference_currency' => CurrencyCode::ILS->value,
                'reference_exchange_rate_to_usd' => '0.27000000',
                'reference_original_amount' => '3703.70',
                'remaining_usd' => '',
                'notes' => 'Initial working capital',
            ])
            ->assertRedirect(route('capital-batches.index'));

        $capitalBatch = CapitalBatch::query()->firstOrFail();

        $this->assertSame('1000.00', $capitalBatch->usd_amount);
        $this->assertSame('1000.00', $capitalBatch->remaining_usd);
    }
}
