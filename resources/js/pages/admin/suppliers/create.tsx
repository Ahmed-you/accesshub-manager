import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import SupplierForm, { type SupplierFormData } from './form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Suppliers', href: '/suppliers' },
    { title: 'New supplier', href: '/suppliers/create' },
];

export default function CreateSupplier() {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm<SupplierFormData>({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        website: '',
        notes: '',
        active: true,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('suppliers.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New supplier" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="New supplier"
                    description="Keep supplier contact details clean so subscription sourcing stays traceable."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('suppliers.index')}>{t('Back to suppliers')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <SupplierForm data={data} setData={setData} errors={errors} processing={processing} onSubmit={submit} submitLabel="Create supplier" />
            </div>
        </AppLayout>
    );
}
