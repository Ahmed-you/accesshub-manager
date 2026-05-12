<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CurrencyCode;
use App\Http\Controllers\Controller;
use App\Services\LatestExchangeRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class LatestExchangeRateController extends Controller
{
    public function __invoke(Request $request, LatestExchangeRateService $latestExchangeRateService): JsonResponse
    {
        $validated = $request->validate([
            'from_currency' => ['required', Rule::enum(CurrencyCode::class)],
            'to_currency' => ['nullable', Rule::enum(CurrencyCode::class)],
        ]);

        $fromCurrency = CurrencyCode::from($validated['from_currency']);
        $toCurrency = CurrencyCode::from($validated['to_currency'] ?? CurrencyCode::USD->value);

        try {
            return response()->json($latestExchangeRateService->latest($fromCurrency, $toCurrency));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Could not fetch latest exchange rate right now. Please enter the rate manually.',
            ], 503);
        }
    }
}
