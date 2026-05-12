import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Supplier } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import SupplierForm, { type SupplierFormData } from './form';

interface EditSupplierProps {
    supplier: Supplier;
}

export default function EditSupplier({ supplier }: EditSupplierProps) {
    const { t } = useLocale();
    const pageTitle = `${t('Edit')} ${supplier.name}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Suppliers', href: '/suppliers' },
        { title: supplier.name, href: `/suppliers/${supplier.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm<SupplierFormData>({
        name: supplier.name,
        contact_name: supplier.contact_name ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        website: supplier.website ?? '',
        notes: supplier.notes ?? '',
        active: supplier.active,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('suppliers.update', supplier.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={pageTitle}
                    description="Update supplier availability and contact details without losing historical records."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('suppliers.index')}>{t('Back to suppliers')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <SupplierForm data={data} setData={setData} errors={errors} processing={processing} onSubmit={submit} submitLabel="Save changes" />
            </div>
        </AppLayout>
    );
}
