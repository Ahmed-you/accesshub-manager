import FlashMessage from '@/components/admin/flash-message';
import MobileRecordCard from '@/components/admin/mobile-record-card';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { localizeCountdownLabel, localizeDurationLabel } from '@/lib/translations';
import { type BreadcrumbItem, type Customer, type PaginatedData, type Subscription } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface CustomerShowProps {
    customer: Customer;
    subscriptions: PaginatedData<Subscription>;
    filters: {
        search: string;
    };
}

export default function CustomerShow({ customer, subscriptions, filters }: CustomerShowProps) {
    const { t, locale } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Customers', href: '/customers' },
        { title: customer.name, href: `/customers/${customer.id}` },
    ];

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('customers.show', customer.id), { search }, { preserveState: true, replace: true });
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
            <Head title={customer.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={customer.name}
                    description={t('View every subscription attached to this customer, including renewals, countdown state, and payment progress.')}
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={route('customers.edit', customer.id)}>{t('Edit')}</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('payments.create', { customer: customer.id })}>{t('Add payment')}</Link>
                            </Button>
                            <Button asChild>
                                <Link href={route('subscriptions.create', { customer: customer.id })}>{t('Add subscription')}</Link>
                            </Button>
                        </>
                    }
                />

                <FlashMessage />

                <div className="grid gap-4 lg:grid-cols-4">
                    <div className="border-sidebar-border/70 rounded-lg border p-4 lg:col-span-2">
                        <div className="text-muted-foreground text-xs">{t('Customer')}</div>
                        <div className="mt-2 text-lg font-medium">{customer.name}</div>
                        <div className="text-muted-foreground mt-1 text-sm">{customer.email ?? t('No email')}</div>
                        <div className="text-muted-foreground text-sm">{customer.phone ?? t('No phone')}</div>
                    </div>
                    <div className="border-sidebar-border/70 rounded-lg border p-4">
                        <div className="text-muted-foreground text-xs">{t('Preferred currency')}</div>
                        <div className="mt-2 text-lg font-medium">{customer.preferred_currency}</div>
                    </div>
                    <div className="border-sidebar-border/70 rounded-lg border p-4">
                        <div className="text-muted-foreground text-xs">{t('Subscriptions')}</div>
                        <div className="mt-2 text-lg font-medium">{customer.subscriptions_count ?? subscriptions.total}</div>
                    </div>
                </div>

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by order, service, supplier, or account login')}
                            className="sm:max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('customers.show', customer.id))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="grid gap-3 lg:hidden">
                        {subscriptions.data.length === 0 ? (
                            <div className="text-muted-foreground border-sidebar-border/70 rounded-lg border p-6 text-center text-sm">
                                {t('No subscriptions are linked to this customer yet.')}
                            </div>
                        ) : (
                            subscriptions.data.map((subscription) => (
                                <MobileRecordCard
                                    key={subscription.id}
                                    title={subscription.internal_order_number}
                                    subtitle={
                                        <>
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
                                            label: t('Period'),
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
                                                <Link href={route('payments.create', { customer: customer.id, subscription: subscription.id })}>
                                                    {t('Payment')}
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('subscriptions.edit', { subscription: subscription.id, return_to_customer: 1 })}>
                                                    {t('Edit')}
                                                </Link>
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
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Order')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Service')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Period')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Countdown')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Payment')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Profit')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No subscriptions are linked to this customer yet.')}
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
                                                        <div className="text-muted-foreground mt-1">{subscription.supplier_name}</div>
                                                        {subscription.renewed_from_label ? (
                                                            <div className="text-muted-foreground text-xs">{subscription.renewed_from_label}</div>
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
                                                            href={route('payments.create', { customer: customer.id, subscription: subscription.id })}
                                                        >
                                                            {t('Payment')}
                                                        </Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link
                                                            href={route('subscriptions.edit', {
                                                                subscription: subscription.id,
                                                                return_to_customer: 1,
                                                            })}
                                                        >
                                                            {t('Edit')}
                                                        </Link>
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
