import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import ExchangeRateSnapshotForm, { type ExchangeRateSnapshotFormData } from './form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Rates', href: '/exchange-rate-snapshots' },
    { title: 'New rate snapshot', href: '/exchange-rate-snapshots/create' },
];

interface CreateExchangeRateSnapshotProps {
    currencies: SelectOption[];
    defaults: {
        from_currency: string;
        to_currency: string;
        captured_at: string;
    };
}

export default function CreateExchangeRateSnapshot({ currencies, defaults }: CreateExchangeRateSnapshotProps) {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm<ExchangeRateSnapshotFormData>({
        from_currency: defaults.from_currency,
        to_currency: defaults.to_currency,
        rate: '',
        captured_at: defaults.captured_at,
        provider: 'manual_admin_entry',
        notes: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('exchange-rate-snapshots.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('New rate snapshot')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="New rate snapshot"
                    description="Save a manual exchange-rate snapshot for reporting without touching historical subscription profit."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('exchange-rate-snapshots.index')}>{t('Back to rates')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <ExchangeRateSnapshotForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    currencies={currencies}
                    onSubmit={submit}
                    submitLabel="Create snapshot"
                />
            </div>
        </AppLayout>
    );
}
