import FlashMessage from '@/components/admin/flash-message';
import MobileRecordCard from '@/components/admin/mobile-record-card';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ExchangeRateSnapshot, type PaginatedData, type SelectOption } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Rates', href: '/exchange-rate-snapshots' }];

interface ExchangeRateSnapshotFilters {
    search: string;
    from_currency: string;
    source_type: string;
}

interface ExchangeRateSnapshotsIndexProps {
    snapshots: PaginatedData<ExchangeRateSnapshot>;
    filters: ExchangeRateSnapshotFilters;
    currencies: SelectOption[];
    sourceTypes: SelectOption[];
    summary: {
        total: string;
        manual: string;
        linked: string;
    };
}

export default function ExchangeRateSnapshotsIndex({ snapshots, filters, currencies, sourceTypes, summary }: ExchangeRateSnapshotsIndexProps) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const [fromCurrency, setFromCurrency] = useState(filters.from_currency || 'all');
    const [sourceType, setSourceType] = useState(filters.source_type || 'all');

    const submitFilters: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(
            route('exchange-rate-snapshots.index'),
            {
                search,
                from_currency: fromCurrency === 'all' ? '' : fromCurrency,
                source_type: sourceType === 'all' ? '' : sourceType,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Rates')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Rates"
                    description="Review saved exchange-rate snapshots used by subscription sales, payments, capital batches, and manual reporting."
                    actions={
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.post(route('exchange-rate-snapshots.sync-missing'), {}, { preserveScroll: true })}
                            >
                                {t('Sync missing snapshots')}
                            </Button>
                            <Button asChild>
                                <Link href={route('exchange-rate-snapshots.create')}>{t('Add manual snapshot')}</Link>
                            </Button>
                        </>
                    }
                />

                <FlashMessage />

                <div className="grid gap-4 md:grid-cols-3">
                    <SummaryCard label={t('Total snapshots')} value={summary.total} />
                    <SummaryCard label={t('Manual snapshots')} value={summary.manual} />
                    <SummaryCard label={t('Linked snapshots')} value={summary.linked} />
                </div>

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitFilters} className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_10rem_13rem_auto] lg:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by provider, notes, currency, or source ID')}
                        />

                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('From currency')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All currencies')}</SelectItem>
                                {currencies.map((currency) => (
                                    <SelectItem key={currency.value} value={currency.value}>
                                        {currency.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sourceType} onValueChange={setSourceType}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Source')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All sources')}</SelectItem>
                                {sourceTypes.map((source) => (
                                    <SelectItem key={source.value} value={source.value}>
                                        {t(source.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('exchange-rate-snapshots.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="grid gap-3 lg:hidden">
                        {snapshots.data.length === 0 ? (
                            <div className="text-muted-foreground border-sidebar-border/70 rounded-lg border p-6 text-center text-sm">
                                {t('No exchange-rate snapshots found.')}
                            </div>
                        ) : (
                            snapshots.data.map((snapshot) => (
                                <MobileRecordCard
                                    key={snapshot.id}
                                    title={formatDateTime(snapshot.captured_at)}
                                    subtitle={`#${snapshot.id}`}
                                    badges={
                                        <>
                                            <Badge variant="outline">{snapshot.from_currency}</Badge>
                                            <Badge variant="outline">{snapshot.to_currency}</Badge>
                                        </>
                                    }
                                    fields={[
                                        {
                                            label: t('Rate'),
                                            value: (
                                                <>
                                                    <div className="font-mono font-medium">{snapshot.rate}</div>
                                                    <div className="text-muted-foreground">
                                                        {t('1 {from} = {rate} {to}', {
                                                            from: snapshot.from_currency,
                                                            rate: snapshot.rate,
                                                            to: snapshot.to_currency,
                                                        })}
                                                    </div>
                                                </>
                                            ),
                                        },
                                        {
                                            label: t('Source'),
                                            value: snapshot.source_url ? (
                                                <Link href={snapshot.source_url} className="font-medium hover:underline">
                                                    {t(snapshot.source_label)}
                                                </Link>
                                            ) : (
                                                t(snapshot.source_label)
                                            ),
                                        },
                                        {
                                            label: t('Provider'),
                                            value: snapshot.provider ?? t('Not set'),
                                        },
                                        {
                                            label: t('Notes'),
                                            value: snapshot.notes ?? t('No notes'),
                                        },
                                    ]}
                                />
                            ))
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Captured at')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Direction')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Rate')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Source')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Provider')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {snapshots.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No exchange-rate snapshots found.')}
                                        </td>
                                    </tr>
                                ) : (
                                    snapshots.data.map((snapshot) => (
                                        <tr key={snapshot.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{formatDateTime(snapshot.captured_at)}</div>
                                                <div className="text-muted-foreground mt-1">#{snapshot.id}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">{snapshot.from_currency}</Badge>
                                                    <span className="text-muted-foreground">-&gt;</span>
                                                    <Badge variant="outline">{snapshot.to_currency}</Badge>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-mono font-medium">{snapshot.rate}</div>
                                                <div className="text-muted-foreground mt-1 text-xs">
                                                    {t('1 {from} = {rate} {to}', {
                                                        from: snapshot.from_currency,
                                                        rate: snapshot.rate,
                                                        to: snapshot.to_currency,
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                {snapshot.source_url ? (
                                                    <Link href={snapshot.source_url} className="font-medium hover:underline">
                                                        {t(snapshot.source_label)}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium">{t(snapshot.source_label)}</span>
                                                )}
                                                <div className="text-muted-foreground mt-1 text-xs">
                                                    {snapshot.source_type ? t(sourceTypeLabel(snapshot.source_type)) : t('Manual snapshot')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">{snapshot.provider ?? t('Not set')}</td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="text-muted-foreground line-clamp-3 max-w-md">{snapshot.notes ?? t('No notes')}</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-sm">
                            {t('Showing {from}-{to} of {total} rate snapshots', {
                                from: snapshots.from ?? 0,
                                to: snapshots.to ?? 0,
                                total: snapshots.total,
                            })}
                        </p>
                        <Pagination links={snapshots.links} />
                    </div>
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

function formatDateTime(value: string | null): string {
    if (!value) {
        return '-';
    }

    return value.replace('T', ' ').slice(0, 19);
}

function sourceTypeLabel(value: string): string {
    const name = value.split('\\').pop() ?? value;

    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}
