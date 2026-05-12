<?php

namespace App\Services;

use App\Enums\SubscriptionDurationUnit;
use App\Models\Subscription;
use Carbon\CarbonImmutable;

class SubscriptionService
{
    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function prepareForPersistence(array $validated): array
    {
        $durationUnit = $validated['duration_unit'] instanceof SubscriptionDurationUnit
            ? $validated['duration_unit']
            : SubscriptionDurationUnit::from((string) $validated['duration_unit']);

        $startDate = CarbonImmutable::parse((string) $validated['start_date'])->startOfDay();
        $endDate = $this->calculateEndDate($startDate, (int) $validated['duration_value'], $durationUnit);
        $saleRecordedAt = CarbonImmutable::parse((string) $validated['sale_recorded_at']);
        $deliveredAt = filled($validated['delivered_at'] ?? null)
            ? CarbonImmutable::parse((string) $validated['delivered_at'])
            : null;

        $saleAmountUsd = round(((float) $validated['sale_amount_original']) * ((float) $validated['sale_exchange_rate_to_usd']), 4);
        $costUsd = round((float) $validated['cost_usd'], 4);
        $profitUsd = round($saleAmountUsd - $costUsd, 4);

        return array_merge($validated, [
            'duration_value' => (int) $validated['duration_value'],
            'duration_unit' => $durationUnit->value,
            'duration_days' => $this->calculateDurationDays($startDate, $endDate),
            'sale_recorded_at' => $saleRecordedAt->toDateTimeString(),
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'delivered_at' => $deliveredAt?->toDateTimeString(),
            'sale_amount_usd' => number_format($saleAmountUsd, 4, '.', ''),
            'cost_usd' => number_format($costUsd, 4, '.', ''),
            'profit_usd' => number_format($profitUsd, 4, '.', ''),
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function prepareServiceDefaults(array $validated): array
    {
        if (blank($validated['default_duration_value'] ?? null) || blank($validated['default_duration_unit'] ?? null)) {
            $validated['default_duration_value'] = null;
            $validated['default_duration_unit'] = null;
            $validated['default_duration_days'] = null;

            return $validated;
        }

        $durationUnit = $validated['default_duration_unit'] instanceof SubscriptionDurationUnit
            ? $validated['default_duration_unit']
            : SubscriptionDurationUnit::from((string) $validated['default_duration_unit']);

        $defaultDurationValue = (int) $validated['default_duration_value'];
        $serviceStartDate = CarbonImmutable::parse('2026-01-01');
        $serviceEndDate = $this->calculateEndDate($serviceStartDate, $defaultDurationValue, $durationUnit);

        $validated['default_duration_value'] = $defaultDurationValue;
        $validated['default_duration_unit'] = $durationUnit->value;
        $validated['default_duration_days'] = $this->calculateDurationDays($serviceStartDate, $serviceEndDate);

        return $validated;
    }

    public function calculateEndDate(CarbonImmutable $startDate, int $durationValue, SubscriptionDurationUnit $durationUnit): CarbonImmutable
    {
        return match ($durationUnit) {
            SubscriptionDurationUnit::Day => $startDate->addDays($durationValue),
            SubscriptionDurationUnit::Month => $startDate->addMonthsNoOverflow($durationValue),
            SubscriptionDurationUnit::Year => $startDate->addYearsNoOverflow($durationValue),
        };
    }

    public function calculateDurationDays(CarbonImmutable $startDate, CarbonImmutable $endDate): int
    {
        return max(1, $startDate->diffInDays($endDate));
    }

    /**
     * @return array{days_remaining: int, countdown_status: string, countdown_label: string}
     */
    public function countdown(CarbonImmutable $endDate): array
    {
        $today = CarbonImmutable::today();
        $daysRemaining = $today->diffInDays($endDate->startOfDay(), false);

        if ($daysRemaining < 0) {
            return [
                'days_remaining' => $daysRemaining,
                'countdown_status' => 'expired',
                'countdown_label' => $this->pluralize(abs($daysRemaining), 'day').' overdue',
            ];
        }

        if ($daysRemaining === 0) {
            return [
                'days_remaining' => 0,
                'countdown_status' => 'expiring_today',
                'countdown_label' => 'Ends today',
            ];
        }

        $interval = $today->diff($endDate->startOfDay());
        $monthsRemaining = ($interval->y * 12) + $interval->m;
        $parts = [];

        if ($monthsRemaining > 0) {
            $parts[] = $this->pluralize($monthsRemaining, 'month');
        }

        if ($interval->d > 0 && count($parts) < 2) {
            $parts[] = $this->pluralize($interval->d, 'day');
        }

        if ($parts === []) {
            $parts[] = $this->pluralize($daysRemaining, 'day');
        }

        return [
            'days_remaining' => $daysRemaining,
            'countdown_status' => $daysRemaining <= 7 ? 'expiring_soon' : 'active',
            'countdown_label' => implode(', ', $parts).' left',
        ];
    }

    public function durationLabel(int $durationValue, SubscriptionDurationUnit $durationUnit): string
    {
        return $this->pluralize($durationValue, $durationUnit->value);
    }

    public function generateInternalOrderNumber(): string
    {
        $prefix = 'AH-'.now()->format('Ymd');
        $sequence = Subscription::withTrashed()
            ->where('internal_order_number', 'like', $prefix.'-%')
            ->count() + 1;

        do {
            $candidate = sprintf('%s-%04d', $prefix, $sequence);
            $sequence++;
        } while (
            Subscription::withTrashed()
                ->where('internal_order_number', $candidate)
                ->exists()
        );

        return $candidate;
    }

    private function pluralize(int $value, string $unit): string
    {
        return sprintf('%d %s%s', $value, $unit, $value === 1 ? '' : 's');
    }
}
