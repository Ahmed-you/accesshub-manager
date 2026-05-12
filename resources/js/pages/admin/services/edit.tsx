import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption, type Service } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import ServiceForm, { type ServiceFormData } from './form';

interface EditServiceProps {
    service: Service;
    durationUnits: SelectOption[];
}

export default function EditService({ service, durationUnits }: EditServiceProps) {
    const { t } = useLocale();
    const pageTitle = `${t('Edit')} ${service.name}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Services', href: '/services' },
        { title: service.name, href: `/services/${service.id}/edit` },
    ];

    const { data, setData, post, processing, errors, transform } = useForm<ServiceFormData>({
        name: service.name,
        category: service.category ?? '',
        description: service.description ?? '',
        default_duration_value: service.default_duration_value?.toString() ?? '',
        default_duration_unit: service.default_duration_unit ?? 'month',
        active: service.active,
        image: null,
        remove_image: false,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        transform((currentData) => ({
            ...currentData,
            _method: 'put',
        }));

        post(route('services.update', service.id), { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={pageTitle}
                    description={t('Keep default durations and service visibility aligned with current operations.')}
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
                    existingImageUrl={service.image_url ?? null}
                    onSubmit={submit}
                    submitLabel="Save changes"
                />
            </div>
        </AppLayout>
    );
}
