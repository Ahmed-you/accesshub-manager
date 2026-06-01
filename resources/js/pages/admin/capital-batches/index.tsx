import FlashMessage from '@/components/admin/flash-message';
import MobileRecordCard from '@/components/admin/mobile-record-card';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CapitalBatch, type PaginatedData, type ResourceFilters } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Capital', href: '/capital-batches' }];

interface CapitalBatchesIndexProps {
    capitalBatches: PaginatedData<CapitalBatch>;
    filters: ResourceFilters;
}

export default function CapitalBatchesIndex({ capitalBatches, filters }: CapitalBatchesIndexProps) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('capital-batches.index'), { search }, { preserveState: true, replace: true });
    };

    const destroyCapitalBatch = (capitalBatch: CapitalBatch) => {
        if (!window.confirm(t('Delete capital batch #{id}?', { id: capitalBatch.id }))) {
            return;
        }

        router.delete(route('capital-batches.destroy', capitalBatch.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Capital batches" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Capital batches"
                    description="Store USD funding separately from sales so operational profit stays stable and exchange-rate movement stays explicit."
                    actions={
                        <Button asChild>
                            <Link href={route('capital-batches.create')}>{t('Add capital batch')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by reference currency or notes')}
                            className="sm:max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('capital-batches.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="grid gap-3 lg:hidden">
                        {capitalBatches.data.length === 0 ? (
                            <div className="text-muted-foreground border-sidebar-border/70 rounded-lg border p-6 text-center text-sm">
                                {t('No capital batches yet. Add a funding record before deeper financial tracking.')}
                            </div>
                        ) : (
                            capitalBatches.data.map((capitalBatch) => (
                                <MobileRecordCard
                                    key={capitalBatch.id}
                                    title={t('Batch #{id}', { id: capitalBatch.id })}
                                    subtitle={capitalBatch.notes ?? undefined}
                                    badges={<Badge variant="outline">{capitalBatch.reference_currency}</Badge>}
                                    fields={[
                                        {
                                            label: t('USD amount'),
                                            value: `USD ${capitalBatch.usd_amount}`,
                                        },
                                        {
                                            label: t('Funding date'),
                                            value: capitalBatch.funding_date,
                                        },
                                        {
                                            label: t('Reference'),
                                            value: (
                                                <>
                                                    <div>
                                                        {capitalBatch.reference_exchange_rate_to_usd
                                                            ? t('Rate {rate}', { rate: capitalBatch.reference_exchange_rate_to_usd })
                                                            : t('Not set')}
                                                    </div>
                                                    {capitalBatch.reference_original_amount ? (
                                                        <div className="text-muted-foreground">
                                                            {t('Source amount {amount}', { amount: capitalBatch.reference_original_amount })}
                                                        </div>
                                                    ) : null}
                                                </>
                                            ),
                                        },
                                        {
                                            label: t('Remaining'),
                                            value: `USD ${capitalBatch.remaining_usd ?? capitalBatch.usd_amount}`,
                                        },
                                    ]}
                                    actions={
                                        <>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('capital-batches.edit', capitalBatch.id)}>{t('Edit')}</Link>
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => destroyCapitalBatch(capitalBatch)}>
                                                {t('Delete')}
                                            </Button>
                                        </>
                                    }
                                />
                            ))
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Batch')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Funding date')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Reference')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Remaining')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {capitalBatches.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No capital batches yet. Add a funding record before deeper financial tracking.')}
                                        </td>
                                    </tr>
                                ) : (
                                    capitalBatches.data.map((capitalBatch) => (
                                        <tr key={capitalBatch.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{t('Batch #{id}', { id: capitalBatch.id })}</div>
                                                <div className="text-muted-foreground mt-1">USD {capitalBatch.usd_amount}</div>
                                                {capitalBatch.notes ? (
                                                    <div className="text-muted-foreground mt-1 line-clamp-2">{capitalBatch.notes}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-4 align-top">{capitalBatch.funding_date}</td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">{capitalBatch.reference_currency}</Badge>
                                                    {capitalBatch.reference_exchange_rate_to_usd ? (
                                                        <span className="text-muted-foreground text-xs">
                                                            {t('Rate {rate}', { rate: capitalBatch.reference_exchange_rate_to_usd })}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {capitalBatch.reference_original_amount ? (
                                                    <div className="text-muted-foreground mt-1 text-xs">
                                                        {t('Source amount {amount}', { amount: capitalBatch.reference_original_amount })}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-4 align-top">USD {capitalBatch.remaining_usd ?? capitalBatch.usd_amount}</td>
                                            <td className="px-3 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('capital-batches.edit', capitalBatch.id)}>{t('Edit')}</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => destroyCapitalBatch(capitalBatch)}>
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
                            {t('Showing {from}-{to} of {total} capital batches', {
                                from: capitalBatches.from ?? 0,
                                to: capitalBatches.to ?? 0,
                                total: capitalBatches.total,
                            })}
                        </p>
                        <Pagination links={capitalBatches.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
