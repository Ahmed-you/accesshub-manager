import InputError from '@/components/input-error';
import LatestRateControl from '@/components/admin/latest-rate-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/hooks/use-locale';
import { type SelectOption } from '@/types';
import { Link } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

export interface ExchangeRateSnapshotFormData {
    from_currency: string;
    to_currency: string;
    rate: string;
    captured_at: string;
    provider: string;
    notes: string;
}

interface ExchangeRateSnapshotFormProps {
    data: ExchangeRateSnapshotFormData;
    setData: <K extends keyof ExchangeRateSnapshotFormData>(key: K, value: ExchangeRateSnapshotFormData[K]) => void;
    errors: Partial<Record<keyof ExchangeRateSnapshotFormData, string>>;
    processing: boolean;
    currencies: SelectOption[];
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export default function ExchangeRateSnapshotForm({
    data,
    setData,
    errors,
    processing,
    currencies,
    onSubmit,
    submitLabel,
}: ExchangeRateSnapshotFormProps) {
    const { t } = useLocale();

    const preview = useMemo(() => {
        const rate = Number(data.rate);

        if (Number.isNaN(rate) || rate <= 0) {
            return '-';
        }

        return `100 ${data.from_currency} = ${(100 * rate).toFixed(4)} ${data.to_currency}`;
    }, [data.from_currency, data.rate, data.to_currency]);

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="from_currency">{t('From currency')}</Label>
                            <Select
                                value={data.from_currency}
                                onValueChange={(value) => {
                                    setData('from_currency', value);
                                    setData('rate', value === data.to_currency ? '1.00000000' : '');
                                }}
                            >
                                <SelectTrigger id="from_currency">
                                    <SelectValue placeholder={t('Select a currency')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map((currency) => (
                                        <SelectItem key={currency.value} value={currency.value}>
                                            {currency.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.from_currency} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="to_currency">{t('To currency')}</Label>
                            <Select
                                value={data.to_currency}
                                onValueChange={(value) => {
                                    setData('to_currency', value);
                                    setData('rate', value === data.from_currency ? '1.00000000' : '');
                                }}
                            >
                                <SelectTrigger id="to_currency">
                                    <SelectValue placeholder={t('Select a currency')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map((currency) => (
                                        <SelectItem key={currency.value} value={currency.value}>
                                            {currency.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.to_currency} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="rate">{t('Rate')}</Label>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                <Input
                                    id="rate"
                                    type="number"
                                    min="0.00000001"
                                    step="0.00000001"
                                    value={data.rate}
                                    onChange={(event) => setData('rate', event.target.value)}
                                    placeholder={t('1 unit of source currency = X USD')}
                                />
                                <LatestRateControl
                                    fromCurrency={data.from_currency}
                                    toCurrency={data.to_currency}
                                    onRateFetched={(rate, payload) => {
                                        setData('rate', rate);
                                        setData('provider', payload.provider);

                                        if (data.notes === '') {
                                            setData('notes', payload.attribution);
                                        }
                                    }}
                                    autoFetch={data.rate === ''}
                                />
                            </div>
                            <InputError message={errors.rate} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="captured_at">{t('Captured at')}</Label>
                            <Input
                                id="captured_at"
                                type="datetime-local"
                                value={data.captured_at}
                                onChange={(event) => setData('captured_at', event.target.value)}
                            />
                            <InputError message={errors.captured_at} />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="provider">{t('Provider')}</Label>
                            <Input
                                id="provider"
                                value={data.provider}
                                onChange={(event) => setData('provider', event.target.value)}
                                placeholder={t('manual_admin_entry')}
                            />
                            <InputError message={errors.provider} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t('Notes')}</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(event) => setData('notes', event.target.value)}
                            placeholder={t('Why this rate snapshot was saved')}
                        />
                        <InputError message={errors.notes} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-5">
                        <div>
                            <h2 className="font-medium">{t('Snapshot preview')}</h2>
                            <p className="text-muted-foreground mt-1 text-sm">{t('This rate is saved as historical data and should not be replaced by current market rates.')}</p>
                        </div>

                        <div className="rounded-lg border p-4">
                            <div className="text-muted-foreground text-xs">{t('Conversion direction')}</div>
                            <div className="mt-1 font-medium">{preview}</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('exchange-rate-snapshots.index')}>{t('Cancel')}</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t(submitLabel)}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
