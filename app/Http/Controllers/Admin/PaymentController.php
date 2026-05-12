<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CurrencyCode;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PaymentRequest;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'customer_id' => $request->filled('customer_id') ? (string) $request->integer('customer_id') : '',
        ];

        $payments = Payment::query()
            ->with(['customer', 'subscription.service'])
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(COALESCE(reference, \'\')) LIKE ?', [$search])
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->whereRaw('LOWER(name) LIKE ?', [$search]))
                        ->orWhereHas('subscription', function ($subscriptionQuery) use ($search) {
                            $subscriptionQuery
                                ->whereRaw('LOWER(internal_order_number) LIKE ?', [$search])
                                ->orWhereRaw('LOWER(plan_name) LIKE ?', [$search])
                                ->orWhereRaw('LOWER(account_identifier) LIKE ?', [$search])
                                ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->whereRaw('LOWER(name) LIKE ?', [$search]));
                        });
                });
            })
            ->when($filters['customer_id'] !== '', fn ($query) => $query->where('customer_id', (int) $filters['customer_id']))
            ->latest('paid_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Payment $payment) => $this->paymentData($payment));

        return Inertia::render('admin/payments/index', [
            'payments' => $payments,
            'filters' => $filters,
            'customers' => $this->customerOptions(),
        ]);
    }

    public function create(Request $request): Response
    {
        $customerId = $request->filled('customer') ? (string) $request->integer('customer') : '';
        $subscriptionId = $request->filled('subscription') ? (string) $request->integer('subscription') : '';
        $customer = $customerId !== '' ? Customer::query()->find((int) $customerId) : null;
        $subscription = $subscriptionId !== '' ? Subscription::query()->find((int) $subscriptionId) : null;

        return Inertia::render('admin/payments/create', [
            'customers' => $this->customerOptions(),
            'subscriptions' => $this->subscriptionOptions(),
            'currencies' => $this->currencyOptions(),
            'methods' => $this->methodOptions(),
            'defaults' => [
                'customer_id' => $customerId !== '' ? $customerId : ($subscription ? (string) $subscription->customer_id : ''),
                'subscription_id' => $subscriptionId,
                'currency' => $customer?->preferred_currency?->value ?? CurrencyCode::USD->value,
                'return_to_customer' => $customerId !== '',
            ],
        ]);
    }

    public function store(PaymentRequest $request, PaymentService $paymentService): RedirectResponse
    {
        $payload = $paymentService->prepareForPersistence($request->validated());
        $payment = Payment::query()->create($payload);
        $paymentService->syncExchangeRateSnapshot($payment);

        return $this->redirectAfterSave($payment, $request->boolean('return_to_customer'), 'Payment created successfully.');
    }

    public function edit(Payment $payment, Request $request): Response
    {
        return Inertia::render('admin/payments/edit', [
            'payment' => $this->paymentFormData($payment),
            'customers' => $this->customerOptions(),
            'subscriptions' => $this->subscriptionOptions(),
            'currencies' => $this->currencyOptions(),
            'methods' => $this->methodOptions(),
            'defaults' => [
                'return_to_customer' => $request->boolean('return_to_customer', false),
            ],
        ]);
    }

    public function update(PaymentRequest $request, Payment $payment, PaymentService $paymentService): RedirectResponse
    {
        $payload = $paymentService->prepareForPersistence($request->validated());
        $payment->update($payload);
        $paymentService->syncExchangeRateSnapshot($payment->fresh());

        return $this->redirectAfterSave($payment->fresh(), $request->boolean('return_to_customer'), 'Payment updated successfully.');
    }

    public function destroy(Payment $payment): RedirectResponse
    {
        $payment->delete();

        return redirect()
            ->back()
            ->with('success', 'Payment deleted successfully.');
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
     * @return array<int, array{value: string, label: string, customer_id: string, sale_amount_usd: string, paid_total_usd: string}>
     */
    private function subscriptionOptions(): array
    {
        return Subscription::query()
            ->with(['customer', 'service'])
            ->withSum('payments', 'amount_usd')
            ->latest('sale_recorded_at')
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
                'sale_amount_usd' => (string) $subscription->sale_amount_usd,
                'paid_total_usd' => number_format((float) ($subscription->payments_sum_amount_usd ?? 0), 4, '.', ''),
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
    private function methodOptions(): array
    {
        return array_map(
            fn (PaymentMethod $method) => ['value' => $method->value, 'label' => ucwords(str_replace('_', ' ', $method->value))],
            PaymentMethod::cases(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function paymentData(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'subscription_id' => $payment->subscription_id,
            'subscription_label' => $payment->subscription?->internal_order_number,
            'customer_id' => $payment->customer_id,
            'customer_name' => $payment->customer?->name,
            'service_name' => $payment->subscription?->service?->name,
            'amount_original' => $payment->amount_original,
            'currency' => $payment->currency?->value ?? CurrencyCode::USD->value,
            'exchange_rate_to_usd' => $payment->exchange_rate_to_usd,
            'amount_usd' => $payment->amount_usd,
            'paid_at' => $payment->paid_at?->toDateTimeString(),
            'method' => $payment->method?->value ?? '',
            'method_label' => $payment->method ? ucwords(str_replace('_', ' ', $payment->method->value)) : null,
            'reference' => $payment->reference,
            'notes' => $payment->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paymentFormData(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'subscription_id' => (string) $payment->subscription_id,
            'customer_id' => (string) $payment->customer_id,
            'amount_original' => (string) $payment->amount_original,
            'currency' => $payment->currency?->value ?? CurrencyCode::USD->value,
            'exchange_rate_to_usd' => (string) $payment->exchange_rate_to_usd,
            'paid_at' => $payment->paid_at?->format('Y-m-d\TH:i'),
            'method' => $payment->method?->value ?? '',
            'reference' => $payment->reference ?? '',
            'notes' => $payment->notes ?? '',
        ];
    }

    private function redirectAfterSave(Payment $payment, bool $returnToCustomer, string $message): RedirectResponse
    {
        if ($returnToCustomer) {
            return redirect()
                ->route('customers.show', $payment->customer_id)
                ->with('success', $message);
        }

        return redirect()
            ->route('payments.index')
            ->with('success', $message);
    }
}
