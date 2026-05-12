<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CurrencyCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CapitalBatchRequest;
use App\Models\CapitalBatch;
use App\Services\ExchangeRateSnapshotService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CapitalBatchController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
        ];

        $capitalBatches = CapitalBatch::query()
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(COALESCE(reference_currency, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(notes, \'\')) LIKE ?', [$search]);
                });
            })
            ->orderByDesc('funding_date')
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (CapitalBatch $capitalBatch) => $this->capitalBatchData($capitalBatch));

        return Inertia::render('admin/capital-batches/index', [
            'capitalBatches' => $capitalBatches,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/capital-batches/create', [
            'currencies' => $this->currencyOptions(),
        ]);
    }

    public function store(CapitalBatchRequest $request, ExchangeRateSnapshotService $exchangeRateSnapshotService): RedirectResponse
    {
        $validated = $request->validated();
        $validated['remaining_usd'] ??= $validated['usd_amount'];

        $capitalBatch = CapitalBatch::query()->create($validated);
        $exchangeRateSnapshotService->syncForCapitalBatch($capitalBatch);

        return redirect()
            ->route('capital-batches.index')
            ->with('success', 'Capital batch created successfully.');
    }

    public function edit(CapitalBatch $capitalBatch): Response
    {
        return Inertia::render('admin/capital-batches/edit', [
            'capitalBatch' => $this->capitalBatchData($capitalBatch),
            'currencies' => $this->currencyOptions(),
        ]);
    }

    public function update(CapitalBatchRequest $request, CapitalBatch $capitalBatch, ExchangeRateSnapshotService $exchangeRateSnapshotService): RedirectResponse
    {
        $validated = $request->validated();

        if (! array_key_exists('remaining_usd', $validated) || $validated['remaining_usd'] === null) {
            $validated['remaining_usd'] = $capitalBatch->remaining_usd ?? $validated['usd_amount'];
        }

        $capitalBatch->update($validated);
        $exchangeRateSnapshotService->syncForCapitalBatch($capitalBatch->fresh());

        return redirect()
            ->route('capital-batches.index')
            ->with('success', 'Capital batch updated successfully.');
    }

    public function destroy(CapitalBatch $capitalBatch): RedirectResponse
    {
        try {
            $capitalBatch->delete();
        } catch (QueryException) {
            return redirect()
                ->route('capital-batches.index')
                ->with('error', 'This capital batch cannot be deleted right now.');
        }

        return redirect()
            ->route('capital-batches.index')
            ->with('success', 'Capital batch deleted successfully.');
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
     * @return array<string, mixed>
     */
    private function capitalBatchData(CapitalBatch $capitalBatch): array
    {
        return array_filter([
            'id' => $capitalBatch->id,
            'usd_amount' => $capitalBatch->usd_amount,
            'funding_date' => $capitalBatch->funding_date?->toDateString(),
            'reference_currency' => $capitalBatch->reference_currency?->value ?? $capitalBatch->reference_currency,
            'reference_exchange_rate_to_usd' => $capitalBatch->reference_exchange_rate_to_usd,
            'reference_original_amount' => $capitalBatch->reference_original_amount,
            'remaining_usd' => $capitalBatch->remaining_usd,
            'notes' => $capitalBatch->notes,
            'created_at' => $capitalBatch->created_at?->toDateTimeString(),
            'updated_at' => $capitalBatch->updated_at?->toDateTimeString(),
        ], static fn ($value) => $value !== null);
    }
}
