<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditEvent;
use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SubscriptionRequest;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Services\ExchangeRateSnapshotService;
use App\Services\ExpiryReminderService;
use App\Services\SubscriptionService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(Request $request, SubscriptionService $subscriptionService): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'customer_id' => $request->filled('customer_id') ? (string) $request->integer('customer_id') : '',
        ];

        $subscriptions = Subscription::query()
            ->with(['customer', 'service', 'supplier', 'renewedFrom.service'])
            ->withSum('payments', 'amount_usd')
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(internal_order_number) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(plan_name) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(account_identifier) LIKE ?', [$search])
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->whereRaw('LOWER(name) LIKE ?', [$search]))
                        ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->whereRaw('LOWER(name) LIKE ?', [$search]))
                        ->orWhereHas('supplier', fn ($supplierQuery) => $supplierQuery->whereRaw('LOWER(name) LIKE ?', [$search]));
                });
            })
            ->when($filters['customer_id'] !== '', fn ($query) => $query->where('customer_id', (int) $filters['customer_id']))
            ->latest('sale_recorded_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Subscription $subscription) => $this->subscriptionData($subscription, $subscriptionService));

        return Inertia::render('admin/subscriptions/index', [
            'subscriptions' => $subscriptions,
            'filters' => $filters,
            'customers' => $this->customerOptions(),
        ]);
    }

    public function create(Request $request): Response
    {
        $customerId = $request->filled('customer') ? (string) $request->integer('customer') : '';
        $customer = $customerId !== '' ? Customer::query()->find((int) $customerId) : null;

        return Inertia::render('admin/subscriptions/create', [
            'customers' => $this->customerOptions(),
            'services' => $this->serviceOptions(),
            'suppliers' => $this->supplierOptions(),
            'currencies' => $this->currencyOptions(),
            'statuses' => $this->statusOptions(),
            'durationUnits' => $this->durationUnitOptions(),
            'renewalSubscriptions' => $this->renewalOptions(),
            'defaults' => [
                'customer_id' => $customerId,
                'sale_currency' => $customer?->preferred_currency?->value ?? CurrencyCode::ILS->value,
                'return_to_customer' => $customerId !== '',
            ],
        ]);
    }

    public function store(
        SubscriptionRequest $request,
        SubscriptionService $subscriptionService,
        ExchangeRateSnapshotService $exchangeRateSnapshotService,
        ExpiryReminderService $expiryReminderService,
    ): RedirectResponse
    {
        $validated = $request->validated();

        $payload = $subscriptionService->prepareForPersistence(array_merge(
            Arr::except($validated, ['account_secret', 'return_to_customer']),
            [
                'internal_order_number' => $subscriptionService->generateInternalOrderNumber(),
                'account_secret_encrypted' => blank($validated['account_secret'] ?? null) ? null : $validated['account_secret'],
            ],
        ));

        $subscription = Subscription::query()->create($payload);
        $exchangeRateSnapshotService->syncForSubscriptionSale($subscription);
        $expiryReminderService->syncForSubscription($subscription);

        return $this->redirectAfterSave($subscription, $request->boolean('return_to_customer'), 'Subscription created successfully.');
    }

    public function edit(Subscription $subscription, Request $request): Response
    {
        $returnToCustomer = $request->boolean('return_to_customer', true);

        return Inertia::render('admin/subscriptions/edit', [
            'subscription' => $this->subscriptionFormData($subscription),
            'customers' => $this->customerOptions(),
            'services' => $this->serviceOptions(),
            'suppliers' => $this->supplierOptions(),
            'currencies' => $this->currencyOptions(),
            'statuses' => $this->statusOptions(),
            'durationUnits' => $this->durationUnitOptions(),
            'renewalSubscriptions' => $this->renewalOptions($subscription),
            'defaults' => [
                'return_to_customer' => $returnToCustomer,
            ],
        ]);
    }

    public function update(
        SubscriptionRequest $request,
        Subscription $subscription,
        SubscriptionService $subscriptionService,
        ExchangeRateSnapshotService $exchangeRateSnapshotService,
        ExpiryReminderService $expiryReminderService,
    ): RedirectResponse
    {
        $validated = $request->validated();

        $basePayload = Arr::except($validated, ['account_secret', 'return_to_customer']);

        if (! blank($validated['account_secret'] ?? null)) {
            $basePayload['account_secret_encrypted'] = $validated['account_secret'];
        }

        $payload = $subscriptionService->prepareForPersistence($basePayload);

        $subscription->update($payload);
        $subscription = $subscription->fresh();
        $exchangeRateSnapshotService->syncForSubscriptionSale($subscription);
        $expiryReminderService->syncForSubscription($subscription);

        return $this->redirectAfterSave($subscription->fresh(['customer']), $request->boolean('return_to_customer'), 'Subscription updated successfully.');
    }

    public function revealSecret(Request $request, Subscription $subscription): JsonResponse
    {
        if (blank($subscription->getRawOriginal('account_secret_encrypted'))) {
            return response()->json([
                'message' => 'No account secret is saved for this subscription.',
            ], 404);
        }

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'auditable_type' => $subscription->getMorphClass(),
            'auditable_id' => $subscription->id,
            'event' => AuditEvent::SecretRevealed,
            'old_values' => null,
            'new_values' => [
                'field' => 'account_secret_encrypted',
                'revealed_at' => now()->toDateTimeString(),
                'account_identifier' => $subscription->account_identifier,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()
            ->json([
                'secret' => $subscription->account_secret_encrypted,
                'revealed_at' => now()->toDateTimeString(),
            ])
            ->header('Cache-Control', 'no-store, private');
    }

    public function destroy(Subscription $subscription): RedirectResponse
    {
        try {
            $subscription->expiryReminders()->delete();
            $subscription->delete();
        } catch (QueryException) {
            return redirect()
                ->back()
                ->with('error', 'This subscription cannot be deleted while related payments still exist.');
        }

        return redirect()
            ->back()
            ->with('success', 'Subscription deleted successfully.');
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function customerOptions(): array
    {
        return Customer::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Customer $customer) => [
                'value' => (string) $customer->id,
                'label' => $customer->name,
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string, default_duration_value: int|null, default_duration_unit: string|null, image_url: string|null}>
     */
    private function serviceOptions(): array
    {
        return Service::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Service $service) => [
                'value' => (string) $service->id,
                'label' => $service->name,
                'default_duration_value' => $service->default_duration_value,
                'default_duration_unit' => $service->default_duration_unit?->value ?? $service->default_duration_unit,
                'image_url' => $service->image_path ? $this->publicStorageUrl($service->image_path) : null,
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function supplierOptions(): array
    {
        return Supplier::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Supplier $supplier) => [
                'value' => (string) $supplier->id,
                'label' => $supplier->name,
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function currencyOptions(): array
    {
        return array_map(
            fn (CurrencyCode $currency) => ['value' => $currency->value, 'label' => $currency->value],
            CurrencyCode::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return array_map(
            fn (SubscriptionStatus $status) => ['value' => $status->value, 'label' => ucfirst(str_replace('_', ' ', $status->value))],
            SubscriptionStatus::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function durationUnitOptions(): array
    {
        return array_map(
            fn (SubscriptionDurationUnit $durationUnit) => ['value' => $durationUnit->value, 'label' => ucfirst($durationUnit->value).'s'],
            SubscriptionDurationUnit::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string, customer_id: string}>
     */
    private function renewalOptions(?Subscription $currentSubscription = null): array
    {
        return Subscription::query()
            ->with(['customer', 'service'])
            ->when($currentSubscription, fn ($query) => $query->whereKeyNot($currentSubscription->getKey()))
            ->latest('end_date')
            ->get()
            ->map(fn (Subscription $subscription) => [
                'value' => (string) $subscription->id,
                'label' => sprintf(
                    '%s - %s - %s',
                    $subscription->internal_order_number,
                    $subscription->customer?->name ?? 'Customer',
                    $subscription->service?->name ?? 'Service',
                ),
                'customer_id' => (string) $subscription->customer_id,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionData(Subscription $subscription, SubscriptionService $subscriptionService): array
    {
        $countdown = $subscriptionService->countdown($subscription->end_date->toImmutable());
        $durationUnit = $subscription->duration_unit;

        return [
            'id' => $subscription->id,
            'internal_order_number' => $subscription->internal_order_number,
            'customer_id' => $subscription->customer_id,
            'customer_name' => $subscription->customer?->name,
            'service_id' => $subscription->service_id,
            'service_name' => $subscription->service?->name,
            'service_image_url' => $subscription->service?->image_path ? $this->publicStorageUrl($subscription->service->image_path) : null,
            'supplier_id' => $subscription->supplier_id,
            'supplier_name' => $subscription->supplier?->name,
            'plan_name' => $subscription->plan_name,
            'account_identifier' => $subscription->account_identifier,
            'duration_value' => $subscription->duration_value ?? $subscription->duration_days,
            'duration_unit' => $durationUnit?->value ?? 'day',
            'duration_label' => $durationUnit
                ? $subscriptionService->durationLabel($subscription->duration_value ?? $subscription->duration_days, $durationUnit)
                : ($subscription->duration_days.' days'),
            'sale_recorded_at' => $subscription->sale_recorded_at?->toDateTimeString(),
            'start_date' => $subscription->start_date?->toDateString(),
            'end_date' => $subscription->end_date?->toDateString(),
            'delivered_at' => $subscription->delivered_at?->toDateTimeString(),
            'sale_amount_original' => $subscription->sale_amount_original,
            'sale_currency' => $subscription->sale_currency?->value ?? CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => $subscription->sale_exchange_rate_to_usd,
            'sale_amount_usd' => $subscription->sale_amount_usd,
            'cost_usd' => $subscription->cost_usd,
            'profit_usd' => $subscription->profit_usd,
            'status' => $subscription->status?->value ?? $subscription->status,
            'payment_status' => $subscription->payment_status->value,
            'payment_status_label' => ucfirst($subscription->payment_status->value),
            'paid_total_usd' => number_format((float) ($subscription->payments_sum_amount_usd ?? 0), 4, '.', ''),
            'countdown_status' => $countdown['countdown_status'],
            'countdown_label' => $countdown['countdown_label'],
            'days_remaining' => $countdown['days_remaining'],
            'renewed_from_subscription_id' => $subscription->renewed_from_subscription_id,
            'renewed_from_label' => $subscription->renewedFrom
                ? $subscription->renewedFrom->internal_order_number.' - '.($subscription->renewedFrom->service?->name ?? 'Subscription')
                : null,
            'cancel_reason' => $subscription->cancel_reason,
            'refund_reason' => $subscription->refund_reason,
            'notes' => $subscription->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionFormData(Subscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'internal_order_number' => $subscription->internal_order_number,
            'has_account_secret' => filled($subscription->getRawOriginal('account_secret_encrypted')),
            'customer_id' => (string) $subscription->customer_id,
            'service_id' => (string) $subscription->service_id,
            'supplier_id' => (string) $subscription->supplier_id,
            'renewed_from_subscription_id' => $subscription->renewed_from_subscription_id ? (string) $subscription->renewed_from_subscription_id : '',
            'plan_name' => $subscription->plan_name,
            'account_identifier' => $subscription->account_identifier,
            'duration_value' => (string) ($subscription->duration_value ?? $subscription->duration_days),
            'duration_unit' => $subscription->duration_unit?->value ?? 'day',
            'sale_recorded_at' => $subscription->sale_recorded_at?->format('Y-m-d\TH:i'),
            'start_date' => $subscription->start_date?->toDateString(),
            'delivered_at' => $subscription->delivered_at?->format('Y-m-d\TH:i'),
            'sale_amount_original' => (string) $subscription->sale_amount_original,
            'sale_currency' => $subscription->sale_currency?->value ?? CurrencyCode::ILS->value,
            'sale_exchange_rate_to_usd' => (string) $subscription->sale_exchange_rate_to_usd,
            'cost_usd' => (string) $subscription->cost_usd,
            'status' => $subscription->status?->value ?? SubscriptionStatus::Pending->value,
            'cancel_reason' => $subscription->cancel_reason ?? '',
            'refund_reason' => $subscription->refund_reason ?? '',
            'notes' => $subscription->notes ?? '',
        ];
    }

    private function redirectAfterSave(Subscription $subscription, bool $returnToCustomer, string $message): RedirectResponse
    {
        if ($returnToCustomer) {
            return redirect()
                ->route('customers.show', $subscription->customer_id)
                ->with('success', $message);
        }

        return redirect()
            ->route('subscriptions.index')
            ->with('success', $message);
    }

    private function publicStorageUrl(string $path): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $path), '/');
    }
}
