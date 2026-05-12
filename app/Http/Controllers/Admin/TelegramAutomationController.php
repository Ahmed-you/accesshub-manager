<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\AutomationDelivery;
use App\Models\Customer;
use App\Models\MessageTemplate;
use App\Models\SocialChannel;
use App\Models\Subscription;
use App\Models\TelegramCampaign;
use App\Models\TelegramTarget;
use App\Services\TelegramDeliverySender;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TelegramAutomationController extends Controller
{
    public function index(): Response
    {
        $channel = $this->telegramChannel();

        return Inertia::render('admin/automation/telegram/index', [
            'summary' => [
                'linked_customers' => (string) Customer::query()->where('telegram_notifications_enabled', true)->count(),
                'active_targets' => (string) TelegramTarget::query()->where('active', true)->where('permission_status', 'allowed')->count(),
                'active_templates' => (string) MessageTemplate::query()->where('active', true)->count(),
                'active_campaigns' => (string) TelegramCampaign::query()->where('active', true)->count(),
                'queued_deliveries' => (string) AutomationDelivery::query()->where('platform', 'telegram')->where('status', 'queued')->count(),
                'due_marketing_deliveries' => (string) AutomationDelivery::query()
                    ->where('platform', 'telegram')
                    ->where('purpose', 'marketing')
                    ->where('status', 'queued')
                    ->where('scheduled_for', '<=', now())
                    ->count(),
                'marketing_autosend_enabled' => env('TELEGRAM_MARKETING_AUTOSEND', false),
                'marketing_send_limit' => (string) max(1, min(5, (int) env('TELEGRAM_MARKETING_SEND_LIMIT', 1))),
            ],
            'targets' => TelegramTarget::query()
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn (TelegramTarget $target): array => $this->targetData($target))
                ->all(),
            'templates' => MessageTemplate::query()
                ->where(function ($query) use ($channel) {
                    $query->where('social_channel_id', $channel->id)->orWhereNull('social_channel_id');
                })
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn (MessageTemplate $template): array => $this->templateData($template))
                ->all(),
            'campaigns' => TelegramCampaign::query()
                ->with(['telegramTarget', 'messageTemplate'])
                ->latest()
                ->limit(30)
                ->get()
                ->map(fn (TelegramCampaign $campaign): array => $this->campaignData($campaign))
                ->all(),
            'deliveries' => AutomationDelivery::query()
                ->with(['customer', 'subscription.service', 'telegramTarget', 'messageTemplate'])
                ->where('platform', 'telegram')
                ->latest()
                ->paginate(12)
                ->through(fn (AutomationDelivery $delivery): array => $this->deliveryData($delivery))
                ->withQueryString(),
            'options' => [
                'customers' => Customer::query()
                    ->where(function ($query) {
                        $query->whereNotNull('telegram_chat_id')->orWhereNotNull('telegram_username');
                    })
                    ->orderBy('name')
                    ->limit(200)
                    ->get()
                    ->map(fn (Customer $customer): array => [
                        'value' => (string) $customer->id,
                        'label' => $customer->name,
                        'target_identifier' => $customer->telegram_chat_id ?: $customer->telegram_username,
                        'notifications_enabled' => $customer->telegram_notifications_enabled,
                    ])
                    ->all(),
                'targetTypes' => [
                    ['value' => 'group', 'label' => 'Group'],
                    ['value' => 'channel', 'label' => 'Channel'],
                    ['value' => 'user', 'label' => 'User'],
                ],
                'permissionStatuses' => [
                    ['value' => 'allowed', 'label' => 'Allowed'],
                    ['value' => 'requires_review', 'label' => 'Requires review'],
                    ['value' => 'blocked', 'label' => 'Blocked'],
                ],
                'templatePurposes' => [
                    ['value' => 'marketing', 'label' => 'Marketing'],
                    ['value' => 'direct_message', 'label' => 'Direct message'],
                    ['value' => 'renewal_reminder', 'label' => 'Renewal reminder'],
                ],
            ],
        ]);
    }

    public function storeTarget(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'target_type' => ['required', Rule::in(['group', 'channel', 'user'])],
            'target_identifier' => ['required', 'string', 'max:255'],
            'permission_status' => ['required', Rule::in(['allowed', 'requires_review', 'blocked'])],
            'posting_hours' => ['nullable', 'string', 'max:255'],
            'daily_limit' => ['required', 'integer', 'min:1', 'max:24'],
            'notes' => ['nullable', 'string'],
        ]);

        TelegramTarget::query()->create(array_merge($validated, [
            'social_channel_id' => $this->telegramChannel()->id,
            'active' => true,
        ]));

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram target created successfully.');
    }

    public function updateTarget(Request $request, TelegramTarget $telegramTarget): RedirectResponse
    {
        $telegramTarget->update($this->validateTarget($request));

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram destination updated successfully.');
    }

    public function destroyTarget(TelegramTarget $telegramTarget): RedirectResponse
    {
        $telegramTarget->delete();

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram destination deleted successfully.');
    }

    public function storeTemplate(Request $request): RedirectResponse
    {
        $validated = $this->validateTemplate($request);

        MessageTemplate::query()->create(array_merge($validated, [
            'social_channel_id' => $this->telegramChannel()->id,
            'active' => true,
        ]));

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Message template created successfully.');
    }

    public function updateTemplate(Request $request, MessageTemplate $messageTemplate): RedirectResponse
    {
        $messageTemplate->update($this->validateTemplate($request));

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram source post updated successfully.');
    }

    public function destroyTemplate(MessageTemplate $messageTemplate): RedirectResponse
    {
        $messageTemplate->delete();

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram source post deleted successfully.');
    }

    public function queueMarketing(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'message_template_id' => ['required', 'exists:message_templates,id'],
            'telegram_target_id' => ['nullable', 'exists:telegram_targets,id'],
            'schedule_mode' => ['nullable', Rule::in(['now', 'today'])],
            'send_count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);
        $scheduleMode = $validated['schedule_mode'] ?? 'now';
        $sendCount = (int) ($validated['send_count'] ?? 1);

        $template = MessageTemplate::query()
            ->where('purpose', 'marketing')
            ->where('active', true)
            ->findOrFail($validated['message_template_id']);

        if (! trim($template->body) && ! $template->source_message_ref) {
            return back()
                ->withErrors(['message_template_id' => 'Choose a source post or template with message content.'])
                ->withInput();
        }

        $targets = TelegramTarget::query()
            ->where('active', true)
            ->where('permission_status', 'allowed')
            ->when($validated['telegram_target_id'] ?? null, fn ($query, $targetId) => $query->whereKey($targetId))
            ->get();

        if ($targets->isEmpty()) {
            return back()
                ->withErrors(['telegram_target_id' => 'Choose an allowed Telegram target.'])
                ->withInput();
        }

        $queued = 0;

        foreach ($targets as $target) {
            foreach ($this->marketingSendTimes($target, $scheduleMode, $sendCount) as $scheduledFor) {
                AutomationDelivery::query()->create([
                    'social_channel_id' => $this->telegramChannel()->id,
                    'message_template_id' => $template->id,
                    'telegram_target_id' => $target->id,
                    'platform' => 'telegram',
                    'purpose' => 'marketing',
                    'target_type' => $target->target_type,
                    'target_identifier' => $target->target_identifier,
                    'message_body' => $template->body,
                    'source_message_ref' => $template->source_message_ref,
                    'status' => 'queued',
                    'scheduled_for' => $scheduledFor,
                    'metadata' => [
                        'queued_from' => 'web_app',
                        'permission_status' => $target->permission_status,
                        'schedule_mode' => $scheduleMode,
                        'requested_send_count' => $sendCount,
                    ],
                ]);

                $queued++;
            }

            $target->update(['last_queued_at' => now()]);
        }

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', "Queued {$queued} Telegram marketing send(s).");
    }

    public function storeCampaign(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'message_template_id' => ['required', 'exists:message_templates,id'],
            'telegram_target_id' => ['required', 'exists:telegram_targets,id'],
            'schedule_times' => ['required', 'string', 'max:255'],
            'daily_limit' => ['required', 'integer', 'min:1', 'max:24'],
            'active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($this->postingTimes($validated['schedule_times']) === []) {
            return back()
                ->withErrors(['schedule_times' => 'Add at least one valid 24-hour time, like 09:30,10:30.'])
                ->withInput();
        }

        $campaign = TelegramCampaign::query()->create(array_merge($validated, [
            'social_channel_id' => $this->telegramChannel()->id,
            'active' => (bool) ($validated['active'] ?? true),
        ]));

        $queued = $this->queueCampaignForDate($campaign, now()->toDateString());

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', "Daily routine saved. Queued {$queued} send(s) for today.");
    }

    public function updateCampaign(Request $request, TelegramCampaign $telegramCampaign): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'message_template_id' => ['required', 'exists:message_templates,id'],
            'telegram_target_id' => ['required', 'exists:telegram_targets,id'],
            'schedule_times' => ['required', 'string', 'max:255'],
            'daily_limit' => ['required', 'integer', 'min:1', 'max:24'],
            'active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($this->postingTimes($validated['schedule_times']) === []) {
            return back()
                ->withErrors(['schedule_times' => 'Add at least one valid 24-hour time, like 09:30,10:30.'])
                ->withInput();
        }

        $telegramCampaign->update(array_merge($validated, [
            'active' => (bool) ($validated['active'] ?? false),
        ]));

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Daily routine updated successfully.');
    }

    public function destroyCampaign(TelegramCampaign $telegramCampaign): RedirectResponse
    {
        $telegramCampaign->delete();

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Daily routine deleted successfully.');
    }

    public function destroyDelivery(AutomationDelivery $automationDelivery): RedirectResponse
    {
        $automationDelivery->delete();

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram send history deleted successfully.');
    }

    public function queueDirectMessage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'target_identifier' => ['nullable', 'string', 'max:255'],
            'message_template_id' => ['nullable', 'exists:message_templates,id'],
            'message_body' => ['required_without:message_template_id', 'nullable', 'string'],
        ]);

        $customer = isset($validated['customer_id'])
            ? Customer::query()->find($validated['customer_id'])
            : null;
        $targetIdentifier = trim((string) ($validated['target_identifier'] ?? ''))
            ?: $customer?->telegram_chat_id
            ?: $customer?->telegram_username;
        $template = isset($validated['message_template_id'])
            ? MessageTemplate::query()->where('active', true)->findOrFail($validated['message_template_id'])
            : null;
        $messageBody = trim((string) ($validated['message_body'] ?? '')) ?: $template?->body ?: '';

        if (! $targetIdentifier) {
            return back()
                ->withErrors(['target_identifier' => 'Choose a customer with Telegram info or enter a Telegram username/chat ID.'])
                ->withInput();
        }

        if (! $messageBody && ! $template?->source_message_ref) {
            return back()
                ->withErrors(['message_body' => 'Type a message or choose a Telegram source post/template.'])
                ->withInput();
        }

        AutomationDelivery::query()->create([
            'social_channel_id' => $this->telegramChannel()->id,
            'message_template_id' => $template?->id,
            'customer_id' => $customer?->id,
            'platform' => 'telegram',
            'purpose' => 'direct_message',
            'target_type' => $customer ? 'customer' : 'user',
            'target_identifier' => $targetIdentifier,
            'message_body' => $this->renderCustomerTemplate($messageBody, $customer),
            'source_message_ref' => $template?->source_message_ref,
            'status' => 'queued',
            'scheduled_for' => now(),
            'metadata' => [
                'queued_from' => 'web_app',
                'manual_target' => ! $customer,
            ],
        ]);

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', 'Telegram direct message queued successfully.');
    }

    public function sendQueued(Request $request, TelegramDeliverySender $sender): RedirectResponse
    {
        $validated = $request->validate([
            'limit' => ['required', 'integer', 'min:1', 'max:20'],
            'purpose' => ['required', Rule::in(['all', 'direct_message', 'renewal_reminder', 'marketing'])],
        ]);

        $purpose = $validated['purpose'] === 'all' ? null : $validated['purpose'];

        $stats = $sender->sendQueued((int) $validated['limit'], $purpose);

        $message = "Manual Telegram sender processed {$stats['processed']} message(s): {$stats['sent']} sent, {$stats['failed']} failed.";

        return redirect()
            ->route('automation.telegram.index')
            ->with($stats['failed'] > 0 ? 'error' : 'success', $message);
    }

    public function schedulerTick(TelegramDeliverySender $sender): JsonResponse
    {
        if (! env('TELEGRAM_MARKETING_AUTOSEND', false)) {
            return response()->json([
                'ok' => true,
                'paused' => true,
                'processed' => 0,
                'sent' => 0,
                'failed' => 0,
            ]);
        }

        $limit = max(1, min(5, (int) env('TELEGRAM_MARKETING_SEND_LIMIT', 1)));
        $stats = $sender->sendQueued($limit, 'marketing');

        return response()->json([
            'ok' => true,
            'paused' => false,
            ...$stats,
        ]);
    }

    public function queueRenewalReminders(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'message_template_id' => ['required', 'exists:message_templates,id'],
            'days_window' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $template = MessageTemplate::query()
            ->where('purpose', 'renewal_reminder')
            ->where('active', true)
            ->findOrFail($validated['message_template_id']);
        $from = now()->startOfDay();
        $to = now()->addDays((int) $validated['days_window'])->endOfDay();
        $queued = 0;

        $subscriptions = Subscription::query()
            ->with(['customer', 'service', 'expiryReminders'])
            ->whereNotIn('status', [SubscriptionStatus::Cancelled->value, SubscriptionStatus::Refunded->value])
            ->whereBetween('end_date', [$from->toDateString(), $to->toDateString()])
            ->whereHas('customer', function ($query) {
                $query->where('telegram_notifications_enabled', true)
                    ->where(function ($customerQuery) {
                        $customerQuery->whereNotNull('telegram_chat_id')->orWhereNotNull('telegram_username');
                    });
            })
            ->get();

        DB::transaction(function () use ($subscriptions, $template, &$queued): void {
            foreach ($subscriptions as $subscription) {
                $customer = $subscription->customer;
                $targetIdentifier = $customer?->telegram_chat_id ?: $customer?->telegram_username;

                if (! $customer || ! $targetIdentifier) {
                    continue;
                }

                $alreadyQueued = AutomationDelivery::query()
                    ->where('platform', 'telegram')
                    ->where('purpose', 'renewal_reminder')
                    ->where('message_template_id', $template->id)
                    ->where('subscription_id', $subscription->id)
                    ->whereIn('status', ['queued', 'sent'])
                    ->exists();

                if ($alreadyQueued) {
                    continue;
                }

                AutomationDelivery::query()->create([
                    'social_channel_id' => $this->telegramChannel()->id,
                    'message_template_id' => $template->id,
                    'customer_id' => $customer->id,
                    'subscription_id' => $subscription->id,
                    'expiry_reminder_id' => $subscription->expiryReminders->sortBy('reminder_date')->first()?->id,
                    'platform' => 'telegram',
                    'purpose' => 'renewal_reminder',
                    'target_type' => 'customer',
                    'target_identifier' => $targetIdentifier,
                    'message_body' => $this->renderTemplate($template->body, $subscription),
                    'source_message_ref' => $template->source_message_ref,
                    'status' => 'queued',
                    'scheduled_for' => now(),
                    'metadata' => [
                        'queued_from' => 'web_app',
                        'end_date' => $subscription->end_date?->toDateString(),
                    ],
                ]);

                $queued++;
            }
        });

        return redirect()
            ->route('automation.telegram.index')
            ->with('success', "Queued {$queued} Telegram renewal reminders.");
    }

    private function telegramChannel(): SocialChannel
    {
        return SocialChannel::query()->firstOrCreate(
            ['platform' => 'telegram', 'name' => 'Telegram'],
            ['active' => true, 'settings' => ['provider' => 'telethon_bridge']],
        );
    }

    public function queueDailyCampaigns(): array
    {
        $queued = 0;
        $checked = 0;

        TelegramCampaign::query()
            ->with(['telegramTarget', 'messageTemplate'])
            ->where('active', true)
            ->get()
            ->each(function (TelegramCampaign $campaign) use (&$queued, &$checked): void {
                $checked++;
                $queued += $this->queueCampaignForDate($campaign, now()->toDateString());
            });

        return [
            'checked' => $checked,
            'queued' => $queued,
        ];
    }

    private function renderTemplate(string $body, Subscription $subscription): string
    {
        return strtr($body, [
            '{customer_name}' => $subscription->customer?->name ?? 'Customer',
            '{service_name}' => $subscription->service?->name ?? 'Service',
            '{order_number}' => $subscription->internal_order_number,
            '{end_date}' => $subscription->end_date?->toDateString() ?? '',
        ]);
    }

    private function renderCustomerTemplate(string $body, ?Customer $customer): string
    {
        return strtr($body, [
            '{customer_name}' => $customer?->name ?? 'Customer',
            '{telegram_username}' => $customer?->telegram_username ?? '',
            '{telegram_chat_id}' => $customer?->telegram_chat_id ?? '',
        ]);
    }

    private function validateTarget(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'target_type' => ['required', Rule::in(['group', 'channel', 'user'])],
            'target_identifier' => ['required', 'string', 'max:255'],
            'permission_status' => ['required', Rule::in(['allowed', 'requires_review', 'blocked'])],
            'posting_hours' => ['nullable', 'string', 'max:255'],
            'daily_limit' => ['required', 'integer', 'min:1', 'max:24'],
            'active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ]);
    }

    private function validateTemplate(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'purpose' => ['required', Rule::in(['marketing', 'direct_message', 'renewal_reminder'])],
            'body' => ['required_without:source_message_ref', 'nullable', 'string'],
            'source_message_ref' => ['required_without:body', 'nullable', 'string', 'max:255'],
            'active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ]);
        $validated['body'] = trim((string) ($validated['body'] ?? ''));
        $sourceMessageRef = trim((string) ($validated['source_message_ref'] ?? ''));

        if ($validated['body'] === '' && $sourceMessageRef === '') {
            back()
                ->withErrors(['source_message_ref' => 'Paste a Telegram source message link or add fallback text.'])
                ->withInput()
                ->throwResponse();
        }

        $validated['source_message_ref'] = $sourceMessageRef ?: null;
        $validated['active'] = (bool) ($validated['active'] ?? true);

        return $validated;
    }

    /**
     * @return array<int, \Illuminate\Support\Carbon>
     */
    private function marketingSendTimes(TelegramTarget $target, string $scheduleMode, int $sendCount): array
    {
        if ($scheduleMode === 'now') {
            return [now()];
        }

        $count = max(1, min($sendCount, 10));
        $postingTimes = $this->postingTimes($target->posting_hours);

        if ($postingTimes === []) {
            $postingTimes = $this->spreadTimes($count);
        }

        $times = [];

        foreach (array_slice($postingTimes, 0, $count) as $postingTime) {
            $sendAt = now()->setTime($postingTime['hour'], $postingTime['minute']);

            if ($sendAt->lessThanOrEqualTo(now())) {
                $sendAt->addDay();
            }

            $times[] = $sendAt;
        }

        return $times;
    }

    private function queueCampaignForDate(TelegramCampaign $campaign, string $date): int
    {
        $campaign->loadMissing(['messageTemplate', 'telegramTarget']);
        $template = $campaign->messageTemplate;
        $target = $campaign->telegramTarget;

        if (! $template || ! $target || ! $template->active || ! $target->active || $target->permission_status !== 'allowed') {
            return 0;
        }

        $queued = 0;
        $times = array_slice($this->postingTimes($campaign->schedule_times), 0, $campaign->daily_limit);

        foreach ($times as $time) {
            $scheduledFor = Carbon::parse($date)->setTime($time['hour'], $time['minute']);

            if ($scheduledFor->lessThan(now()->startOfMinute())) {
                continue;
            }

            $exists = AutomationDelivery::query()
                ->where('platform', 'telegram')
                ->where('purpose', 'marketing')
                ->where('telegram_target_id', $target->id)
                ->where('message_template_id', $template->id)
                ->where('scheduled_for', $scheduledFor)
                ->exists();

            if ($exists) {
                continue;
            }

            AutomationDelivery::query()->create([
                'social_channel_id' => $this->telegramChannel()->id,
                'message_template_id' => $template->id,
                'telegram_target_id' => $target->id,
                'platform' => 'telegram',
                'purpose' => 'marketing',
                'target_type' => $target->target_type,
                'target_identifier' => $target->target_identifier,
                'message_body' => $template->body,
                'source_message_ref' => $template->source_message_ref,
                'status' => 'queued',
                'scheduled_for' => $scheduledFor,
                'metadata' => [
                    'queued_from' => 'daily_routine',
                    'telegram_campaign_id' => $campaign->id,
                ],
            ]);

            $queued++;
        }

        $campaign->update(['last_queued_for' => $date]);

        return $queued;
    }

    /**
     * @return array<int, array{hour: int, minute: int}>
     */
    private function postingTimes(?string $times): array
    {
        if (! $times) {
            return [];
        }

        $parsed = [];

        foreach (explode(',', $times) as $time) {
            $time = trim($time);

            if (! preg_match('/^(\d{1,2})(?::(\d{1,2}))?$/', $time, $matches)) {
                continue;
            }

            $hour = (int) $matches[1];
            $minute = isset($matches[2]) ? (int) $matches[2] : 0;

            if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59) {
                continue;
            }

            $parsed[sprintf('%02d:%02d', $hour, $minute)] = [
                'hour' => $hour,
                'minute' => $minute,
            ];
        }

        ksort($parsed);

        return array_values($parsed);
    }

    /**
     * @return array<int, array{hour: int, minute: int}>
     */
    private function spreadTimes(int $count): array
    {
        if ($count <= 1) {
            return [[
                'hour' => (int) now()->format('H'),
                'minute' => (int) now()->format('i'),
            ]];
        }

        $start = 9;
        $end = 21;
        $step = ($end - $start) / max(1, $count - 1);
        $hours = [];

        for ($index = 0; $index < $count; $index++) {
            $hours[] = (int) round($start + ($step * $index));
        }

        return collect($hours)
            ->unique()
            ->values()
            ->map(fn (int $hour): array => [
                'hour' => $hour,
                'minute' => 0,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function targetData(TelegramTarget $target): array
    {
        return [
            'id' => $target->id,
            'name' => $target->name,
            'target_type' => $target->target_type,
            'target_identifier' => $target->target_identifier,
            'permission_status' => $target->permission_status,
            'active' => $target->active,
            'posting_hours' => $target->posting_hours,
            'daily_limit' => $target->daily_limit,
            'last_queued_at' => $target->last_queued_at?->toDateTimeString(),
            'notes' => $target->notes,
        ];
    }

    private function campaignData(TelegramCampaign $campaign): array
    {
        return [
            'id' => $campaign->id,
            'name' => $campaign->name,
            'message_template_id' => $campaign->message_template_id,
            'telegram_target_id' => $campaign->telegram_target_id,
            'template_name' => $campaign->messageTemplate?->name,
            'target_name' => $campaign->telegramTarget?->name,
            'schedule_times' => $campaign->schedule_times,
            'daily_limit' => $campaign->daily_limit,
            'active' => $campaign->active,
            'last_queued_for' => $campaign->last_queued_for?->toDateString(),
            'notes' => $campaign->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function templateData(MessageTemplate $template): array
    {
        return [
            'id' => $template->id,
            'name' => $template->name,
            'purpose' => $template->purpose,
            'body' => $template->body,
            'source_message_ref' => $template->source_message_ref,
            'active' => $template->active,
            'notes' => $template->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function deliveryData(AutomationDelivery $delivery): array
    {
        return [
            'id' => $delivery->id,
            'purpose' => $delivery->purpose,
            'target_type' => $delivery->target_type,
            'target_identifier' => $delivery->target_identifier,
            'template_name' => $delivery->messageTemplate?->name,
            'target_name' => $delivery->telegramTarget?->name,
            'customer_name' => $delivery->customer?->name,
            'subscription_label' => $delivery->subscription?->internal_order_number,
            'service_name' => $delivery->subscription?->service?->name,
            'status' => $delivery->status,
            'scheduled_for' => $delivery->scheduled_for?->toDateTimeString(),
            'sent_at' => $delivery->sent_at?->toDateTimeString(),
            'error_message' => $delivery->error_message,
        ];
    }
}
