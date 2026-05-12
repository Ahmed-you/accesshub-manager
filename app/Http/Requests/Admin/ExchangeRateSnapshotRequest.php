<?php

namespace App\Http\Requests\Admin;

use App\Enums\CurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExchangeRateSnapshotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'to_currency' => $this->input('to_currency', CurrencyCode::USD->value),
            'captured_at' => $this->input('captured_at') ?: now()->format('Y-m-d H:i:s'),
            'rate' => $this->input('from_currency') === CurrencyCode::USD->value && blank($this->input('rate'))
                ? '1'
                : $this->input('rate'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from_currency' => ['required', Rule::enum(CurrencyCode::class)],
            'to_currency' => ['required', Rule::enum(CurrencyCode::class)],
            'rate' => ['required', 'numeric', 'min:0.00000001'],
            'captured_at' => ['required', 'date'],
            'provider' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
