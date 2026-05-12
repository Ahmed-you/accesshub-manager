import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import CustomerForm, { type CustomerFormData } from './form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Customers', href: '/customers' },
    { title: 'New customer', href: '/customers/create' },
];

interface CreateCustomerProps {
    currencies: SelectOption[];
}

export default function CreateCustomer({ currencies }: CreateCustomerProps) {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm<CustomerFormData>({
        name: '',
        email: '',
        phone: '',
        preferred_currency: 'ILS',
        telegram_username: '',
        telegram_chat_id: '',
        telegram_notifications_enabled: false,
        notes: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('customers.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New customer" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="New customer"
                    description="Add a customer profile before assigning subscriptions or recording payments."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('customers.index')}>{t('Back to customers')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <CustomerForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    currencies={currencies}
                    onSubmit={submit}
                    submitLabel="Create customer"
                />
            </div>
        </AppLayout>
    );
}
