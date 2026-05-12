import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { type ReactNode } from 'react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports' }];

interface ReportSummary {
    revenue_usd: string;
    cost_usd: string;
    profit_usd: string;
    payments_received_usd: string;
    outstanding_usd: string;
    subscriptions_count: string;
    payments_count: string;
    margin_percent: string;
}

interface ServiceBreakdownRow {
    name: string;
    subscriptions_count: string;
    revenue_usd: string;
    cost_usd: string;
    profit_usd: string;
    margin_percent: string;
}

interface CustomerBreakdownRow {
    id: string;
    name: string;
    subscriptions_count: string;
    revenue_usd: string;
    paid_usd: string;
    outstanding_usd: string;
    profit_usd: string;
}

interface PaymentCurrencyRow {
    currency: string;
    payments_count: string;
    original_amount: string;
    amount_usd: string;
}

interface OutstandingSubscriptionRow {
    id: string;
    customer_id: string;
    internal_order_number: string;
    customer_name: string;
    service_name: string;
    sale_amount_usd: string;
    paid_usd: string;
    outstanding_usd: string;
}

interface ReportsIndexProps {
    filters: {
        from: string;
        to: string;
    };
    summary: ReportSummary;
    serviceBreakdown: ServiceBreakdownRow[];
    customerBreakdown: CustomerBreakdownRow[];
    paymentCurrencies: PaymentCurrencyRow[];
    outstandingSubscriptions: OutstandingSubscriptionRow[];
}

