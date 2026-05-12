<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\CapitalBatch;
use App\Models\Customer;
use App\Models\ExchangeRateSnapshot;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Services\ExpiryReminderService;
use App\Services\SubscriptionService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(ExpiryReminderService $expiryReminderService, SubscriptionService $subscriptionService): Response
    {
        $missingReminderRows = Subscription::query()
            ->whereNotIn('status', [SubscriptionStatus::Cancelled->value, SubscriptionStatus::Refunded->value])
            ->whereDoesntHave('expiryReminders')
            ->exists();

        if ($missingReminderRows) {
            $expiryReminderService->syncAll();
        }

        $expiringSoon = Subscription::query()
            ->with(['customer', 'service'])
            ->whereNotIn('status', [SubscriptionStatus::Cancelled->value, SubscriptionStatus::Refunded->value])
            ->whereDate('end_date', '>=', now()->toDateString())
            ->whereDate('end_date', '<=', now()->addDays(14)->toDateString())
            ->orderBy('end_date')
            ->limit(5)
            ->get()
            ->map(function (Subscription $subscription) use ($subscriptionService): array {
                $countdown = $subscriptionService->countdown($subscription->end_date->toImmutable());

                return [
                    'id' => $subscription->id,
                    'customer_id' => $subscription->customer_id,
                    'internal_order_number' => $subscription->internal_order_number,
                    'customer_name' => $subscription->customer?->name,
                    'service_name' => $subscription->service?->name,
                    'end_date' => $subscription->end_date?->toDateString(),
                    'countdown_status' => $countdown['countdown_status'],
                    'countdown_label' => $countdown['countdown_label'],
                ];
            })
            ->all();

        $recentPayments = Payment::query()
            ->with(['customer', 'subscription.service'])
            ->latest('paid_at')
            ->limit(5)
            ->get()
            ->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'customer_id' => $payment->customer_id,
                'customer_name' => $payment->customer?->name,
                'subscription_label' => $payment->subscription?->internal_order_number,
                'service_name' => $payment->subscription?->service?->name,
                'amount_original' => $payment->amount_original,
                'currency' => $payment->currency?->value ?? $payment->currency,
                'amount_usd' => $payment->amount_usd,
                'paid_at' => $payment->paid_at?->toDateTimeString(),
            ])
            ->all();

        return Inertia::render('dashboard', [
            'stats' => [
                ['label' => 'Customers', 'value' => (string) Customer::query()->count()],
                ['label' => 'Suppliers', 'value' => (string) Supplier::query()->count()],
                ['label' => 'Services', 'value' => (string) Service::query()->count()],
                ['label' => 'Subscriptions', 'value' => (string) Subscription::query()->count()],
                ['label' => 'Payments', 'value' => (string) Payment::query()->count()],
                ['label' => 'Capital batches', 'value' => (string) CapitalBatch::query()->count()],
                ['label' => 'Rate snapshots', 'value' => (string) ExchangeRateSnapshot::query()->count()],
            ],
            'modules' => [
                ['name' => 'Customers', 'status' => 'Ready', 'href' => route('customers.index', absolute: false)],
                ['name' => 'Suppliers', 'status' => 'Ready', 'href' => route('suppliers.index', absolute: false)],
                ['name' => 'Services', 'status' => 'Ready', 'href' => route('services.index', absolute: false)],
                ['name' => 'Subscriptions', 'status' => 'Ready', 'href' => route('subscriptions.index', absolute: false)],
                ['name' => 'Payments', 'status' => 'Ready', 'href' => route('payments.index', absolute: false)],
                ['name' => 'Capital batches', 'status' => 'Ready', 'href' => route('capital-batches.index', absolute: false)],
                ['name' => 'Rates', 'status' => 'Ready', 'href' => route('exchange-rate-snapshots.index', absolute: false)],
                ['name' => 'Reports', 'status' => 'Ready', 'href' => route('reports.index', absolute: false)],
                ['name' => 'Reminders', 'status' => 'Ready', 'href' => route('reminders.index', absolute: false)],
                ['name' => 'Audit log', 'status' => 'Ready', 'href' => route('audit-logs.index', absolute: false)],
            ],
            'expiringSoon' => $expiringSoon,
            'recentPayments' => $recentPayments,
        ]);
    }
}
