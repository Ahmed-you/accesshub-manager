import LatestRateControl from '@/components/admin/latest-rate-control';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/hooks/use-locale';
import { localizeDurationLabel } from '@/lib/translations';
import { type SelectOption, type ServiceOption, type SubscriptionOption } from '@/types';
import { Link } from '@inertiajs/react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

const NONE_SUBSCRIPTION = '__none__';

interface RevealSecretResponse {
    secret: string;
    revealed_at: string;
}

export interface SubscriptionFormData {
    customer_id: string;
    service_id: string;
    supplier_id: string;
    renewed_from_subscription_id: string;
    plan_name: string;
    account_identifier: string;
    account_secret: string;
    duration_value: string;
    duration_unit: string;
    sale_recorded_at: string;
    start_date: string;
    delivered_at: string;
    sale_amount_original: string;
    sale_currency: string;
    sale_exchange_rate_to_usd: string;
    cost_usd: string;
    status: string;
    cancel_reason: string;
    refund_reason: string;
    notes: string;
    return_to_customer: boolean;
}

interface SubscriptionFormProps {
    data: SubscriptionFormData;
    setData: <K extends keyof SubscriptionFormData>(key: K, value: SubscriptionFormData[K]) => void;
    errors: Partial<Record<keyof SubscriptionFormData, string>>;
    processing: boolean;
    customers: SelectOption[];
    services: ServiceOption[];
    suppliers: SelectOption[];
    currencies: SelectOption[];
    statuses: SelectOption[];
    durationUnits: SelectOption[];
    renewalSubscriptions: SubscriptionOption[];
    onSubmit: FormEventHandler;
    submitLabel: string;
    subscriptionId?: number;
    hasAccountSecret?: boolean;
}

