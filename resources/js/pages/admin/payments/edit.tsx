import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaymentSubscriptionOption, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PaymentForm, { type PaymentFormData } from './form';

interface EditPaymentProps {
    payment: Omit<PaymentFormData, 'return_to_customer'> & {
        id: number;
    };
    customers: SelectOption[];
    subscriptions: PaymentSubscriptionOption[];
    currencies: SelectOption[];
    methods: SelectOption[];
    defaults: {
        return_to_customer: boolean;
    };
}

export default function EditPayment({ payment, customers, subscriptions, currencies, methods, defaults }: EditPaymentProps) {
    const { t } = useLocale();
    const pageTitle = `${t('Edit')} ${t('Payment')}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Payments', href: '/payments' },
        { title: `${t('Payment')} #${payment.id}`, href: `/payments/${payment.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm<PaymentFormData>({
        ...payment,
        return_to_customer: defaults.return_to_customer,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('payments.update', payment.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={pageTitle}
                    description={t('Adjust payment details while keeping the stored USD snapshot and subscription link consistent.')}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={data.return_to_customer ? route('customers.show', data.customer_id) : route('payments.index')}>
                                {t('Back to payments')}
                            </Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <PaymentForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    customers={customers}
                    subscriptions={subscriptions}
                    currencies={currencies}
                    methods={methods}
                    onSubmit={submit}
                    submitLabel="Save changes"
                />
            </div>
        </AppLayout>
    );
}
