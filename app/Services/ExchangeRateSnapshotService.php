<?php

namespace App\Services;

use App\Enums\CurrencyCode;
use App\Models\CapitalBatch;
use App\Models\ExchangeRateSnapshot;
use App\Models\Subscription;
use Carbon\CarbonImmutable;

class ExchangeRateSnapshotService
{
    public function syncForSubscriptionSale(Subscription $subscription): void
    {
        $subscription->exchangeRateSnapshots()->delete();

        $subscription->exchangeRateSnapshots()->create([
            'from_currency' => $subscription->sale_currency ?? CurrencyCode::USD,
            'to_currency' => CurrencyCode::USD,
            'rate' => $subscription->sale_exchange_rate_to_usd,
            'captured_at' => $subscription->sale_recorded_at ?? now(),
            'provider' => 'manual_admin_entry',
            'notes' => 'Subscription sale exchange-rate snapshot',
        ]);
    }

    public function syncForCapitalBatch(CapitalBatch $capitalBatch): void
    {
        $capitalBatch->exchangeRateSnapshots()->delete();

        if (blank($capitalBatch->reference_exchange_rate_to_usd)) {
            return;
        }

        $capitalBatch->exchangeRateSnapshots()->create([
            'from_currency' => $capitalBatch->reference_currency ?? CurrencyCode::ILS,
            'to_currency' => CurrencyCode::USD,
            'rate' => $capitalBatch->reference_exchange_rate_to_usd,
            'captured_at' => $capitalBatch->funding_date
                ? CarbonImmutable::parse($capitalBatch->funding_date)->startOfDay()
                : now(),
            'provider' => 'manual_admin_entry',
            'notes' => 'Capital batch reference exchange-rate snapshot',
        ]);
    }

    /**
     * @return array{subscriptions: int, capital_batches: int, total: int}
     */
    public function syncMissingSnapshots(): array
    {
        $subscriptions = 0;
        $capitalBatches = 0;

        Subscription::query()
            ->whereDoesntHave('exchangeRateSnapshots')
            ->orderBy('id')
            ->chunkById(100, function ($records) use (&$subscriptions): void {
                foreach ($records as $subscription) {
                    $this->syncForSubscriptionSale($subscription);
                    $subscriptions++;
                }
            });

        CapitalBatch::query()
            ->whereNotNull('reference_exchange_rate_to_usd')
            ->whereDoesntHave('exchangeRateSnapshots')
            ->orderBy('id')
            ->chunkById(100, function ($records) use (&$capitalBatches): void {
                foreach ($records as $capitalBatch) {
                    $this->syncForCapitalBatch($capitalBatch);
                    $capitalBatches++;
                }
            });

        return [
            'subscriptions' => $subscriptions,
            'capital_batches' => $capitalBatches,
            'total' => $subscriptions + $capitalBatches,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createManualSnapshot(array $validated): ExchangeRateSnapshot
    {
        return ExchangeRateSnapshot::query()->create([
            'source_type' => null,
            'source_id' => null,
            'from_currency' => $validated['from_currency'],
            'to_currency' => $validated['to_currency'],
            'rate' => $validated['rate'],
            'captured_at' => $validated['captured_at'],
            'provider' => $validated['provider'] ?: 'manual_admin_entry',
            'notes' => $validated['notes'] ?? null,
        ]);
    }
}
