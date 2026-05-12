<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CurrencyCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExchangeRateSnapshotRequest;
use App\Models\CapitalBatch;
use App\Models\ExchangeRateSnapshot;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\ExchangeRateSnapshotService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ExchangeRateSnapshotController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'from_currency' => (string) $request->string('from_currency'),
            'source_type' => (string) $request->string('source_type'),
        ];

        $snapshots = ExchangeRateSnapshot::query()
            ->with('source')
            ->when($filters['search'] !== '', function ($query) use ($filters): void {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->whereRaw('LOWER(COALESCE(provider, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(notes, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(from_currency, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(to_currency, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('CAST(source_id AS TEXT) LIKE ?', [$search]);
                });
            })
            ->when($filters['from_currency'] !== '', fn ($query) => $query->where('from_currency', $filters['from_currency']))
            ->when($filters['source_type'] === 'manual', fn ($query) => $query->whereNull('source_type'))
            ->when(
                $filters['source_type'] !== '' && $filters['source_type'] !== 'manual',
                fn ($query) => $query->where('source_type', $filters['source_type']),
            )
            ->latest('captured_at')
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ExchangeRateSnapshot $snapshot) => $this->snapshotData($snapshot));

        return Inertia::render('admin/exchange-rate-snapshots/index', [
            'snapshots' => $snapshots,
            'filters' => $filters,
            'currencies' => $this->currencyOptions(),
            'sourceTypes' => $this->sourceTypeOptions(),
            'summary' => [
                'total' => (string) ExchangeRateSnapshot::query()->count(),
                'manual' => (string) ExchangeRateSnapshot::query()->whereNull('source_type')->count(),
                'linked' => (string) ExchangeRateSnapshot::query()->whereNotNull('source_type')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/exchange-rate-snapshots/create', [
            'currencies' => $this->currencyOptions(),
            'defaults' => [
                'from_currency' => CurrencyCode::ILS->value,
                'to_currency' => CurrencyCode::USD->value,
                'captured_at' => now()->format('Y-m-d\TH:i'),
            ],
        ]);
    }

    public function store(ExchangeRateSnapshotRequest $request, ExchangeRateSnapshotService $exchangeRateSnapshotService): RedirectResponse
    {
        $exchangeRateSnapshotService->createManualSnapshot($request->validated());

        return redirect()
            ->route('exchange-rate-snapshots.index')
            ->with('success', 'Exchange-rate snapshot created successfully.');
    }

    public function syncMissing(ExchangeRateSnapshotService $exchangeRateSnapshotService): RedirectResponse
    {
        $exchangeRateSnapshotService->syncMissingSnapshots();

        return redirect()
            ->route('exchange-rate-snapshots.index')
            ->with('success', 'Missing exchange-rate snapshots synced successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshotData(ExchangeRateSnapshot $snapshot): array
    {
        return [
            'id' => $snapshot->id,
            'source_type' => $snapshot->source_type,
            'source_id' => $snapshot->source_id,
            'source_label' => $this->sourceLabel($snapshot),
            'source_url' => $this->sourceUrl($snapshot),
            'from_currency' => $snapshot->from_currency?->value ?? $snapshot->from_currency,
            'to_currency' => $snapshot->to_currency?->value ?? $snapshot->to_currency,
            'rate' => $snapshot->rate,
            'captured_at' => $snapshot->captured_at?->toDateTimeString(),
            'provider' => $snapshot->provider,
            'notes' => $snapshot->notes,
            'created_at' => $snapshot->created_at?->toDateTimeString(),
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function currencyOptions(): array
    {
        return array_map(
            fn (CurrencyCode $currency) => ['value' => $currency->value, 'label' => $currency->value],
            CurrencyCode::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function sourceTypeOptions(): array
    {
        $types = ExchangeRateSnapshot::query()
            ->select('source_type')
            ->whereNotNull('source_type')
            ->distinct()
            ->orderBy('source_type')
            ->pluck('source_type')
            ->map(fn (string $type): array => [
                'value' => $type,
                'label' => $this->sourceTypeLabel($type),
            ])
            ->values()
            ->all();

        array_unshift($types, ['value' => 'manual', 'label' => 'Manual snapshot']);

        return $types;
    }

    private function sourceLabel(ExchangeRateSnapshot $snapshot): string
    {
        $source = $snapshot->source;

        if (! $source) {
            return 'Manual snapshot';
        }

        if ($source instanceof Subscription) {
            return $source->internal_order_number;
        }

        if ($source instanceof Payment) {
            return 'Payment #'.$source->id;
        }

        if ($source instanceof CapitalBatch) {
            return 'Capital batch #'.$source->id;
        }

        return $this->sourceTypeLabel($snapshot->source_type).' #'.$snapshot->source_id;
    }

    private function sourceUrl(ExchangeRateSnapshot $snapshot): ?string
    {
        $source = $snapshot->source;

        if ($source instanceof Subscription) {
            return route('subscriptions.edit', $source->id, absolute: false);
        }

        if ($source instanceof Payment) {
            return route('payments.edit', $source->id, absolute: false);
        }

        if ($source instanceof CapitalBatch) {
            return route('capital-batches.edit', $source->id, absolute: false);
        }

        return null;
    }

    private function sourceTypeLabel(?string $type): string
    {
        if (! $type) {
            return 'Manual snapshot';
        }

        return Str::headline(class_basename($type));
    }
}
