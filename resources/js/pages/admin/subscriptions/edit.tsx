import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import {
    type BreadcrumbItem,
    type SelectOption,
    type ServiceOption,
    type SubscriptionOption,
} from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import SubscriptionForm, { type SubscriptionFormData } from './form';

interface EditSubscriptionProps {
    subscription: Omit<SubscriptionFormData, 'account_secret' | 'return_to_customer'> & {
        id: number;
        internal_order_number: string;
        has_account_secret: boolean;
    };
    customers: SelectOption[];
    services: ServiceOption[];
    suppliers: SelectOption[];
    currencies: SelectOption[];
    statuses: SelectOption[];
    durationUnits: SelectOption[];
    renewalSubscriptions: SubscriptionOption[];
    defaults: {
        return_to_customer: boolean;
    };
}

export default function EditSubscription({
    subscription,
    customers,
    services,
    suppliers,
    currencies,
    statuses,
    durationUnits,
    renewalSubscriptions,
    defaults,
}: EditSubscriptionProps) {
    const { t } = useLocale();
    const pageTitle = `${t('Edit')} ${subscription.internal_order_number}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Subscriptions', href: '/subscriptions' },
        { title: subscription.internal_order_number, href: `/subscriptions/${subscription.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm<SubscriptionFormData>({
        ...subscription,
        account_secret: '',
        return_to_customer: defaults.return_to_customer,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('subscriptions.update', subscription.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={pageTitle}
                    description={t('Adjust subscription timing, service access, and the saved sale snapshot without losing the customer relationship.')}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={data.return_to_customer ? route('customers.show', data.customer_id) : route('subscriptions.index')}>
                                {t('Back to subscriptions')}
                            </Link>
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
                    submitLabel="Save changes"
                    subscriptionId={subscription.id}
                    hasAccountSecret={subscription.has_account_secret}
                />
            </div>
        </AppLayout>
    );
}
