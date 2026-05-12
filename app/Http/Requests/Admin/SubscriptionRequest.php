<?php

namespace App\Http\Requests\Admin;

use App\Enums\CurrencyCode;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $saleCurrency = (string) $this->input('sale_currency', CurrencyCode::ILS->value);
        $saleExchangeRate = $this->input('sale_exchange_rate_to_usd');

        $this->merge([
            'sale_exchange_rate_to_usd' => $saleCurrency === CurrencyCode::USD->value && blank($saleExchangeRate) ? '1' : $saleExchangeRate,
            'return_to_customer' => $this->boolean('return_to_customer'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'renewed_from_subscription_id' => [
                'nullable',
                'integer',
                'exists:subscriptions,id',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $renewedFrom = Subscription::query()->find($value);

                    if (! $renewedFrom || (int) $renewedFrom->customer_id !== (int) $this->integer('customer_id')) {
                        $fail('Renewal source must belong to the same customer.');
                    }
                },
            ],
            'plan_name' => ['required', 'string', 'max:255'],
            'account_identifier' => ['required', 'string', 'max:255'],
            'account_secret' => ['nullable', 'string'],
            'duration_value' => ['required', 'integer', 'min:1'],
            'duration_unit' => ['required', Rule::enum(SubscriptionDurationUnit::class)],
            'sale_recorded_at' => ['required', 'date'],
            'start_date' => ['required', 'date'],
            'delivered_at' => ['nullable', 'date'],
            'sale_amount_original' => ['required', 'numeric', 'min:0.01'],
            'sale_currency' => ['required', Rule::enum(CurrencyCode::class)],
            'sale_exchange_rate_to_usd' => ['required', 'numeric', 'min:0.00000001'],
            'cost_usd' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'cancel_reason' => ['nullable', 'string', 'required_if:status,'.SubscriptionStatus::Cancelled->value],
            'refund_reason' => ['nullable', 'string', 'required_if:status,'.SubscriptionStatus::Refunded->value],
            'notes' => ['nullable', 'string'],
            'return_to_customer' => ['nullable', 'boolean'],
        ];
    }
}
