import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import ServiceForm, { type ServiceFormData } from './form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Services', href: '/services' },
    { title: 'New service', href: '/services/create' },
];

interface CreateServiceProps {
    durationUnits: SelectOption[];
}

export default function CreateService({ durationUnits }: CreateServiceProps) {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm<ServiceFormData>({
        name: '',
        category: '',
        description: '',
        default_duration_value: '',
        default_duration_unit: 'month',
        active: true,
        image: null,
        remove_image: false,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('services.store'), { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('New service')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('New service')}
                    description={t('Build the catalog of digital services that subscriptions will be sold against.')}
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('services.index')}>{t('Back to services')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <ServiceForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    durationUnits={durationUnits}
                    onSubmit={submit}
                    submitLabel="Create service"
                />
            </div>
        </AppLayout>
    );
}
