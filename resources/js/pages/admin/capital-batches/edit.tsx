import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CapitalBatch, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import CapitalBatchForm, { type CapitalBatchFormData } from './form';

interface EditCapitalBatchProps {
    capitalBatch: CapitalBatch;
    currencies: SelectOption[];
}

export default function EditCapitalBatch({ capitalBatch, currencies }: EditCapitalBatchProps) {
    const { t } = useLocale();
    const pageTitle = `${t('Edit')} ${t('Batch #{id}', { id: capitalBatch.id })}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Capital', href: '/capital-batches' },
        { title: t('Batch #{id}', { id: capitalBatch.id }), href: `/capital-batches/${capitalBatch.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm<CapitalBatchFormData>({
        usd_amount: capitalBatch.usd_amount,
        funding_date: capitalBatch.funding_date,
        reference_currency: capitalBatch.reference_currency,
        reference_exchange_rate_to_usd: capitalBatch.reference_exchange_rate_to_usd ?? '',
        reference_original_amount: capitalBatch.reference_original_amount ?? '',
        remaining_usd: capitalBatch.remaining_usd ?? '',
        notes: capitalBatch.notes ?? '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('capital-batches.update', capitalBatch.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={pageTitle}
                    description="Adjust recorded funding details without changing the accounting rule that USD remains the base currency."
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
                    submitLabel="Save changes"
                />
            </div>
        </AppLayout>
    );
}
