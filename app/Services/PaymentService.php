<?php

namespace App\Services;

use App\Enums\CurrencyCode;
use App\Models\Payment;
use Carbon\CarbonImmutable;

class PaymentService
{
    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function prepareForPersistence(array $validated): array
    {
        $paidAt = CarbonImmutable::parse((string) $validated['paid_at']);
        $amountUsd = round(((float) $validated['amount_original']) * ((float) $validated['exchange_rate_to_usd']), 4);

        return array_merge($validated, [
            'customer_id' => (int) $validated['customer_id'],
            'subscription_id' => (int) $validated['subscription_id'],
            'paid_at' => $paidAt->toDateTimeString(),
            'amount_usd' => number_format($amountUsd, 4, '.', ''),
        ]);
    }

    public function syncExchangeRateSnapshot(Payment $payment): void
    {
        $payment->exchangeRateSnapshots()->delete();

        $payment->exchangeRateSnapshots()->create([
            'from_currency' => $payment->currency ?? CurrencyCode::USD,
            'to_currency' => CurrencyCode::USD,
            'rate' => $payment->exchange_rate_to_usd,
            'captured_at' => $payment->paid_at ?? now(),
            'provider' => 'manual_admin_entry',
            'notes' => 'Payment exchange-rate snapshot',
        ]);
    }
}
