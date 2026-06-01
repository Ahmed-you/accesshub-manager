import FlashMessage from '@/components/admin/flash-message';
import MobileRecordCard from '@/components/admin/mobile-record-card';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchableSelect from '@/components/ui/searchable-select';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { localizeCountdownLabel, localizeDurationLabel } from '@/lib/translations';
import { type BreadcrumbItem, type PaginatedData, type SelectOption, type Subscription } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Subscriptions', href: '/subscriptions' }];
const ALL_CUSTOMERS = '__all_customers__';

interface SubscriptionsIndexProps {
    subscriptions: PaginatedData<Subscription>;
    filters: {
        search: string;
        customer_id: string;
    };
    customers: SelectOption[];
}

export default function SubscriptionsIndex({ subscriptions, filters, customers }: SubscriptionsIndexProps) {
    const { t, locale } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const [customerId, setCustomerId] = useState(filters.customer_id ?? '');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('subscriptions.index'), { search, customer_id: customerId }, { preserveState: true, replace: true });
    };

    const destroySubscription = (subscription: Subscription) => {
        if (!window.confirm(t('Delete {name}?', { name: subscription.internal_order_number }))) {
            return;
        }

        router.delete(route('subscriptions.destroy', subscription.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Subscriptions')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('Subscriptions')}
                    description={t('Manage active and historical subscriptions, including renewals, sale snapshots, and payment status.')}
                    actions={
                        <Button asChild>
                            <Link href={route('subscriptions.create')}>{t('Add subscription')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_14rem_auto]">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by order, customer, service, plan, or login')}
                        />
                        <SearchableSelect
                            value={customerId === '' ? ALL_CUSTOMERS : customerId}
                            options={[{ value: ALL_CUSTOMERS, label: t('All customers') }, ...customers]}
                            onValueChange={(value) => setCustomerId(value === ALL_CUSTOMERS ? '' : value)}
                            placeholder={t('Filter by customer')}
                            searchPlaceholder={t('Search customers')}
                            emptyText={t('No matching customers')}
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('subscriptions.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="grid gap-3 lg:hidden">
                        {subscriptions.data.length === 0 ? (
                            <div className="text-muted-foreground border-sidebar-border/70 rounded-lg border p-6 text-center text-sm">
                                {t('No subscriptions yet. Add the first subscription to connect customers, services, and suppliers.')}
                            </div>
                        ) : (
                            subscriptions.data.map((subscription) => (
                                <MobileRecordCard
                                    key={subscription.id}
                                    title={subscription.internal_order_number}
                                    subtitle={
                                        <>
                                            <div>{subscription.customer_name}</div>
                                            <div>{subscription.plan_name}</div>
                                            <div>{subscription.account_identifier}</div>
                                        </>
                                    }
                                    imageUrl={subscription.service_image_url}
                                    imageAlt={subscription.service_name ?? 'Service'}
                                    badges={
                                        <>
                                            <Badge variant={countdownVariant(subscription.countdown_status)}>
                                                {localizeCountdownLabel(locale, subscription.countdown_label)}
                                            </Badge>
                                            <Badge variant={paymentVariant(subscription.payment_status)}>
                                                {t(subscription.payment_status_label)}
                                            </Badge>
                                            <Badge variant="outline">{t(subscription.status)}</Badge>
                                        </>
                                    }
                                    fields={[
                                        {
                                            label: t('Service'),
                                            value: (
                                                <>
                                                    <div>{subscription.service_name}</div>
                                                    <div className="text-muted-foreground">{subscription.supplier_name}</div>
                                                </>
                                            ),
                                        },
                                        {
                                            label: t('Duration'),
                                            value: (
                                                <>
                                                    <div>{localizeDurationLabel(locale, subscription.duration_label)}</div>
                                                    <div className="text-muted-foreground">
                                                        {subscription.start_date} - {subscription.end_date}
                                                    </div>
                                                </>
                                            ),
                                        },
                                        {
                                            label: t('Payment'),
                                            value: `${subscription.sale_amount_original} ${subscription.sale_currency} · ${subscription.sale_amount_usd} USD`,
                                        },
                                        {
                                            label: t('Profit'),
                                            value: `${subscription.profit_usd} USD · ${subscription.paid_total_usd} USD ${t('paid')}`,
                                        },
                                    ]}
                                    actions={
                                        <>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link
                                                    href={route('payments.create', {
                                                        customer: subscription.customer_id,
                                                        subscription: subscription.id,
                                                    })}
                                                >
                                                    {t('Payment')}
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('customers.show', subscription.customer_id)}>{t('Customer')}</Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('subscriptions.edit', subscription.id)}>{t('Edit')}</Link>
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => destroySubscription(subscription)}>
                                                {t('Delete')}
                                            </Button>
                                        </>
                                    }
                                />
                            ))
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Order')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Customer')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Service')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Duration')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Countdown')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Payment')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Profit')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No subscriptions yet. Add the first subscription to connect customers, services, and suppliers.')}
                                        </td>
                                    </tr>
                                ) : (
                                    subscriptions.data.map((subscription) => (
                                        <tr key={subscription.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{subscription.internal_order_number}</div>
                                                <div className="text-muted-foreground mt-1">{subscription.plan_name}</div>
                                                <div className="text-muted-foreground">{subscription.account_identifier}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{subscription.customer_name}</div>
                                                <div className="text-muted-foreground mt-1">{subscription.supplier_name}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex items-start gap-3">
                                                    {subscription.service_image_url ? (
                                                        <img
                                                            src={subscription.service_image_url}
                                                            alt={subscription.service_name ?? 'Service'}
                                                            className="h-10 w-10 rounded-md border object-cover"
                                                        />
                                                    ) : null}
                                                    <div>
                                                        <div className="font-medium">{subscription.service_name}</div>
                                                        {subscription.renewed_from_label ? (
                                                            <div className="text-muted-foreground mt-1 text-xs">
                                                                {subscription.renewed_from_label}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div>{localizeDurationLabel(locale, subscription.duration_label)}</div>
                                                <div className="text-muted-foreground mt-1">
                                                    {subscription.start_date} - {subscription.end_date}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex flex-col gap-2">
                                                    <Badge variant={countdownVariant(subscription.countdown_status)}>
                                                        {localizeCountdownLabel(locale, subscription.countdown_label)}
                                                    </Badge>
                                                    <Badge variant="outline">{t(subscription.status)}</Badge>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div>
                                                    {subscription.sale_amount_original} {subscription.sale_currency}
                                                </div>
                                                <div className="text-muted-foreground mt-1">{subscription.sale_amount_usd} USD</div>
                                                <Badge className="mt-2" variant={paymentVariant(subscription.payment_status)}>
                                                    {t(subscription.payment_status_label)}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{subscription.profit_usd} USD</div>
                                                <div className="text-muted-foreground mt-1">
                                                    {subscription.paid_total_usd} USD {t('paid')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link
                                                            href={route('payments.create', {
                                                                customer: subscription.customer_id,
                                                                subscription: subscription.id,
                                                            })}
                                                        >
                                                            {t('Payment')}
                                                        </Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('customers.show', subscription.customer_id)}>{t('Customer')}</Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('subscriptions.edit', subscription.id)}>{t('Edit')}</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => destroySubscription(subscription)}>
                                                        {t('Delete')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-sm">
                            {t('Showing {from}-{to} of {total} subscriptions', {
                                from: subscriptions.from ?? 0,
                                to: subscriptions.to ?? 0,
                                total: subscriptions.total,
                            })}
                        </p>
                        <Pagination links={subscriptions.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function countdownVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'expired') {
        return 'destructive';
    }

    if (status === 'expiring_soon' || status === 'expiring_today') {
        return 'secondary';
    }

    return 'outline';
}

function paymentVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'paid') {
        return 'default';
    }

    if (status === 'partial') {
        return 'secondary';
    }

    if (status === 'cancelled' || status === 'refunded') {
        return 'destructive';
    }

    return 'outline';
}