export default function ReportsIndex({
    filters,
    summary,
    serviceBreakdown,
    customerBreakdown,
    paymentCurrencies,
    outstandingSubscriptions,
}: ReportsIndexProps) {
    const { t } = useLocale();
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const submitFilters: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('reports.index'), { from, to }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Reports')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('Reports')}
                    description={t('Review USD revenue, cost, profit, payments, and outstanding balances from saved snapshots.')}
                />

                <div className="border-sidebar-border/70 rounded-lg border p-4">
                    <form onSubmit={submitFilters} className="grid gap-4 md:grid-cols-[12rem_12rem_auto] md:items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="from">{t('From date')}</Label>
                            <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="to">{t('To date')}</Label>
                            <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">{t('Apply filters')}</Button>
                            <Button type="button" variant="outline" onClick={() => router.get(route('reports.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label={t('Revenue USD')} value={`${summary.revenue_usd} USD`} />
                    <SummaryCard label={t('Cost USD')} value={`${summary.cost_usd} USD`} />
                    <SummaryCard label={t('Operational profit USD')} value={`${summary.profit_usd} USD`} />
                    <SummaryCard label={t('Profit margin')} value={`${summary.margin_percent}%`} />
                    <SummaryCard label={t('Payments received USD')} value={`${summary.payments_received_usd} USD`} />
                    <SummaryCard label={t('Outstanding USD')} value={`${summary.outstanding_usd} USD`} />
                    <SummaryCard label={t('Subscriptions sold')} value={summary.subscriptions_count} />
                    <SummaryCard label={t('Payments received')} value={summary.payments_count} />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <ReportTable title={t('Profit by service')} emptyText={t('No service report data for this date range.')} isEmpty={serviceBreakdown.length === 0}>
                        <table className="w-full table-fixed text-start text-sm">
                            <colgroup>
                                <col className="w-[30%]" />
                                <col className="w-[12%]" />
                                <col className="w-[18%]" />
                                <col className="w-[16%]" />
                                <col className="w-[14%]" />
                                <col className="w-[10%]" />
                            </colgroup>
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 text-start font-medium">{t('Service')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Orders')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Revenue USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Cost USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Profit')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Margin')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceBreakdown.map((row) => (
                                    <tr key={row.name} className="border-sidebar-border/70 border-b last:border-b-0">
                                        <td className="truncate px-3 py-3 font-medium">{row.name}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.subscriptions_count}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.revenue_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.cost_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.profit_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.margin_percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTable>

                    <ReportTable title={t('Profit by customer')} emptyText={t('No customer report data for this date range.')} isEmpty={customerBreakdown.length === 0}>
                        <table className="w-full table-fixed text-start text-sm">
                            <colgroup>
                                <col className="w-[25%]" />
                                <col className="w-[10%]" />
                                <col className="w-[18%]" />
                                <col className="w-[16%]" />
                                <col className="w-[18%]" />
                                <col className="w-[13%]" />
                            </colgroup>
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 text-start font-medium">{t('Customer')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Orders')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Revenue USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Paid USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Outstanding USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Profit')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerBreakdown.map((row) => (
                                    <tr key={row.id || row.name} className="border-sidebar-border/70 border-b last:border-b-0">
                                        <td className="truncate px-3 py-3 font-medium">
                                            {row.id ? (
                                                <Link href={route('customers.show', row.id)} className="hover:underline">
                                                    {row.name}
                                                </Link>
                                            ) : (
                                                row.name
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.subscriptions_count}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.revenue_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.paid_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.outstanding_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.profit_usd}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTable>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <ReportTable title={t('Payment currencies')} emptyText={t('No payments recorded for this date range.')} isEmpty={paymentCurrencies.length === 0}>
                        <table className="w-full table-fixed text-start text-sm">
                            <colgroup>
                                <col className="w-[22%]" />
                                <col className="w-[18%]" />
                                <col className="w-[30%]" />
                                <col className="w-[30%]" />
                            </colgroup>
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 text-start font-medium">{t('Currency')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Payments')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Original amount')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('USD snapshot')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentCurrencies.map((row) => (
                                    <tr key={row.currency} className="border-sidebar-border/70 border-b last:border-b-0">
                                        <td className="px-3 py-3 font-medium">{row.currency}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.payments_count}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">
                                            {row.original_amount} {row.currency}
                                        </td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.amount_usd} USD</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTable>

                    <ReportTable
                        title={t('Top outstanding subscriptions')}
                        emptyText={t('No outstanding balances for this date range.')}
                        isEmpty={outstandingSubscriptions.length === 0}
                    >
                        <table className="w-full table-fixed text-start text-sm">
                            <colgroup>
                                <col className="w-[22%]" />
                                <col className="w-[18%]" />
                                <col className="w-[18%]" />
                                <col className="w-[14%]" />
                                <col className="w-[14%]" />
                                <col className="w-[14%]" />
                            </colgroup>
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 text-start font-medium">{t('Order')}</th>
                                    <th className="px-3 py-3 text-start font-medium">{t('Customer')}</th>
                                    <th className="px-3 py-3 text-start font-medium">{t('Service')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Sale in USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Paid USD')}</th>
                                    <th className="px-3 py-3 text-end font-medium">{t('Outstanding USD')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outstandingSubscriptions.map((row) => (
                                    <tr key={row.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                        <td className="truncate px-3 py-3 font-medium">
                                            <Link href={route('subscriptions.edit', row.id)} className="hover:underline">
                                                {row.internal_order_number}
                                            </Link>
                                        </td>
                                        <td className="truncate px-3 py-3">
                                            <Link href={route('customers.show', row.customer_id)} className="hover:underline">
                                                {row.customer_name}
                                            </Link>
                                        </td>
                                        <td className="truncate px-3 py-3">{row.service_name}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.sale_amount_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.paid_usd}</td>
                                        <td className="px-3 py-3 text-end tabular-nums">{row.outstanding_usd}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTable>
                </div>
            </div>
        </AppLayout>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-sidebar-border/70 rounded-lg border p-4">
            <div className="text-muted-foreground text-sm">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
    );
}

function ReportTable({ title, emptyText, isEmpty, children }: { title: string; emptyText: string; isEmpty: boolean; children: ReactNode }) {
    return (
        <div className="border-sidebar-border/70 min-w-0 overflow-hidden rounded-lg border">
            <div className="border-sidebar-border/70 border-b px-4 py-3">
                <h2 className="font-medium">{title}</h2>
            </div>
            <div className="min-w-0">{isEmpty ? <div className="text-muted-foreground px-4 py-8 text-sm">{emptyText}</div> : children}</div>
        </div>
    );
}
