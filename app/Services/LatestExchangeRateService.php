<?php

namespace App\Services;

use App\Enums\CurrencyCode;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class LatestExchangeRateService
{
    public function latest(CurrencyCode $fromCurrency, CurrencyCode $toCurrency = CurrencyCode::USD): array
    {
        if ($fromCurrency === $toCurrency) {
            return [
                'from_currency' => $fromCurrency->value,
                'to_currency' => $toCurrency->value,
                'rate' => '1.00000000',
                'date' => now()->toDateString(),
                'provider' => 'Same currency',
                'source_url' => null,
                'attribution' => 'No internet lookup needed because both currencies are the same.',
            ];
        }

        $sourceUrl = sprintf('https://api.frankfurter.dev/v2/rate/%s/%s', $fromCurrency->value, $toCurrency->value);
        $request = Http::acceptJson()
            ->timeout(10)
            ->retry(2, 250);

        $caBundlePath = $this->caBundlePath();

        if ($caBundlePath !== null) {
            $request = $request->withOptions([
                'verify' => $caBundlePath,
            ]);
        }

        $response = $request->get($sourceUrl);

        if ($response->failed()) {
            throw new RuntimeException('Could not fetch latest exchange rate from Frankfurter.');
        }

        $payload = $response->json();
        $rate = $payload['rate'] ?? null;

        if (! is_numeric($rate) || (float) $rate <= 0) {
            throw new RuntimeException('Frankfurter returned an invalid exchange-rate response.');
        }

        return [
            'from_currency' => $fromCurrency->value,
            'to_currency' => $toCurrency->value,
            'rate' => number_format((float) $rate, 8, '.', ''),
            'date' => (string) ($payload['date'] ?? now()->toDateString()),
            'provider' => 'Frankfurter',
            'source_url' => $sourceUrl,
            'attribution' => 'Fetched from Frankfurter public exchange-rate API.',
        ];
    }

    private function caBundlePath(): ?string
    {
        $paths = array_filter([
            config('services.exchange_rates.ca_bundle'),
            ini_get('curl.cainfo') ?: null,
            ini_get('openssl.cafile') ?: null,
            base_path('pgsql17/pgsql/pgAdmin 4/python/Lib/site-packages/certifi/cacert.pem'),
            'C:/Program Files/PostgreSQL/17/pgAdmin 4/python/Lib/site-packages/certifi/cacert.pem',
            'C:/xampp/apache/bin/curl-ca-bundle.crt',
        ]);

        foreach ($paths as $path) {
            if (is_string($path) && $path !== '' && is_file($path)) {
                return $path;
            }
        }

        return null;
    }
}
