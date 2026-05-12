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
import { FormEventHandler } from 'react';

export interface CapitalBatchFormData {
    usd_amount: string;
    funding_date: string;
    reference_currency: string;
    reference_exchange_rate_to_usd: string;
    reference_original_amount: string;
    remaining_usd: string;
    notes: string;
}

interface CapitalBatchFormProps {
    data: CapitalBatchFormData;
    setData: <K extends keyof CapitalBatchFormData>(key: K, value: CapitalBatchFormData[K]) => void;
    errors: Partial<Record<keyof CapitalBatchFormData, string>>;
    processing: boolean;
    currencies: SelectOption[];
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export default function CapitalBatchForm({ data, setData, errors, processing, currencies, onSubmit, submitLabel }: CapitalBatchFormProps) {
    const { t } = useLocale();

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <div className="grid gap-2">
                        <Label htmlFor="usd_amount">{t('USD amount')}</Label>
                        <Input
                            id="usd_amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={data.usd_amount}
                            onChange={(event) => setData('usd_amount', event.target.value)}
                            placeholder="1000.00"
                        />
                        <InputError message={errors.usd_amount} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="funding_date">{t('Funding date')}</Label>
                        <Input
                            id="funding_date"
                            type="date"
                            value={data.funding_date}
                            onChange={(event) => setData('funding_date', event.target.value)}
                        />
                        <InputError message={errors.funding_date} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="remaining_usd">{t('Remaining USD')}</Label>
                        <Input
                            id="remaining_usd"
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.remaining_usd}
                            onChange={(event) => setData('remaining_usd', event.target.value)}
                            placeholder={t('Leave blank to default to USD amount')}
                        />
                        <InputError message={errors.remaining_usd} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reference_currency">{t('Reference currency')}</Label>
                        <Select
                            value={data.reference_currency}
                            onValueChange={(value) => {
                                setData('reference_currency', value);
                                setData('reference_exchange_rate_to_usd', value === 'USD' ? '1.00000000' : '');
                            }}
                        >
                            <SelectTrigger id="reference_currency">
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
                        <InputError message={errors.reference_currency} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reference_exchange_rate_to_usd">{t('Reference rate to USD')}</Label>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                            <Input
                                id="reference_exchange_rate_to_usd"
                                type="number"
                                min="0.00000001"
                                step="0.00000001"
                                value={data.reference_exchange_rate_to_usd}
                                onChange={(event) => setData('reference_exchange_rate_to_usd', event.target.value)}
                                placeholder={t('1 unit of source currency = X USD')}
                            />
                            <LatestRateControl
                                fromCurrency={data.reference_currency}
                                onRateFetched={(rate) => setData('reference_exchange_rate_to_usd', rate)}
                                autoFetch={data.reference_exchange_rate_to_usd === ''}
                            />
                        </div>
                        <InputError message={errors.reference_exchange_rate_to_usd} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reference_original_amount">{t('Reference original amount')}</Label>
                        <Input
                            id="reference_original_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.reference_original_amount}
                            onChange={(event) => setData('reference_original_amount', event.target.value)}
                            placeholder={t('Optional source amount')}
                        />
                        <InputError message={errors.reference_original_amount} />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="notes">{t('Notes')}</Label>
                    <Textarea
                        id="notes"
                        value={data.notes}
                        onChange={(event) => setData('notes', event.target.value)}
                        placeholder={t('Funding source, transfer details, or bookkeeping notes')}
                    />
                    <InputError message={errors.notes} />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" variant="outline" asChild>
                    <Link href={route('capital-batches.index')}>{t('Cancel')}</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    {t(submitLabel)}
                </Button>
            </div>
        </form>
    );
}
