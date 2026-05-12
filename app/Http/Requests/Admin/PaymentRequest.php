<?php

namespace App\Http\Requests\Admin;

use App\Enums\CurrencyCode;
use App\Enums\PaymentMethod;
use App\Models\Subscription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $subscriptionId = $this->input('subscription_id');
        $subscription = filled($subscriptionId) ? Subscription::query()->find($subscriptionId) : null;
        $currency = (string) $this->input('currency', CurrencyCode::USD->value);
        $exchangeRate = $this->input('exchange_rate_to_usd');

        $this->merge([
            'customer_id' => $this->input('customer_id', $subscription?->customer_id),
            'exchange_rate_to_usd' => $currency === CurrencyCode::USD->value && blank($exchangeRate) ? '1' : $exchangeRate,
            'return_to_customer' => $this->boolean('return_to_customer'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'subscription_id' => ['required', 'integer', 'exists:subscriptions,id'],
            'customer_id' => [
                'required',
                'integer',
                'exists:customers,id',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $subscription = Subscription::query()->find($this->integer('subscription_id'));

                    if (! $subscription || (int) $subscription->customer_id !== (int) $value) {
                        $fail('Payment customer must match the selected subscription.');
                    }
                },
            ],
            'amount_original' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['required', Rule::enum(CurrencyCode::class)],
            'exchange_rate_to_usd' => ['required', 'numeric', 'min:0.00000001'],
            'paid_at' => ['required', 'date'],
            'method' => ['nullable', Rule::enum(PaymentMethod::class)],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'return_to_customer' => ['nullable', 'boolean'],
        ];
    }
}
