<?php

namespace App\Http\Requests\Admin;

use App\Enums\CurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'preferred_currency' => ['required', Rule::enum(CurrencyCode::class)],
            'telegram_username' => ['nullable', 'string', 'max:255'],
            'telegram_chat_id' => ['nullable', 'string', 'max:255'],
            'telegram_notifications_enabled' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
