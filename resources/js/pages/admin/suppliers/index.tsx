import FlashMessage from '@/components/admin/flash-message';
import MobileRecordCard from '@/components/admin/mobile-record-card';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData, type ResourceFilters, type Supplier } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Suppliers', href: '/suppliers' }];

interface SuppliersIndexProps {
    suppliers: PaginatedData<Supplier>;
    filters: ResourceFilters;
}

export default function SuppliersIndex({ suppliers, filters }: SuppliersIndexProps) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('suppliers.index'), { search }, { preserveState: true, replace: true });
    };

    const destroySupplier = (supplier: Supplier) => {
        if (!window.confirm(t('Delete {name}?', { name: supplier.name }))) {
            return;
        }

        router.delete(route('suppliers.destroy', supplier.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Suppliers" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Suppliers"
                    description="Track who provides each digital service account so order history stays operationally clear."
                    actions={
                        <Button asChild>
                            <Link href={route('suppliers.create')}>{t('Add supplier')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by supplier, contact, or email')}
                            className="sm:max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('suppliers.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="grid gap-3 lg:hidden">
                        {suppliers.data.length === 0 ? (
                            <div className="text-muted-foreground border-sidebar-border/70 rounded-lg border p-6 text-center text-sm">
                                {t('No suppliers yet. Add one before creating subscription orders.')}
                            </div>
                        ) : (
                            suppliers.data.map((supplier) => (
                                <MobileRecordCard
                                    key={supplier.id}
                                    title={supplier.name}
                                    subtitle={supplier.notes ?? undefined}
                                    badges={
                                        <Badge variant={supplier.active ? 'default' : 'secondary'}>
                                            {supplier.active ? t('Active') : t('Inactive')}
                                        </Badge>
                                    }
                                    fields={[
                                        {
                                            label: t('Contact'),
                                            value: (
                                                <>
                                                    <div>{supplier.contact_name ?? t('No contact')}</div>
                                                    <div className="text-muted-foreground">
                                                        {supplier.email ?? supplier.phone ?? t('No direct contact details')}
                                                    </div>
                                                </>
                                            ),
                                        },
                                        {
                                            label: t('Subscriptions'),
                                            value: supplier.subscriptions_count ?? 0,
                                        },
                                    ]}
                                    actions={
                                        <>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('suppliers.edit', supplier.id)}>{t('Edit')}</Link>
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => destroySupplier(supplier)}>
                                                {t('Delete')}
                                            </Button>
                                        </>
                                    }
                                />
                            ))
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Supplier')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Contact')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Status')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Subscriptions')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No suppliers yet. Add one before creating subscription orders.')}
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.data.map((supplier) => (
                                        <tr key={supplier.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{supplier.name}</div>
                                                {supplier.notes ? (
                                                    <div className="text-muted-foreground mt-1 line-clamp-2">{supplier.notes}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div>{supplier.contact_name ?? t('No contact')}</div>
                                                <div className="text-muted-foreground mt-1">
                                                    {supplier.email ?? supplier.phone ?? t('No direct contact details')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <Badge variant={supplier.active ? 'default' : 'secondary'}>
                                                    {supplier.active ? t('Active') : t('Inactive')}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-4 align-top">{supplier.subscriptions_count ?? 0}</td>
                                            <td className="px-3 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('suppliers.edit', supplier.id)}>{t('Edit')}</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => destroySupplier(supplier)}>
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
                            {t('Showing {from}-{to} of {total} suppliers', {
                                from: suppliers.from ?? 0,
                                to: suppliers.to ?? 0,
                                total: suppliers.total,
                            })}
                        </p>
                        <Pagination links={suppliers.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
