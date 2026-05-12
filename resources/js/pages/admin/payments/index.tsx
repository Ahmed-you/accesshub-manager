import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchableSelect from '@/components/ui/searchable-select';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData, type Payment, type SelectOption } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payments', href: '/payments' }];
const ALL_CUSTOMERS = '__all_customers__';

interface PaymentsIndexProps {
    payments: PaginatedData<Payment>;
    filters: {
        search: string;
        customer_id: string;
    };
    customers: SelectOption[];
}

export default function PaymentsIndex({ payments, filters, customers }: PaymentsIndexProps) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const [customerId, setCustomerId] = useState(filters.customer_id ?? '');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('payments.index'), { search, customer_id: customerId }, { preserveState: true, replace: true });
    };

    const destroyPayment = (payment: Payment) => {
        if (!window.confirm(t('Delete {name}?', { name: payment.reference || `${payment.amount_original} ${payment.currency}` }))) {
            return;
        }

        router.delete(route('payments.destroy', payment.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Payments')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('Payments')}
                    description={t('Track customer payments with the original currency, saved USD value, and the subscription they settle.')}
                    actions={
                        <Button asChild>
                            <Link href={route('payments.create')}>{t('Add payment')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_14rem_auto]">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by reference, customer, order, service, or account login')}
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
                            <Button type="button" variant="ghost" onClick={() => router.get(route('payments.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1020px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Customer')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Subscription')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Payment amount')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Payment in USD')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Paid at')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Payment method')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No payments yet. Add the first payment to start tracking what customers actually paid.')}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.data.map((payment) => (
                                        <tr key={payment.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{payment.customer_name}</div>
                                                {payment.reference ? <div className="text-muted-foreground mt-1">{payment.reference}</div> : null}
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{payment.subscription_label}</div>
                                                <div className="text-muted-foreground mt-1">{payment.service_name}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                {payment.amount_original} {payment.currency}
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{payment.amount_usd} USD</div>
                                                <div className="text-muted-foreground mt-1">
                                                    {t('Rate')} {payment.exchange_rate_to_usd}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">{payment.paid_at}</td>
                                            <td className="px-3 py-4 align-top">{payment.method_label ? t(payment.method_label) : t('None')}</td>
                                            <td className="px-3 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('customers.show', payment.customer_id)}>{t('Customer')}</Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('payments.edit', payment.id)}>{t('Edit')}</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => destroyPayment(payment)}>
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
                            {t('Showing {from}-{to} of {total} payments', {
                                from: payments.from ?? 0,
                                to: payments.to ?? 0,
                                total: payments.total,
                            })}
                        </p>
                        <Pagination links={payments.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
