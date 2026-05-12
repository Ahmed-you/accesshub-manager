import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface LatestRateResponse {
    from_currency: string;
    to_currency: string;
    rate: string;
    date: string;
    provider: string;
    source_url: string | null;
    attribution: string;
}

interface LatestRateControlProps {
    fromCurrency: string;
    toCurrency?: string;
    onRateFetched: (rate: string, payload: LatestRateResponse) => void;
    disabled?: boolean;
    autoFetch?: boolean;
}

export default function LatestRateControl({
    fromCurrency,
    toCurrency = 'USD',
    onRateFetched,
    disabled = false,
    autoFetch = false,
}: LatestRateControlProps) {
    const { t } = useLocale();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [autoFetchedPair, setAutoFetchedPair] = useState<string | null>(null);
    const pairKey = `${fromCurrency}:${toCurrency}`;

    const fetchRate = useCallback(async () => {
        if (fromCurrency === '' || loading) {
            return;
        }

        setLoading(true);
        setStatus(null);
        setError(null);

        const url = new URL(route('exchange-rates.latest'), window.location.origin);
        url.searchParams.set('from_currency', fromCurrency);
        url.searchParams.set('to_currency', toCurrency);

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { message?: string } | null;

                throw new Error(payload?.message ? t(payload.message) : t('Could not fetch latest exchange rate right now.'));
            }

            const payload = (await response.json()) as LatestRateResponse;

            onRateFetched(payload.rate, payload);
            setStatus(
                payload.source_url
                    ? t('Fetched from {provider} on {date}.', { provider: payload.provider, date: payload.date })
                    : t('No internet lookup needed for same-currency rate.'),
            );
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : t('Could not fetch latest exchange rate right now.'));
        } finally {
            setLoading(false);
        }
    }, [fromCurrency, loading, onRateFetched, t, toCurrency]);

    useEffect(() => {
        if (autoFetch && !loading && fromCurrency !== '' && autoFetchedPair !== pairKey) {
            setAutoFetchedPair(pairKey);
            void fetchRate();
        }
    }, [autoFetch, autoFetchedPair, fetchRate, fromCurrency, loading, pairKey]);

    return (
        <div className="space-y-1.5">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchRate}
                disabled={disabled || loading || fromCurrency === ''}
                className="h-9 w-full justify-center px-3 text-sm sm:w-auto"
            >
                <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
                {loading ? t('Fetching rate...') : t('Fetch latest rate')}
            </Button>
            {status ? <p className="text-muted-foreground text-xs">{status}</p> : null}
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>
    );
}
