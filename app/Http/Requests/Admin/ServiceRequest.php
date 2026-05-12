<?php

namespace App\Http\Requests\Admin;

use App\Enums\SubscriptionDurationUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'active' => $this->boolean('active'),
            'remove_image' => $this->boolean('remove_image'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'default_duration_value' => ['nullable', 'integer', 'min:1', 'required_with:default_duration_unit'],
            'default_duration_unit' => ['nullable', Rule::enum(SubscriptionDurationUnit::class), 'required_with:default_duration_value'],
            'active' => ['required', 'boolean'],
            'image' => ['nullable', 'image', 'max:3072'],
            'remove_image' => ['nullable', 'boolean'],
        ];
    }
}
