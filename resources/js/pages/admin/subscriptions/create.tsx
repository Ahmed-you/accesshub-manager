import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption, type ServiceOption, type SubscriptionOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import SubscriptionForm, { type SubscriptionFormData } from './form';

interface CreateSubscriptionProps {
    customers: SelectOption[];
    services: ServiceOption[];
    suppliers: SelectOption[];
    currencies: SelectOption[];
    statuses: SelectOption[];
    durationUnits: SelectOption[];
    renewalSubscriptions: SubscriptionOption[];
    defaults: {
        customer_id: string;
        sale_currency: string;
        return_to_customer: boolean;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Subscriptions', href: '/subscriptions' },
    { title: 'New subscription', href: '/subscriptions/create' },
];

export default function CreateSubscription({
    customers,
    services,
    suppliers,
    currencies,
    statuses,
    durationUnits,
    renewalSubscriptions,
    defaults,
}: CreateSubscriptionProps) {
    const { t } = useLocale();

    const { data, setData, post, processing, errors } = useForm<SubscriptionFormData>({
        customer_id: defaults.customer_id,
        service_id: '',
        supplier_id: '',
        renewed_from_subscription_id: '',
        plan_name: '',
        account_identifier: '',
        account_secret: '',
        duration_value: '',
        duration_unit: 'month',
        sale_recorded_at: defaultDateTimeLocal(),
        start_date: defaultDateOnly(),
        delivered_at: '',
        sale_amount_original: '',
        sale_currency: defaults.sale_currency,
        sale_exchange_rate_to_usd: defaults.sale_currency === 'USD' ? '1' : '',
        cost_usd: '',
        status: 'pending',
        cancel_reason: '',
        refund_reason: '',
        notes: '',
        return_to_customer: defaults.return_to_customer,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('subscriptions.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('New subscription')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('New subscription')}
                    description={t(
                        'Create a subscription record that ties one customer to one digital service, with supplier, timing, sale currency, and profit snapshots.',
                    )}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('subscriptions.index')}>{t('Back to subscriptions')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <SubscriptionForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    customers={customers}
                    services={services}
                    suppliers={suppliers}
                    currencies={currencies}
                    statuses={statuses}
                    durationUnits={durationUnits}
                    renewalSubscriptions={renewalSubscriptions}
                    onSubmit={submit}
                    submitLabel="Create subscription"
                />
            </div>
        </AppLayout>
    );
}

function defaultDateOnly(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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
