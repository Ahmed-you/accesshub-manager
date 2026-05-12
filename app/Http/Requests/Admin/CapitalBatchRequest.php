<?php

namespace App\Http\Requests\Admin;

use App\Enums\CurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CapitalBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'usd_amount' => ['required', 'numeric', 'gt:0'],
            'funding_date' => ['required', 'date'],
            'reference_currency' => ['required', Rule::enum(CurrencyCode::class)],
            'reference_exchange_rate_to_usd' => ['nullable', 'numeric', 'gt:0'],
            'reference_original_amount' => ['nullable', 'numeric', 'gte:0', 'required_with:reference_exchange_rate_to_usd'],
            'remaining_usd' => ['nullable', 'numeric', 'gte:0', 'lte:usd_amount'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
