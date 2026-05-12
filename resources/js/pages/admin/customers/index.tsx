import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Customer, type PaginatedData, type ResourceFilters } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Customers', href: '/customers' }];

interface CustomersIndexProps {
    customers: PaginatedData<Customer>;
    filters: ResourceFilters;
}

export default function CustomersIndex({ customers, filters }: CustomersIndexProps) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('customers.index'), { search }, { preserveState: true, replace: true });
    };

    const destroyCustomer = (customer: Customer) => {
        if (!window.confirm(t('Delete {name}?', { name: customer.name }))) {
            return;
        }

        router.delete(route('customers.destroy', customer.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Customers"
                    description="Manage customer contact details and preferred currencies before linking subscriptions and payments."
                    actions={
                        <Button asChild>
                            <Link href={route('customers.create')}>{t('Add customer')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by name, email, or phone')}
                            className="sm:max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('customers.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Customer')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Contact')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Preferred currency')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Activity')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No customers yet. Add your first customer to get started.')}
                                        </td>
                                    </tr>
                                ) : (
                                    customers.data.map((customer) => (
                                        <tr key={customer.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{customer.name}</div>
                                                {customer.notes ? (
                                                    <div className="text-muted-foreground mt-1 line-clamp-2">{customer.notes}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div>{customer.email ?? t('No email')}</div>
                                                <div className="text-muted-foreground mt-1">{customer.phone ?? t('No phone')}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <Badge variant="outline">{customer.preferred_currency}</Badge>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div>
                                                    {customer.subscriptions_count ?? 0} {t('subscriptions')}
                                                </div>
                                                <div className="text-muted-foreground mt-1">
                                                    {customer.payments_count ?? 0} {t('payments')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('customers.show', customer.id)}>{t('View')}</Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('customers.edit', customer.id)}>{t('Edit')}</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => destroyCustomer(customer)}>
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
                            {t('Showing {from}-{to} of {total} customers', {
                                from: customers.from ?? 0,
                                to: customers.to ?? 0,
                                total: customers.total,
                            })}
                        </p>
                        <Pagination links={customers.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
