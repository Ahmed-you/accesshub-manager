import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaymentSubscriptionOption, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PaymentForm, { type PaymentFormData } from './form';

interface CreatePaymentProps {
    customers: SelectOption[];
    subscriptions: PaymentSubscriptionOption[];
    currencies: SelectOption[];
    methods: SelectOption[];
    defaults: {
        customer_id: string;
        subscription_id: string;
        currency: string;
        return_to_customer: boolean;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Payments', href: '/payments' },
    { title: 'New payment', href: '/payments/create' },
];

export default function CreatePayment({ customers, subscriptions, currencies, methods, defaults }: CreatePaymentProps) {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm<PaymentFormData>({
        subscription_id: defaults.subscription_id,
        customer_id: defaults.customer_id,
        amount_original: '',
        currency: defaults.currency,
        exchange_rate_to_usd: defaults.currency === 'USD' ? '1' : '',
        paid_at: defaultDateTimeLocal(),
        method: '',
        reference: '',
        notes: '',
        return_to_customer: defaults.return_to_customer,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('payments.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('New payment')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('New payment')}
                    description={t('Record customer payments with their original currency, saved USD snapshot, and the subscription they belong to.')}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('payments.index')}>{t('Back to payments')}</Link>
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
                    submitLabel="Create payment"
                />
            </div>
        </AppLayout>
    );
}

function defaultDateTimeLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
