<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Enums\CurrencyCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CustomerRequest;
use App\Models\Customer;
use App\Models\Subscription;
use App\Services\SubscriptionService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
        ];

        $customers = Customer::query()
            ->withCount(['subscriptions', 'payments'])
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(name) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(email, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$search]);
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Customer $customer) => $this->customerData($customer, true));

        return Inertia::render('admin/customers/index', [
            'customers' => $customers,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/customers/create', [
            'currencies' => $this->currencyOptions(),
        ]);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        Customer::query()->create($this->customerPayload($request));

        return redirect()
            ->route('customers.index')
            ->with('success', 'Customer created successfully.');
    }

    public function edit(Customer $customer): Response
    {
        return Inertia::render('admin/customers/edit', [
            'customer' => $this->customerData($customer),
            'currencies' => $this->currencyOptions(),
        ]);
    }

    public function show(Customer $customer, Request $request, SubscriptionService $subscriptionService): Response
    {
        $customer->loadCount(['subscriptions', 'payments']);

        $filters = [
            'search' => trim((string) $request->string('search')),
        ];

        $subscriptions = Subscription::query()
            ->with(['service', 'supplier', 'renewedFrom.service'])
            ->withSum('payments', 'amount_usd')
            ->where('customer_id', $customer->id)
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(internal_order_number) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(plan_name) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(account_identifier) LIKE ?', [$search])
                        ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->whereRaw('LOWER(name) LIKE ?', [$search]))
                        ->orWhereHas('supplier', fn ($supplierQuery) => $supplierQuery->whereRaw('LOWER(name) LIKE ?', [$search]));
                });
            })
            ->latest('sale_recorded_at')
            ->paginate(8)
            ->withQueryString()
            ->through(fn (Subscription $subscription) => $this->subscriptionData($subscription, $subscriptionService));

        return Inertia::render('admin/customers/show', [
            'customer' => $this->customerData($customer, true),
            'subscriptions' => $subscriptions,
            'filters' => $filters,
        ]);
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($this->customerPayload($request, $customer));

        return redirect()
            ->route('customers.index')
            ->with('success', 'Customer updated successfully.');
    }

    public function lookupTelegram(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'telegram_lookup_query' => ['nullable', 'required_without:telegram_selected_chat_id', 'string', 'max:255'],
            'telegram_selected_chat_id' => ['nullable', 'string', 'max:255'],
            'telegram_selected_username' => ['nullable', 'string', 'max:255'],
            'telegram_selected_name' => ['nullable', 'string', 'max:255'],
            'telegram_enable_notifications' => ['sometimes', 'boolean'],
        ]);
        $enableNotifications = $request->boolean('telegram_enable_notifications');

        if ($request->filled('telegram_selected_chat_id')) {
            $this->saveTelegramMatch($customer, [
                'name' => $validated['telegram_selected_name'] ?? null,
                'chat_id' => $validated['telegram_selected_chat_id'],
                'username' => $validated['telegram_selected_username'] ?? null,
            ], $enableNotifications);

            return redirect()
                ->route('customers.edit', $customer)
                ->with('success', 'Telegram user/chat ID saved successfully.');
        }

        $lookup = $this->runTelegramLookup($validated['telegram_lookup_query']);

        if (! ($lookup['ok'] ?? false)) {
            return back()
                ->withErrors(['telegram_lookup_query' => $lookup['error'] ?? 'Telegram lookup failed.'])
                ->withInput();
        }

        $matches = collect($lookup['matches'] ?? []);

        if ($matches->isEmpty()) {
            return back()
                ->withErrors(['telegram_lookup_query' => 'No matching Telegram chat found. Try the exact Telegram name or @username.'])
                ->withInput();
        }

        if ($matches->count() > 1) {
            $names = $matches
                ->take(5)
                ->map(fn (array $match): string => (string) ($match['name'] ?? $match['username'] ?? $match['chat_id']))
                ->implode(', ');

            return back()
                ->withErrors(['telegram_lookup_query' => "Multiple Telegram chats matched: {$names}. Search more specifically."])
                ->withInput();
        }

        /** @var array<string, mixed> $match */
        $match = $matches->first();
        if (! $this->saveTelegramMatch($customer, $match, $enableNotifications)) {
            return back()
                ->withErrors(['telegram_lookup_query' => 'Telegram matched this chat, but did not return a usable user/chat ID.'])
                ->withInput();
        }

        return redirect()
            ->route('customers.edit', $customer)
            ->with('success', 'Telegram user/chat ID saved successfully.');
    }

    public function searchTelegram(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'telegram_lookup_query' => ['required', 'string', 'max:255'],
        ]);

        $lookup = $this->runTelegramLookup($validated['telegram_lookup_query']);

        if (! ($lookup['ok'] ?? false)) {
            return response()->json([
                'message' => $lookup['error'] ?? 'Telegram lookup failed.',
                'matches' => [],
            ], 422);
        }

        return response()->json([
            'matches' => collect($lookup['matches'] ?? [])
                ->take(20)
                ->map(fn (array $match): array => $this->telegramMatchData($match))
                ->values()
                ->all(),
        ]);
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        try {
            $customer->delete();
        } catch (QueryException) {
            return redirect()
                ->route('customers.index')
                ->with('error', 'This customer cannot be deleted while related records still exist.');
        }

        return redirect()
            ->route('customers.index')
            ->with('success', 'Customer deleted successfully.');
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
     * @return array<string, mixed>
     */
    private function customerData(Customer $customer, bool $includeCounts = false): array
    {
        return array_filter([
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'preferred_currency' => $customer->preferred_currency?->value ?? $customer->preferred_currency,
            'telegram_username' => $customer->telegram_username,
            'telegram_chat_id' => $customer->telegram_chat_id,
            'telegram_notifications_enabled' => $customer->telegram_notifications_enabled,
            'telegram_opted_in_at' => $customer->telegram_opted_in_at?->toDateTimeString(),
            'notes' => $customer->notes,
            'subscriptions_count' => $includeCounts ? $customer->subscriptions_count : null,
            'payments_count' => $includeCounts ? $customer->payments_count : null,
            'created_at' => $customer->created_at?->toDateTimeString(),
            'updated_at' => $customer->updated_at?->toDateTimeString(),
        ], static fn ($value) => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function customerPayload(CustomerRequest $request, ?Customer $customer = null): array
    {
        $payload = $request->validated();
        $notificationsEnabled = $request->boolean('telegram_notifications_enabled');

        $payload['telegram_notifications_enabled'] = $notificationsEnabled;
        $payload['telegram_opted_in_at'] = $notificationsEnabled
            ? ($customer?->telegram_opted_in_at ?? now())
            : null;

        return $payload;
    }

    /**
     * @return array{ok?: bool, error?: string, matches?: array<int, array<string, mixed>>}
     */
    private function runTelegramLookup(string $query): array
    {
        $script = base_path('scripts/telegram_lookup_user.py');
        $binaries = array_values(array_unique(array_filter([
            env('TELEGRAM_PYTHON_BINARY'),
            PHP_OS_FAMILY === 'Windows' ? 'py' : null,
            'python3',
            'python',
        ])));
        $lastError = null;

        foreach ($binaries as $binary) {
            try {
                $result = Process::path(base_path())
                    ->timeout(60)
                    ->run([
                        $binary,
                        $script,
                        $query,
                        '--json',
                        '--no-interactive',
                        '--limit',
                        '500',
                    ]);
            } catch (Throwable $exception) {
                $lastError = $exception->getMessage();

                continue;
            }

            $decoded = json_decode(trim($result->output()), true);

            if (is_array($decoded)) {
                return $decoded;
            }

            $lastError = trim($result->errorOutput()) ?: trim($result->output()) ?: 'Python lookup command failed.';
        }

        return [
            'ok' => false,
            'error' => $lastError ?: 'Could not run Python. Set TELEGRAM_PYTHON_BINARY in .env.',
            'matches' => [],
        ];
    }

    /**
     * @param  array<string, mixed>  $match
     */
    private function saveTelegramMatch(Customer $customer, array $match, bool $enableNotifications): bool
    {
        $username = $match['username'] ?? null;
        $chatId = $match['chat_id'] ?? $match['entity_id'] ?? null;

        if (! $chatId) {
            return false;
        }

        $customer->forceFill([
            'telegram_chat_id' => (string) $chatId,
            'telegram_username' => $username ? '@'.ltrim((string) $username, '@') : $customer->telegram_username,
            'telegram_notifications_enabled' => $enableNotifications,
            'telegram_opted_in_at' => $enableNotifications
                ? ($customer->telegram_opted_in_at ?? now())
                : $customer->telegram_opted_in_at,
        ])->save();

        return true;
    }

    /**
     * @param  array<string, mixed>  $match
     * @return array<string, mixed>
     */
    private function telegramMatchData(array $match): array
    {
        $username = $match['username'] ?? null;

        return [
            'name' => (string) ($match['name'] ?? 'Unnamed chat'),
            'chat_id' => (string) ($match['chat_id'] ?? $match['entity_id'] ?? ''),
            'entity_id' => isset($match['entity_id']) ? (string) $match['entity_id'] : null,
            'username' => $username ? '@'.ltrim((string) $username, '@') : null,
            'phone' => $match['phone'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionData(Subscription $subscription, SubscriptionService $subscriptionService): array
    {
        $countdown = $subscriptionService->countdown($subscription->end_date->toImmutable());
        $durationUnit = $subscription->duration_unit;
        $durationLabel = $durationUnit
            ? $subscriptionService->durationLabel($subscription->duration_value ?? $subscription->duration_days, $durationUnit)
            : ($subscription->duration_days.' days');

        return [
            'id' => $subscription->id,
            'internal_order_number' => $subscription->internal_order_number,
            'service_name' => $subscription->service?->name,
            'service_image_url' => $subscription->service?->image_path ? $this->publicStorageUrl($subscription->service->image_path) : null,
            'supplier_name' => $subscription->supplier?->name,
            'plan_name' => $subscription->plan_name,
            'account_identifier' => $subscription->account_identifier,
            'duration_value' => $subscription->duration_value ?? $subscription->duration_days,
            'duration_unit' => $durationUnit?->value ?? 'day',
            'duration_label' => $durationLabel,
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
            'renewed_from_label' => $subscription->renewedFrom
                ? $subscription->renewedFrom->internal_order_number.' - '.($subscription->renewedFrom->service?->name ?? 'Subscription')
                : null,
            'notes' => $subscription->notes,
            'cancel_reason' => $subscription->cancel_reason,
            'refund_reason' => $subscription->refund_reason,
            'has_balance_due' => $subscription->payment_status !== PaymentStatus::Paid,
        ];
    }

    private function publicStorageUrl(string $path): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $path), '/');
    }
}