export default function SubscriptionForm({
    data,
    setData,
    errors,
    processing,
    customers,
    services,
    suppliers,
    currencies,
    statuses,
    durationUnits,
    renewalSubscriptions,
    onSubmit,
    submitLabel,
    subscriptionId,
    hasAccountSecret = false,
}: SubscriptionFormProps) {
    const { t, locale } = useLocale();
    const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
    const [revealError, setRevealError] = useState<string | null>(null);
    const [isRevealing, setIsRevealing] = useState(false);
    const [isSecretVisible, setIsSecretVisible] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

    const selectedService = useMemo(() => services.find((service) => service.value === data.service_id) ?? null, [data.service_id, services]);

    const availableRenewals = useMemo(
        () => renewalSubscriptions.filter((subscription) => data.customer_id === '' || subscription.customer_id === data.customer_id),
        [data.customer_id, renewalSubscriptions],
    );

    useEffect(() => {
        if (
            data.renewed_from_subscription_id !== '' &&
            !availableRenewals.some((subscription) => subscription.value === data.renewed_from_subscription_id)
        ) {
            setData('renewed_from_subscription_id', '');
        }
    }, [availableRenewals, data.renewed_from_subscription_id, setData]);

    const estimatedEndDate = calculateEndDate(data.start_date, data.duration_value, data.duration_unit);
    const saleUsdPreview = calculateUsdPreview(data.sale_amount_original, data.sale_exchange_rate_to_usd);
    const profitUsdPreview = calculateProfitPreview(saleUsdPreview, data.cost_usd);

    const revealSecret = async () => {
        if (!subscriptionId || isRevealing) {
            return;
        }

        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

        if (csrfToken === '') {
            setRevealError(t('Could not reveal account secret.'));

            return;
        }

        setIsRevealing(true);
        setRevealError(null);
        setCopyState('idle');

        try {
            const response = await fetch(route('subscriptions.reveal-secret', subscriptionId), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { message?: string } | null;

                throw new Error(payload?.message ? t(payload.message) : t('Could not reveal account secret.'));
            }

            const payload = (await response.json()) as RevealSecretResponse;

            setRevealedSecret(payload.secret);
            setIsSecretVisible(true);
        } catch (error) {
            setRevealError(error instanceof Error ? error.message : t('Could not reveal account secret.'));
        } finally {
            setIsRevealing(false);
        }
    };

    const copyRevealedSecret = async () => {
        if (!revealedSecret) {
            return;
        }

        await navigator.clipboard.writeText(revealedSecret);
        setCopyState('copied');
        window.setTimeout(() => setCopyState('idle'), 2000);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                        <div className="grid gap-6 lg:grid-cols-2">
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
                                <Label htmlFor="service_id">{t('Service')}</Label>
                                <SearchableSelect
                                    id="service_id"
                                    value={data.service_id}
                                    options={services}
                                    onValueChange={(value) => {
                                        setData('service_id', value);
                                        const service = services.find((item) => item.value === value);

                                        if (
                                            service &&
                                            data.duration_value === '' &&
                                            service.default_duration_value &&
                                            service.default_duration_unit
                                        ) {
                                            setData('duration_value', String(service.default_duration_value));
                                            setData('duration_unit', service.default_duration_unit);
                                        }
                                    }}
                                    placeholder={t('Select a service')}
                                    searchPlaceholder={t('Search services')}
                                    emptyText={t('No matching services')}
                                />
                                <InputError message={errors.service_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="supplier_id">{t('Supplier')}</Label>
                                <SearchableSelect
                                    id="supplier_id"
                                    value={data.supplier_id}
                                    options={suppliers}
                                    onValueChange={(value) => setData('supplier_id', value)}
                                    placeholder={t('Select a supplier')}
                                    searchPlaceholder={t('Search suppliers')}
                                    emptyText={t('No matching suppliers')}
                                />
                                <InputError message={errors.supplier_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="renewed_from_subscription_id">{t('Renewed from')}</Label>
                                <SearchableSelect
                                    id="renewed_from_subscription_id"
                                    value={data.renewed_from_subscription_id === '' ? NONE_SUBSCRIPTION : data.renewed_from_subscription_id}
                                    options={[{ value: NONE_SUBSCRIPTION, label: t('None') }, ...availableRenewals]}
                                    onValueChange={(value) => setData('renewed_from_subscription_id', value === NONE_SUBSCRIPTION ? '' : value)}
                                    placeholder={t('Optional previous subscription')}
                                    searchPlaceholder={t('Search subscriptions')}
                                    emptyText={t('No matching subscriptions')}
                                />
                                <InputError message={errors.renewed_from_subscription_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="plan_name">{t('Plan name')}</Label>
                                <Input
                                    id="plan_name"
                                    value={data.plan_name}
                                    onChange={(event) => setData('plan_name', event.target.value)}
                                    placeholder={t('Premium, Family, Pro')}
                                />
                                <InputError message={errors.plan_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="account_identifier">{t('Account username or email')}</Label>
                                <Input
                                    id="account_identifier"
                                    value={data.account_identifier}
                                    onChange={(event) => setData('account_identifier', event.target.value)}
                                    placeholder={t('login@example.com')}
                                />
                                <InputError message={errors.account_identifier} />
                            </div>

                            <div className="grid gap-2 lg:col-span-2">
                                <Label htmlFor="account_secret">{t('Account secret')}</Label>
                                <Textarea
                                    id="account_secret"
                                    value={data.account_secret}
                                    onChange={(event) => setData('account_secret', event.target.value)}
                                    placeholder={t('Password or recovery details (encrypted and hidden by default)')}
                                />
                                <p className="text-muted-foreground text-sm">
                                    {t('Leave this blank on edit if the existing secret should stay unchanged.')}
                                </p>
                                {subscriptionId && hasAccountSecret ? (
                                    <div className="border-sidebar-border/70 bg-muted/30 space-y-3 rounded-lg border p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium">{t('Existing secret saved')}</div>
                                                <p className="text-muted-foreground text-xs">{t('Secret reveal is audited.')}</p>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={revealSecret} disabled={isRevealing}>
                                                <Eye className="size-4" aria-hidden="true" />
                                                {isRevealing ? t('Revealing...') : t('Reveal secret')}
                                            </Button>
                                        </div>

                                        {revealedSecret ? (
                                            <div className="space-y-2">
                                                <Label htmlFor="revealed_account_secret" className="text-xs">
                                                    {t('Secret revealed')}
                                                </Label>
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <Input
                                                        id="revealed_account_secret"
                                                        value={revealedSecret}
                                                        type={isSecretVisible ? 'text' : 'password'}
                                                        readOnly
                                                        className="font-mono"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setIsSecretVisible((visible) => !visible)}
                                                        >
                                                            {isSecretVisible ? (
                                                                <EyeOff className="size-4" aria-hidden="true" />
                                                            ) : (
                                                                <Eye className="size-4" aria-hidden="true" />
                                                            )}
                                                            {isSecretVisible ? t('Hide secret') : t('Show secret')}
                                                        </Button>
                                                        <Button type="button" variant="outline" size="sm" onClick={copyRevealedSecret}>
                                                            <Copy className="size-4" aria-hidden="true" />
                                                            {copyState === 'copied' ? t('Copied') : t('Copy secret')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        {revealError ? <p className="text-destructive text-sm">{revealError}</p> : null}
                                    </div>
                                ) : null}
                                <InputError message={errors.account_secret} />
                            </div>
                        </div>
                    </div>

                    <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-6">
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="duration_value">{t('Duration')}</Label>
                                <Input
                                    id="duration_value"
                                    type="number"
                                    min="1"
                                    value={data.duration_value}
                                    onChange={(event) => setData('duration_value', event.target.value)}
                                    placeholder="30"
                                />
                                <InputError message={errors.duration_value} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="duration_unit">{t('Duration unit')}</Label>
                                <Select value={data.duration_unit} onValueChange={(value) => setData('duration_unit', value)}>
                                    <SelectTrigger id="duration_unit">
                                        <SelectValue placeholder={t('Select duration unit')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {durationUnits.map((durationUnit) => (
                                            <SelectItem key={durationUnit.value} value={durationUnit.value}>
                                                {t(durationUnit.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.duration_unit} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="sale_recorded_at">{t('Sale recorded at')}</Label>
                                <Input
                                    id="sale_recorded_at"
                                    type="datetime-local"
                                    className="min-w-0"
                                    value={data.sale_recorded_at}
                                    onChange={(event) => setData('sale_recorded_at', event.target.value)}
                                />
                                <InputError message={errors.sale_recorded_at} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="start_date">{t('Start date')}</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    className="min-w-0"
                                    value={data.start_date}
                                    onChange={(event) => setData('start_date', event.target.value)}
                                />
                                <InputError message={errors.start_date} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="delivered_at">{t('Delivered at')}</Label>
                                <Input
                                    id="delivered_at"
                                    type="datetime-local"
                                    className="min-w-0"
                                    value={data.delivered_at}
                                    onChange={(event) => setData('delivered_at', event.target.value)}
                                />
                                <InputError message={errors.delivered_at} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="status">{t('Subscription status')}</Label>
                                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder={t('Select a status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {t(status.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="sale_amount_original">{t('Sale amount')}</Label>
                                <Input
                                    id="sale_amount_original"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={data.sale_amount_original}
                                    onChange={(event) => setData('sale_amount_original', event.target.value)}
                                    placeholder="99.99"
                                />
                                <InputError message={errors.sale_amount_original} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="sale_currency">{t('Sale currency')}</Label>
                                <Select
                                    value={data.sale_currency}
                                    onValueChange={(value) => {
                                        setData('sale_currency', value);
                                        setData('sale_exchange_rate_to_usd', value === 'USD' ? '1.00000000' : '');
                                    }}
                                >
                                    <SelectTrigger id="sale_currency">
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
                                <InputError message={errors.sale_currency} />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="sale_exchange_rate_to_usd">{t('Rate to USD')}</Label>
                                <Input
                                    id="sale_exchange_rate_to_usd"
                                    type="number"
                                    min="0.00000001"
                                    step="0.00000001"
                                    value={data.sale_exchange_rate_to_usd}
                                    onChange={(event) => setData('sale_exchange_rate_to_usd', event.target.value)}
                                    placeholder="0.27000000"
                                />
                                <LatestRateControl
                                    fromCurrency={data.sale_currency}
                                    onRateFetched={(rate) => setData('sale_exchange_rate_to_usd', rate)}
                                    autoFetch={data.sale_exchange_rate_to_usd === ''}
                                />
                                <InputError message={errors.sale_exchange_rate_to_usd} />
                            </div>

                            <div className="grid min-w-0 content-start gap-2">
                                <Label htmlFor="cost_usd">{t('Cost in USD')}</Label>
                                <Input
                                    id="cost_usd"
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={data.cost_usd}
                                    onChange={(event) => setData('cost_usd', event.target.value)}
                                    placeholder="25.0000"
                                />
                                <InputError message={errors.cost_usd} />
                            </div>
                        </div>

                        {data.status === 'cancelled' ? (
                            <div className="grid gap-2">
                                <Label htmlFor="cancel_reason">{t('Cancel reason')}</Label>
                                <Textarea
                                    id="cancel_reason"
                                    value={data.cancel_reason}
                                    onChange={(event) => setData('cancel_reason', event.target.value)}
                                    placeholder={t('Why this subscription was cancelled')}
                                />
                                <InputError message={errors.cancel_reason} />
                            </div>
                        ) : null}

                        {data.status === 'refunded' ? (
                            <div className="grid gap-2">
                                <Label htmlFor="refund_reason">{t('Refund reason')}</Label>
                                <Textarea
                                    id="refund_reason"
                                    value={data.refund_reason}
                                    onChange={(event) => setData('refund_reason', event.target.value)}
                                    placeholder={t('Why this subscription was refunded')}
                                />
                                <InputError message={errors.refund_reason} />
                            </div>
                        ) : null}

                        <div className="grid gap-2">
                            <Label htmlFor="notes">{t('Notes')}</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                                placeholder={t('Anything the admin team should know about this subscription')}
                            />
                            <InputError message={errors.notes} />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-5">
                        <div className="flex items-start gap-3">
                            {selectedService?.image_url ? (
                                <img
                                    src={selectedService.image_url}
                                    alt={selectedService.label}
                                    className="h-16 w-16 rounded-full border object-cover"
                                />
                            ) : null}
                            <div className="space-y-2">
                                <div className="font-medium">{selectedService?.label ?? t('Select a service')}</div>
                                {selectedService?.default_duration_value && selectedService.default_duration_unit ? (
                                    <Badge variant="outline">
                                        {localizeDurationLabel(
                                            locale,
                                            `${selectedService.default_duration_value} ${selectedService.default_duration_unit}${selectedService.default_duration_value === 1 ? '' : 's'}`,
                                        )}
                                    </Badge>
                                ) : (
                                    <div className="text-muted-foreground text-sm">{t('No default duration set on this service')}</div>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <SummaryStat label={t('Estimated end date')} value={estimatedEndDate || t('Waiting for start date')} />
                            <SummaryStat label={t('Sale in USD')} value={saleUsdPreview} />
                            <SummaryStat label={t('Profit in USD')} value={profitUsdPreview} />
                            <SummaryStat label={t('Return to customer')} value={data.return_to_customer ? t('Yes') : t('No')} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button type="button" variant="outline" asChild>
                            <Link
                                href={
                                    data.return_to_customer && data.customer_id
                                        ? route('customers.show', data.customer_id)
                                        : route('subscriptions.index')
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

function calculateProfitPreview(saleUsd: string, costUsd: string): string {
    const saleValue = Number(saleUsd);
    const costValue = Number(costUsd);

    if (Number.isNaN(saleValue) || Number.isNaN(costValue)) {
        return '-';
    }

    return (saleValue - costValue).toFixed(4);
}

function calculateEndDate(startDate: string, durationValue: string, durationUnit: string): string {
    if (startDate === '' || durationValue === '' || durationUnit === '') {
        return '';
    }

    const value = Number(durationValue);

    if (!Number.isFinite(value) || value <= 0) {
        return '';
    }

    const date = new Date(`${startDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    if (durationUnit === 'day') {
        date.setDate(date.getDate() + value);
    } else if (durationUnit === 'month') {
        date.setMonth(date.getMonth() + value);
    } else if (durationUnit === 'year') {
        date.setFullYear(date.getFullYear() + value);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
