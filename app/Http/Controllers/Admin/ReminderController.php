<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReminderStatus;
use App\Http\Controllers\Controller;
use App\Models\ExpiryReminder;
use App\Services\ExpiryReminderService;
use App\Services\SubscriptionService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReminderController extends Controller
{
    public function index(Request $request, ExpiryReminderService $expiryReminderService, SubscriptionService $subscriptionService): Response
    {
        $expiryReminderService->syncAll();

        $today = CarbonImmutable::today();
        $filters = [
            'search' => trim((string) $request->string('search')),
            'status' => trim((string) $request->string('status', ReminderStatus::Pending->value)),
            'timing' => trim((string) $request->string('timing', 'all')),
        ];

        $reminders = ExpiryReminder::query()
            ->with(['subscription.customer', 'subscription.service'])
            ->whereHas('subscription')
            ->when($filters['status'] !== '' && $filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['timing'] === 'overdue', fn ($query) => $query->where('reminder_date', '<', $today->toDateString()))
            ->when($filters['timing'] === 'due_today', fn ($query) => $query->whereDate('reminder_date', $today->toDateString()))
            ->when($filters['timing'] === 'upcoming', fn ($query) => $query->where('reminder_date', '>', $today->toDateString()))
            ->when($filters['timing'] === 'next_7', fn ($query) => $query->whereBetween('reminder_date', [
                $today->toDateString(),
                $today->addDays(7)->toDateString(),
            ]))
            ->when($filters['timing'] === 'needs_attention', fn ($query) => $query
                ->where('status', ReminderStatus::Pending->value)
                ->where('reminder_date', '<=', $today->toDateString()))
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->whereHas('subscription', function ($subscriptionQuery) use ($search) {
                    $subscriptionQuery
                        ->whereRaw('LOWER(internal_order_number) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(account_identifier) LIKE ?', [$search])
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->whereRaw('LOWER(name) LIKE ?', [$search]))
                        ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->whereRaw('LOWER(name) LIKE ?', [$search]));
                });
            })
            ->orderByRaw('
                CASE
                    WHEN status = ? AND reminder_date < ? THEN 0
                    WHEN status = ? AND reminder_date = ? THEN 1
                    WHEN status = ? THEN 2
                    ELSE 3
                END
            ', [
                ReminderStatus::Pending->value,
                $today->toDateString(),
                ReminderStatus::Pending->value,
                $today->toDateString(),
                ReminderStatus::Pending->value,
            ])
            ->orderBy('reminder_date')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ExpiryReminder $reminder) => $this->reminderData($reminder, $subscriptionService));

        return Inertia::render('admin/reminders/index', [
            'reminders' => $reminders,
            'filters' => $filters,
            'statuses' => [
                ['value' => 'all', 'label' => 'All reminder statuses'],
                ['value' => ReminderStatus::Pending->value, 'label' => 'Pending'],
                ['value' => ReminderStatus::Handled->value, 'label' => 'Handled'],
                ['value' => ReminderStatus::Dismissed->value, 'label' => 'Dismissed'],
            ],
            'timings' => [
                ['value' => 'all', 'label' => 'All reminder windows'],
                ['value' => 'needs_attention', 'label' => 'Needs attention'],
                ['value' => 'overdue', 'label' => 'Overdue'],
                ['value' => 'due_today', 'label' => 'Due today'],
                ['value' => 'upcoming', 'label' => 'Upcoming'],
                ['value' => 'next_7', 'label' => 'Next 7 days'],
            ],
            'summary' => $this->summaryData($today),
        ]);
    }

    public function handle(ExpiryReminder $expiryReminder): RedirectResponse
    {
        $expiryReminder->update([
            'status' => ReminderStatus::Handled->value,
            'sent_at' => now(),
        ]);

        return redirect()
            ->back()
            ->with('success', 'Reminder marked as handled.');
    }

    public function snooze(ExpiryReminder $expiryReminder): RedirectResponse
    {
        $expiryReminder->update([
            'status' => ReminderStatus::Pending->value,
            'reminder_date' => CarbonImmutable::tomorrow()->toDateString(),
        ]);

        return redirect()
            ->back()
            ->with('success', 'Reminder snoozed until tomorrow.');
    }

    public function dismiss(ExpiryReminder $expiryReminder): RedirectResponse
    {
        $expiryReminder->update([
            'status' => ReminderStatus::Dismissed->value,
        ]);

        return redirect()
            ->back()
            ->with('success', 'Reminder dismissed.');
    }

    public function reopen(ExpiryReminder $expiryReminder): RedirectResponse
    {
        $expiryReminder->update([
            'status' => ReminderStatus::Pending->value,
            'sent_at' => null,
        ]);

        return redirect()
            ->back()
            ->with('success', 'Reminder reopened.');
    }

    /**
     * @return array<string, mixed>
     */
    private function reminderData(ExpiryReminder $reminder, SubscriptionService $subscriptionService): array
    {
        $subscription = $reminder->subscription;
        $today = CarbonImmutable::today();
        $reminderDate = $reminder->reminder_date->toImmutable();
        $daysUntilReminder = $today->diffInDays($reminderDate, false);
        $countdown = $subscriptionService->countdown($subscription->end_date->toImmutable());

        if ($daysUntilReminder < 0) {
            $timingLabel = 'Overdue by {days} days';
            $timingReplacements = ['days' => abs($daysUntilReminder)];
            $timingStatus = 'overdue';
        } elseif ($daysUntilReminder === 0) {
            $timingLabel = 'Due today';
            $timingReplacements = [];
            $timingStatus = 'due_today';
        } else {
            $timingLabel = 'Upcoming in {days} days';
            $timingReplacements = ['days' => $daysUntilReminder];
            $timingStatus = 'upcoming';
        }

        return [
            'id' => $reminder->id,
            'subscription_id' => $subscription->id,
            'customer_id' => $subscription->customer_id,
            'internal_order_number' => $subscription->internal_order_number,
            'customer_name' => $subscription->customer?->name,
            'service_name' => $subscription->service?->name,
            'account_identifier' => $subscription->account_identifier,
            'end_date' => $subscription->end_date?->toDateString(),
            'reminder_date' => $reminder->reminder_date?->toDateString(),
            'days_before_expiry' => $reminder->days_before_expiry,
            'status' => $reminder->status?->value ?? $reminder->status,
            'status_label' => ucfirst($reminder->status?->value ?? (string) $reminder->status),
            'sent_at' => $reminder->sent_at?->toDateTimeString(),
            'timing_status' => $timingStatus,
            'timing_label' => $timingLabel,
            'timing_replacements' => $timingReplacements,
            'countdown_status' => $countdown['countdown_status'],
            'countdown_label' => $countdown['countdown_label'],
        ];
    }

    /**
     * @return array<string, int>
     */
    private function summaryData(CarbonImmutable $today): array
    {
        $baseQuery = ExpiryReminder::query()->whereHas('subscription');

        return [
            'pending_total' => (clone $baseQuery)->where('status', ReminderStatus::Pending->value)->count(),
            'overdue' => (clone $baseQuery)
                ->where('status', ReminderStatus::Pending->value)
                ->where('reminder_date', '<', $today->toDateString())
                ->count(),
            'due_today' => (clone $baseQuery)
                ->where('status', ReminderStatus::Pending->value)
                ->whereDate('reminder_date', $today->toDateString())
                ->count(),
            'next_7_days' => (clone $baseQuery)
                ->where('status', ReminderStatus::Pending->value)
                ->whereBetween('reminder_date', [$today->toDateString(), $today->addDays(7)->toDateString()])
                ->count(),
            'handled' => (clone $baseQuery)->where('status', ReminderStatus::Handled->value)->count(),
            'dismissed' => (clone $baseQuery)->where('status', ReminderStatus::Dismissed->value)->count(),
        ];
    }
}
