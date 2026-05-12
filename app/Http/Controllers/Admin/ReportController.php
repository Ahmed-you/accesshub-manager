<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        [$from, $to] = $this->dateRange($request);

        $subscriptions = Subscription::query()
            ->with(['customer', 'service'])
            ->withSum('payments', 'amount_usd')
            ->whereBetween('sale_recorded_at', [$from->toDateTimeString(), $to->toDateTimeString()])
            ->latest('sale_recorded_at')
            ->get();

        $payments = Payment::query()
            ->with(['customer', 'subscription.service'])
            ->whereBetween('paid_at', [$from->toDateTimeString(), $to->toDateTimeString()])
            ->latest('paid_at')
            ->get();

        $revenueUsd = $subscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->sale_amount_usd);
        $costUsd = $subscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->cost_usd);
        $profitUsd = $subscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->profit_usd);
        $paymentsUsd = $payments->sum(fn (Payment $payment): float => (float) $payment->amount_usd);
        $outstandingUsd = $subscriptions->sum(fn (Subscription $subscription): float => max(
            0,
            (float) $subscription->sale_amount_usd - (float) ($subscription->payments_sum_amount_usd ?? 0),
        ));

        return Inertia::render('admin/reports/index', [
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'summary' => [
                'revenue_usd' => $this->money($revenueUsd),
                'cost_usd' => $this->money($costUsd),
                'profit_usd' => $this->money($profitUsd),
                'payments_received_usd' => $this->money($paymentsUsd),
                'outstanding_usd' => $this->money($outstandingUsd),
                'subscriptions_count' => (string) $subscriptions->count(),
                'payments_count' => (string) $payments->count(),
                'margin_percent' => $this->percent($revenueUsd, $profitUsd),
            ],
            'serviceBreakdown' => $this->serviceBreakdown($subscriptions),
            'customerBreakdown' => $this->customerBreakdown($subscriptions),
            'paymentCurrencies' => $this->paymentCurrencies($payments),
            'outstandingSubscriptions' => $this->outstandingSubscriptions($subscriptions),
        ]);
    }

    /**
     * @return array{CarbonImmutable, CarbonImmutable}
     */
    private function dateRange(Request $request): array
    {
        $defaultTo = CarbonImmutable::today()->endOfDay();
        $defaultFrom = $defaultTo->startOfMonth()->startOfDay();

        $from = $this->parseDate((string) $request->string('from'), $defaultFrom)->startOfDay();
        $to = $this->parseDate((string) $request->string('to'), $defaultTo)->endOfDay();

        if ($from->greaterThan($to)) {
            return [$to->startOfDay(), $from->endOfDay()];
        }

        return [$from, $to];
    }

    private function parseDate(string $value, CarbonImmutable $fallback): CarbonImmutable
    {
        if (trim($value) === '') {
            return $fallback;
        }

        try {
            return CarbonImmutable::parse($value);
        } catch (Throwable) {
            return $fallback;
        }
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function serviceBreakdown($subscriptions): array
    {
        return $subscriptions
            ->groupBy('service_id')
            ->map(function ($serviceSubscriptions): array {
                $revenueUsd = $serviceSubscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->sale_amount_usd);
                $costUsd = $serviceSubscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->cost_usd);
                $profitUsd = $serviceSubscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->profit_usd);
                $firstSubscription = $serviceSubscriptions->first();

                return [
                    'name' => $firstSubscription?->service?->name ?? 'Unknown service',
                    'subscriptions_count' => (string) $serviceSubscriptions->count(),
                    'revenue_usd' => $this->money($revenueUsd),
                    'cost_usd' => $this->money($costUsd),
                    'profit_usd' => $this->money($profitUsd),
                    'margin_percent' => $this->percent($revenueUsd, $profitUsd),
                ];
            })
            ->sortByDesc(fn (array $row): float => (float) $row['profit_usd'])
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function customerBreakdown($subscriptions): array
    {
        return $subscriptions
            ->groupBy('customer_id')
            ->map(function ($customerSubscriptions): array {
                $revenueUsd = $customerSubscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->sale_amount_usd);
                $paidUsd = $customerSubscriptions->sum(fn (Subscription $subscription): float => (float) ($subscription->payments_sum_amount_usd ?? 0));
                $profitUsd = $customerSubscriptions->sum(fn (Subscription $subscription): float => (float) $subscription->profit_usd);
                $firstSubscription = $customerSubscriptions->first();

                return [
                    'id' => (string) ($firstSubscription?->customer_id ?? ''),
                    'name' => $firstSubscription?->customer?->name ?? 'Unknown customer',
                    'subscriptions_count' => (string) $customerSubscriptions->count(),
                    'revenue_usd' => $this->money($revenueUsd),
                    'paid_usd' => $this->money($paidUsd),
                    'outstanding_usd' => $this->money(max(0, $revenueUsd - $paidUsd)),
                    'profit_usd' => $this->money($profitUsd),
                ];
            })
            ->sortByDesc(fn (array $row): float => (float) $row['profit_usd'])
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function paymentCurrencies($payments): array
    {
        return $payments
            ->groupBy(fn (Payment $payment): string => $payment->currency?->value ?? (string) $payment->currency)
            ->map(fn ($currencyPayments, string $currency): array => [
                'currency' => $currency,
                'payments_count' => (string) $currencyPayments->count(),
                'original_amount' => number_format($currencyPayments->sum(fn (Payment $payment): float => (float) $payment->amount_original), 2, '.', ''),
                'amount_usd' => $this->money($currencyPayments->sum(fn (Payment $payment): float => (float) $payment->amount_usd)),
            ])
            ->sortKeys()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function outstandingSubscriptions($subscriptions): array
    {
        return $subscriptions
            ->map(function (Subscription $subscription): array {
                $paidUsd = (float) ($subscription->payments_sum_amount_usd ?? 0);
                $saleUsd = (float) $subscription->sale_amount_usd;

                return [
                    'id' => (string) $subscription->id,
                    'customer_id' => (string) $subscription->customer_id,
                    'internal_order_number' => $subscription->internal_order_number,
                    'customer_name' => $subscription->customer?->name ?? 'Unknown customer',
                    'service_name' => $subscription->service?->name ?? 'Unknown service',
                    'sale_amount_usd' => $this->money($saleUsd),
                    'paid_usd' => $this->money($paidUsd),
                    'outstanding_usd' => $this->money(max(0, $saleUsd - $paidUsd)),
                ];
            })
            ->filter(fn (array $row): bool => (float) $row['outstanding_usd'] > 0)
            ->sortByDesc(fn (array $row): float => (float) $row['outstanding_usd'])
            ->take(10)
            ->values()
            ->all();
    }

    private function money(float $value): string
    {
        return number_format($value, 4, '.', '');
    }

    private function percent(float $revenueUsd, float $profitUsd): string
    {
        if ($revenueUsd <= 0) {
            return '0.0';
        }

        return number_format(($profitUsd / $revenueUsd) * 100, 1, '.', '');
    }
}
