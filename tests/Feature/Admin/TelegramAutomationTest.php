<?php

namespace Tests\Feature\Admin;

use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\AutomationDelivery;
use App\Models\Customer;
use App\Models\MessageTemplate;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\TelegramTarget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class TelegramAutomationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_queue_marketing_and_renewal_telegram_deliveries(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('automation.telegram.targets.store'), [
            'name' => 'Main Public Group',
            'target_type' => 'group',
            'target_identifier' => 'https://t.me/accesshub_public',
            'permission_status' => 'allowed',
            'posting_hours' => '10,14,20',
            'daily_limit' => 2,
            'notes' => 'Allowed group',
        ])->assertRedirect(route('automation.telegram.index'));

        $this->actingAs($user)->post(route('automation.telegram.templates.store'), [
            'name' => 'Netflix offer',
            'purpose' => 'marketing',
            'body' => 'Netflix offer from AccessHub',
            'source_message_ref' => '123',
        ])->assertRedirect(route('automation.telegram.index'));

        $target = TelegramTarget::query()->firstOrFail();
        $marketingTemplate = MessageTemplate::query()->where('purpose', 'marketing')->firstOrFail();

        $this->actingAs($user)->post(route('automation.telegram.queue-marketing'), [
            'message_template_id' => $marketingTemplate->id,
        ])->assertRedirect(route('automation.telegram.index'));

        $this->assertDatabaseHas('automation_deliveries', [
            'telegram_target_id' => $target->id,
            'message_template_id' => $marketingTemplate->id,
            'platform' => 'telegram',
            'purpose' => 'marketing',
            'status' => 'queued',
        ]);

        $customer = Customer::query()->create([
            'name' => 'Telegram Client',
            'preferred_currency' => CurrencyCode::ILS->value,
            'telegram_username' => '@telegramclient',
            'telegram_notifications_enabled' => true,
            'telegram_opted_in_at' => now(),
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
            'internal_order_number' => 'AH-20260428-0001',
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Premium',
            'account_identifier' => 'telegram@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'duration_days' => 30,
            'sale_recorded_at' => now()->subMonth()->toDateTimeString(),
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addDays(2)->toDateString(),
            'sale_amount_original' => '60.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'sale_amount_usd' => '16.2000',
            'cost_usd' => '5.0000',
            'profit_usd' => '11.2000',
            'status' => SubscriptionStatus::Active->value,
        ]);
        $renewalTemplate = MessageTemplate::query()->create([
            'name' => 'Renewal reminder',
            'purpose' => 'renewal_reminder',
            'body' => 'Hello {customer_name}, your {service_name} subscription ends on {end_date}.',
            'active' => true,
        ]);

        $this->actingAs($user)->post(route('automation.telegram.queue-renewal-reminders'), [
            'message_template_id' => $renewalTemplate->id,
            'days_window' => 3,
        ])->assertRedirect(route('automation.telegram.index'));

        $delivery = AutomationDelivery::query()
            ->where('purpose', 'renewal_reminder')
            ->where('subscription_id', $subscription->id)
            ->firstOrFail();

        $this->assertSame('@telegramclient', $delivery->target_identifier);
        $this->assertStringContainsString('Telegram Client', $delivery->message_body);
        $this->assertStringContainsString('Netflix', $delivery->message_body);
    }

    public function test_admin_can_schedule_a_telegram_source_post_several_times_today(): void
    {
        $user = User::factory()->create();
        $target = TelegramTarget::query()->create([
            'name' => 'Main Sales Group',
            'target_type' => 'group',
            'target_identifier' => '-1001234567890',
            'permission_status' => 'allowed',
            'posting_hours' => '9,12,15,18,21',
            'daily_limit' => 10,
            'active' => true,
        ]);
        $template = MessageTemplate::query()->create([
            'name' => 'Netflix source post',
            'purpose' => 'marketing',
            'body' => 'Internal fallback note',
            'source_message_ref' => 'https://t.me/c/1234567890/45',
            'active' => true,
        ]);

        $this->actingAs($user)->post(route('automation.telegram.queue-marketing'), [
            'message_template_id' => $template->id,
            'telegram_target_id' => $target->id,
            'schedule_mode' => 'today',
            'send_count' => 5,
        ])->assertRedirect(route('automation.telegram.index'));

        $deliveries = AutomationDelivery::query()
            ->where('purpose', 'marketing')
            ->where('telegram_target_id', $target->id)
            ->orderBy('scheduled_for')
            ->get();

        $this->assertCount(5, $deliveries);
        $this->assertTrue($deliveries->every(fn (AutomationDelivery $delivery): bool => $delivery->source_message_ref === $template->source_message_ref));
        $this->assertTrue($deliveries->every(fn (AutomationDelivery $delivery): bool => $delivery->scheduled_for !== null));
        $this->assertSame('today', $deliveries->first()->metadata['schedule_mode']);
        $this->assertSame(5, $deliveries->first()->metadata['requested_send_count']);
    }

    public function test_admin_can_schedule_telegram_source_posts_at_exact_minutes(): void
    {
        $user = User::factory()->create();
        $target = TelegramTarget::query()->create([
            'name' => 'Exact Minute Group',
            'target_type' => 'group',
            'target_identifier' => '-1001234567890',
            'permission_status' => 'allowed',
            'posting_hours' => '10:34,14:07',
            'daily_limit' => 10,
            'active' => true,
        ]);
        $template = MessageTemplate::query()->create([
            'name' => 'Premium source post',
            'purpose' => 'marketing',
            'body' => 'Internal fallback note',
            'source_message_ref' => 'https://t.me/c/1234567890/45',
            'active' => true,
        ]);

        $this->actingAs($user)->post(route('automation.telegram.queue-marketing'), [
            'message_template_id' => $template->id,
            'telegram_target_id' => $target->id,
            'schedule_mode' => 'today',
            'send_count' => 2,
        ])->assertRedirect(route('automation.telegram.index'));

        $scheduledTimes = AutomationDelivery::query()
            ->where('purpose', 'marketing')
            ->where('telegram_target_id', $target->id)
            ->get()
            ->map(fn (AutomationDelivery $delivery): string => $delivery->scheduled_for->format('H:i'))
            ->all();

        $this->assertEqualsCanonicalizing(['10:34', '14:07'], $scheduledTimes);
    }

    public function test_admin_can_queue_a_direct_telegram_message_for_one_hidden_phone_customer(): void
    {
        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Hidden Phone Client',
            'preferred_currency' => CurrencyCode::ILS->value,
            'telegram_chat_id' => '987654321',
            'telegram_notifications_enabled' => true,
            'telegram_opted_in_at' => now(),
        ]);

        $this->actingAs($user)->post(route('automation.telegram.queue-direct-message'), [
            'customer_id' => $customer->id,
            'target_identifier' => '',
            'message_template_id' => '',
            'message_body' => 'Hello {customer_name}, this is your AccessHub reminder.',
        ])->assertRedirect(route('automation.telegram.index'));

        $this->assertDatabaseHas('automation_deliveries', [
            'customer_id' => $customer->id,
            'platform' => 'telegram',
            'purpose' => 'direct_message',
            'target_type' => 'customer',
            'target_identifier' => '987654321',
            'status' => 'queued',
        ]);

        $delivery = AutomationDelivery::query()->where('purpose', 'direct_message')->firstOrFail();

        $this->assertStringContainsString('Hidden Phone Client', $delivery->message_body);
    }

    public function test_admin_can_lookup_and_save_telegram_id_from_chat_history(): void
    {
        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'matches' => [
                    [
                        'name' => 'Hidden Phone Client',
                        'chat_id' => '987654321',
                        'entity_id' => '987654321',
                        'username' => 'hiddenclient',
                        'phone' => null,
                    ],
                ],
            ])),
        ]);

        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Hidden Phone Client',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);

        $this->actingAs($user)->post(route('customers.telegram-lookup', $customer), [
            'telegram_lookup_query' => 'Hidden Phone Client',
            'telegram_enable_notifications' => true,
        ])->assertRedirect(route('customers.edit', $customer));

        $customer->refresh();

        $this->assertSame('987654321', $customer->telegram_chat_id);
        $this->assertSame('@hiddenclient', $customer->telegram_username);
        $this->assertTrue($customer->telegram_notifications_enabled);
        $this->assertNotNull($customer->telegram_opted_in_at);
    }

    public function test_admin_can_search_telegram_chat_history_and_save_selected_match(): void
    {
        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'matches' => [
                    [
                        'name' => 'Fadi Netflix',
                        'chat_id' => '111222333',
                        'entity_id' => '111222333',
                        'username' => 'fadi_netflix',
                        'phone' => null,
                    ],
                    [
                        'name' => 'Fadi Work',
                        'chat_id' => '444555666',
                        'entity_id' => '444555666',
                        'username' => null,
                        'phone' => null,
                    ],
                ],
            ])),
        ]);

        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Fadi',
            'preferred_currency' => CurrencyCode::ILS->value,
        ]);

        $this->actingAs($user)->getJson(route('customers.telegram-search', [
            'customer' => $customer,
            'telegram_lookup_query' => 'Fadi',
        ]))
            ->assertOk()
            ->assertJsonPath('matches.0.name', 'Fadi Netflix')
            ->assertJsonPath('matches.0.chat_id', '111222333')
            ->assertJsonPath('matches.0.username', '@fadi_netflix');

        $this->actingAs($user)->post(route('customers.telegram-lookup', $customer), [
            'telegram_selected_chat_id' => '111222333',
            'telegram_selected_username' => '@fadi_netflix',
            'telegram_selected_name' => 'Fadi Netflix',
            'telegram_enable_notifications' => true,
        ])->assertRedirect(route('customers.edit', $customer));

        $customer->refresh();

        $this->assertSame('111222333', $customer->telegram_chat_id);
        $this->assertSame('@fadi_netflix', $customer->telegram_username);
        $this->assertTrue($customer->telegram_notifications_enabled);
    }

    public function test_telegram_sender_command_marks_queued_delivery_as_sent(): void
    {
        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'target' => '987654321',
                'sent_message_id' => 123,
            ])),
        ]);

        $customer = Customer::query()->create([
            'name' => 'Ready Customer',
            'preferred_currency' => CurrencyCode::ILS->value,
            'telegram_chat_id' => '987654321',
            'telegram_notifications_enabled' => true,
            'telegram_opted_in_at' => now(),
        ]);
        $delivery = AutomationDelivery::query()->create([
            'customer_id' => $customer->id,
            'platform' => 'telegram',
            'purpose' => 'direct_message',
            'target_type' => 'customer',
            'target_identifier' => '987654321',
            'message_body' => 'Hello from AccessHub',
            'status' => 'queued',
            'scheduled_for' => now(),
        ]);

        $this->artisan('telegram:send-queued', [
            '--limit' => 5,
            '--purpose' => 'direct_message',
        ])->assertSuccessful();

        $delivery->refresh();

        $this->assertSame('sent', $delivery->status);
        $this->assertNotNull($delivery->sent_at);
        $this->assertNull($delivery->failed_at);
        $this->assertSame(123, $delivery->metadata['telegram_result']['sent_message_id']);
    }

    public function test_admin_can_send_queued_direct_messages_from_web_page(): void
    {
        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'target' => '987654321',
                'sent_message_id' => 456,
            ])),
        ]);

        $user = User::factory()->create();
        $customer = Customer::query()->create([
            'name' => 'Web Sender Customer',
            'preferred_currency' => CurrencyCode::ILS->value,
            'telegram_chat_id' => '987654321',
        ]);
        $delivery = AutomationDelivery::query()->create([
            'customer_id' => $customer->id,
            'platform' => 'telegram',
            'purpose' => 'direct_message',
            'target_type' => 'customer',
            'target_identifier' => '987654321',
            'message_body' => 'Hello from the web sender',
            'status' => 'queued',
            'scheduled_for' => now(),
        ]);

        $this->actingAs($user)->post(route('automation.telegram.send-queued'), [
            'purpose' => 'direct_message',
            'limit' => 5,
        ])->assertRedirect(route('automation.telegram.index'));

        $this->assertSame('sent', $delivery->refresh()->status);
    }

    public function test_admin_can_manually_send_queued_marketing_from_web_page_while_background_autosend_is_paused(): void
    {
        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'target' => '@fadi99ismail',
                'sent_message_id' => 777,
            ])),
        ]);

        $user = User::factory()->create();
        $target = TelegramTarget::query()->create([
            'name' => 'Fadi',
            'target_type' => 'user',
            'target_identifier' => '@fadi99ismail',
            'permission_status' => 'allowed',
            'posting_hours' => '10:34',
            'daily_limit' => 5,
            'active' => true,
        ]);
        $template = MessageTemplate::query()->create([
            'name' => 'Netflix source post',
            'purpose' => 'marketing',
            'body' => 'Internal fallback note',
            'source_message_ref' => 'https://t.me/AccessHubAutomationCenter/5',
            'active' => true,
        ]);
        $delivery = AutomationDelivery::query()->create([
            'message_template_id' => $template->id,
            'telegram_target_id' => $target->id,
            'platform' => 'telegram',
            'purpose' => 'marketing',
            'target_type' => 'user',
            'target_identifier' => '@fadi99ismail',
            'message_body' => 'Internal fallback note',
            'source_message_ref' => 'https://t.me/AccessHubAutomationCenter/5',
            'status' => 'queued',
            'scheduled_for' => now(),
        ]);

        $this->actingAs($user)->post(route('automation.telegram.send-queued'), [
            'purpose' => 'marketing',
            'limit' => 1,
        ])->assertRedirect(route('automation.telegram.index'));

        $delivery->refresh();

        $this->assertSame('sent', $delivery->status);
        $this->assertSame(777, $delivery->metadata['telegram_result']['sent_message_id']);
    }

    public function test_scheduler_tick_sends_one_due_marketing_delivery_when_autosend_is_enabled(): void
    {
        config(['app.env' => 'local']);
        putenv('TELEGRAM_MARKETING_AUTOSEND=true');
        putenv('TELEGRAM_MARKETING_SEND_LIMIT=1');

        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'target' => '@fadi99ismail',
                'sent_message_id' => 888,
            ])),
        ]);

        $user = User::factory()->create();

        $first = AutomationDelivery::query()->create([
            'platform' => 'telegram',
            'purpose' => 'marketing',
            'target_type' => 'user',
            'target_identifier' => '@fadi99ismail',
            'message_body' => 'Internal fallback note',
            'source_message_ref' => 'https://t.me/AccessHubAutomationCenter/5',
            'status' => 'queued',
            'scheduled_for' => now(),
        ]);
        $second = AutomationDelivery::query()->create([
            'platform' => 'telegram',
            'purpose' => 'marketing',
            'target_type' => 'user',
            'target_identifier' => '@fadi99ismail',
            'message_body' => 'Internal fallback note',
            'source_message_ref' => 'https://t.me/AccessHubAutomationCenter/5',
            'status' => 'queued',
            'scheduled_for' => now(),
        ]);

        $this->actingAs($user)
            ->postJson(route('automation.telegram.scheduler-tick'))
            ->assertOk()
            ->assertJsonPath('processed', 1)
            ->assertJsonPath('sent', 1);

        $this->assertSame('sent', $first->refresh()->status);
        $this->assertSame('queued', $second->refresh()->status);

        putenv('TELEGRAM_MARKETING_AUTOSEND');
        putenv('TELEGRAM_MARKETING_SEND_LIMIT');
    }

    public function test_automatic_renewal_reminder_command_builds_sends_and_does_not_duplicate_message(): void
    {
        Process::fake([
            '*' => Process::result(json_encode([
                'ok' => true,
                'target' => '987654321',
                'sent_message_id' => 789,
            ])),
        ]);

        $customer = Customer::query()->create([
            'name' => 'Auto Reminder Client',
            'preferred_currency' => CurrencyCode::ILS->value,
            'telegram_chat_id' => '987654321',
            'telegram_notifications_enabled' => true,
            'telegram_opted_in_at' => now(),
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
            'internal_order_number' => 'AH-20260429-0001',
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'supplier_id' => $supplier->id,
            'plan_name' => 'Premium',
            'account_identifier' => 'auto@example.com',
            'duration_value' => 1,
            'duration_unit' => SubscriptionDurationUnit::Month->value,
            'duration_days' => 30,
            'sale_recorded_at' => now()->subMonth()->toDateTimeString(),
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addDays(2)->toDateString(),
            'sale_amount_original' => '60.00',
            'sale_currency' => CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => '0.27000000',
            'sale_amount_usd' => '16.2000',
            'cost_usd' => '5.0000',
            'profit_usd' => '11.2000',
            'status' => SubscriptionStatus::Active->value,
        ]);

        $this->artisan('telegram:automatic-renewal-reminders', [
            '--days' => 3,
            '--limit' => 10,
        ])->assertSuccessful();

        $delivery = AutomationDelivery::query()
            ->where('purpose', 'renewal_reminder')
            ->where('subscription_id', $subscription->id)
            ->firstOrFail();

        $this->assertSame('sent', $delivery->status);
        $this->assertStringContainsString('Auto Reminder Client', $delivery->message_body);
        $this->assertStringContainsString('Netflix', $delivery->message_body);
        $this->assertStringContainsString('Premium', $delivery->message_body);
        $this->assertStringContainsString($subscription->end_date->format('Y-m-d'), $delivery->message_body);
        $this->assertStringContainsString('Do you want to renew it?', $delivery->message_body);

        $this->artisan('telegram:automatic-renewal-reminders', [
            '--days' => 3,
            '--limit' => 10,
        ])->assertSuccessful();

        $this->assertSame(1, AutomationDelivery::query()
            ->where('purpose', 'renewal_reminder')
            ->where('subscription_id', $subscription->id)
            ->count());
    }
}
