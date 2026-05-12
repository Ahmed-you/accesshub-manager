import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import CapitalBatchForm, { type CapitalBatchFormData } from './form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Capital', href: '/capital-batches' },
    { title: 'New batch', href: '/capital-batches/create' },
];

interface CreateCapitalBatchProps {
    currencies: SelectOption[];
}

export default function CreateCapitalBatch({ currencies }: CreateCapitalBatchProps) {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm<CapitalBatchFormData>({
        usd_amount: '',
        funding_date: '',
        reference_currency: 'ILS',
        reference_exchange_rate_to_usd: '',
        reference_original_amount: '',
        remaining_usd: '',
        notes: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('capital-batches.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New capital batch" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="New capital batch"
                    description="Record USD funding batches separately from subscription profit so later reporting stays clean."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('capital-batches.index')}>{t('Back to capital')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <CapitalBatchForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    currencies={currencies}
                    onSubmit={submit}
                    submitLabel="Create capital batch"
                />
            </div>
        </AppLayout>
    );
}
