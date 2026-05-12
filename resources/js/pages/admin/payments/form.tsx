import LatestRateControl from '@/components/admin/latest-rate-control';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/hooks/use-locale';
import { type PaymentSubscriptionOption, type SelectOption } from '@/types';
import { Link } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo } from 'react';

export interface PaymentFormData {
    subscription_id: string;
    customer_id: string;
    amount_original: string;
    currency: string;
    exchange_rate_to_usd: string;
    paid_at: string;
    method: string;
    reference: string;
    notes: string;
    return_to_customer: boolean;
}

const NONE_METHOD = '__none__';

interface PaymentFormProps {
    data: PaymentFormData;
    setData: <K extends keyof PaymentFormData>(key: K, value: PaymentFormData[K]) => void;
    errors: Partial<Record<keyof PaymentFormData, string>>;
    processing: boolean;
    customers: SelectOption[];
    subscriptions: PaymentSubscriptionOption[];
    currencies: SelectOption[];
    methods: SelectOption[];
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export default function PaymentForm({
    data,
    setData,
    errors,
    processing,
    customers,
    subscriptions,
    currencies,
    methods,
    onSubmit,
    submitLabel,
}: PaymentFormProps) {
    const { t } = useLocale();

    const availableSubscriptions = useMemo(
        () => subscriptions.filter((subscription) => data.customer_id === '' || subscription.customer_id === data.customer_id),
        [data.customer_id, subscriptions],
    );

    useEffect(() => {
        if (data.subscription_id !== '' && !availableSubscriptions.some((subscription) => subscription.value === data.subscription_id)) {
            setData('subscription_id', '');
        }
    }, [availableSubscriptions, data.subscription_id, setData]);

    const selectedSubscription = useMemo(
        () => subscriptions.find((subscription) => subscription.value === data.subscription_id) ?? null,
        [data.subscription_id, subscriptions],
    );

    const amountUsdPreview = calculateUsdPreview(data.amount_original, data.exchange_rate_to_usd);
    const remainingAfterPayment = calculateRemaining(
        selectedSubscription?.sale_amount_usd ?? null,
        selectedSubscription?.paid_total_usd ?? null,
        amountUsdPreview,
    );

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="customer_id">{t('Customer')}</Label>
                            <SearchableSelect
                                id="customer_id"
                                value={data.customer_id}
                                options={customers}
                                onValueChange={(value) => setData('customer_id', value)}
                                placeholder={t('Select a customer')}
                                searchPlaceholder={t('Search customers')}
                                emptyText={t('No matching customers')}
                            />
                            <InputError message={errors.customer_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="subscription_id">{t('Subscription')}</Label>
                            <SearchableSelect
                                id="subscription_id"
                                value={data.subscription_id}
                                options={availableSubscriptions}
                                onValueChange={(value) => {
                                    setData('subscription_id', value);
                                    const subscription = subscriptions.find((item) => item.value === value);

                                    if (subscription && data.customer_id === '') {
                                        setData('customer_id', subscription.customer_id);
                                    }
                                }}
                                placeholder={t('Select a subscription')}
                                searchPlaceholder={t('Search subscriptions')}
                                emptyText={t('No matching subscriptions')}
                            />
                            <InputError message={errors.subscription_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount_original">{t('Payment amount')}</Label>
                            <Input
                                id="amount_original"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.amount_original}
                                onChange={(event) => setData('amount_original', event.target.value)}
                                placeholder="50.00"
                            />
                            <InputError message={errors.amount_original} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="currency">{t('Payment currency')}</Label>
                            <Select
                                value={data.currency}
                                onValueChange={(value) => {
                                    setData('currency', value);
                                    setData('exchange_rate_to_usd', value === 'USD' ? '1.00000000' : '');
                                }}
                            >
                                <SelectTrigger id="currency">
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
                            <InputError message={errors.currency} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="exchange_rate_to_usd">{t('Rate to USD')}</Label>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                <Input
                                    id="exchange_rate_to_usd"
                                    type="number"
                                    min="0.00000001"
                                    step="0.00000001"
                                    value={data.exchange_rate_to_usd}
                                    onChange={(event) => setData('exchange_rate_to_usd', event.target.value)}
                                    placeholder="1.00000000"
                                />
                                <LatestRateControl
                                    fromCurrency={data.currency}
                                    onRateFetched={(rate) => setData('exchange_rate_to_usd', rate)}
                                    autoFetch={data.exchange_rate_to_usd === ''}
                                />
                            </div>
                            <InputError message={errors.exchange_rate_to_usd} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="paid_at">{t('Paid at')}</Label>
                            <Input
                                id="paid_at"
                                type="datetime-local"
                                value={data.paid_at}
                                onChange={(event) => setData('paid_at', event.target.value)}
                            />
                            <InputError message={errors.paid_at} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="method">{t('Payment method')}</Label>
                            <Select
                                value={data.method === '' ? NONE_METHOD : data.method}
                                onValueChange={(value) => setData('method', value === NONE_METHOD ? '' : value)}
                            >
                                <SelectTrigger id="method">
                                    <SelectValue placeholder={t('Optional payment method')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE_METHOD}>{t('None')}</SelectItem>
                                    {methods.map((method) => (
                                        <SelectItem key={method.value} value={method.value}>
                                            {t(method.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.method} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reference">{t('Reference')}</Label>
                            <Input
                                id="reference"
                                value={data.reference}
                                onChange={(event) => setData('reference', event.target.value)}
                                placeholder={t('Transfer ID, receipt number, or note')}
                            />
                            <InputError message={errors.reference} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t('Notes')}</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(event) => setData('notes', event.target.value)}
                            placeholder={t('Anything the admin team should know about this payment')}
                        />
                        <InputError message={errors.notes} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-5">
                        <div className="space-y-1">
                            <div className="font-medium">{selectedSubscription?.label ?? t('Select a subscription')}</div>
                            <div className="text-muted-foreground text-sm">{t('Snapshot preview for this payment')}</div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                            <SummaryStat label={t('Payment in USD')} value={amountUsdPreview} />
                            <SummaryStat label={t('Already paid in USD')} value={selectedSubscription?.paid_total_usd ?? '-'} />
                            <SummaryStat label={t('Subscription sale in USD')} value={selectedSubscription?.sale_amount_usd ?? '-'} />
                            <SummaryStat label={t('Remaining after this payment')} value={remainingAfterPayment} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button type="button" variant="outline" asChild>
                            <Link
                                href={
                                    data.return_to_customer && data.customer_id ? route('customers.show', data.customer_id) : route('payments.index')
                                }
                            >
                                {t('Cancel')}
                            </Link>
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

function SummaryStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 text-sm font-medium">{value}</div>
        </div>
    );
}

function calculateUsdPreview(amount: string, rate: string): string {
    const amountValue = Number(amount);
    const rateValue = Number(rate);

    if (Number.isNaN(amountValue) || Number.isNaN(rateValue) || amountValue <= 0 || rateValue <= 0) {
        return '-';
    }

    return (amountValue * rateValue).toFixed(4);
}

function calculateRemaining(saleAmountUsd: string | null, paidTotalUsd: string | null, currentPaymentUsd: string): string {
    const saleValue = Number(saleAmountUsd);
    const paidValue = Number(paidTotalUsd);
    const paymentValue = Number(currentPaymentUsd);

    if (Number.isNaN(saleValue) || Number.isNaN(paidValue) || Number.isNaN(paymentValue)) {
        return '-';
    }

    return (saleValue - (paidValue + paymentValue)).toFixed(4);
}
