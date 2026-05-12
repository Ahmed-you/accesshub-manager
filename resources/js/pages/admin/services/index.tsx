import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import { localizeDurationLabel } from '@/lib/translations';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData, type ResourceFilters, type Service } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Services', href: '/services' }];

interface ServicesIndexProps {
    services: PaginatedData<Service>;
    filters: ResourceFilters;
}

export default function ServicesIndex({ services, filters }: ServicesIndexProps) {
    const { t, locale } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('services.index'), { search }, { preserveState: true, replace: true });
    };

    const destroyService = (service: Service) => {
        if (!window.confirm(t('Delete {name}?', { name: service.name }))) {
            return;
        }

        router.delete(route('services.destroy', service.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Services')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('Services')}
                    description={t('Maintain the service catalog so orders can be created from consistent, reusable service definitions.')}
                    actions={
                        <Button asChild>
                            <Link href={route('services.create')}>{t('Add service')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search by name, category, or description')}
                            className="sm:max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.get(route('services.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Service')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Category')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Default duration')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Status')}</th>
                                    <th className="px-3 py-3 text-right font-medium">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No services yet. Add the first service so subscription orders have a clean catalog.')}
                                        </td>
                                    </tr>
                                ) : (
                                    services.data.map((service) => (
                                        <tr key={service.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex items-start gap-3">
                                                    {service.image_url ? (
                                                        <img
                                                            src={service.image_url}
                                                            alt={service.name}
                                                            className="h-12 w-12 rounded-md border object-cover"
                                                        />
                                                    ) : null}
                                                    <div>
                                                        <div className="font-medium">{service.name}</div>
                                                        {service.description ? (
                                                            <div className="text-muted-foreground mt-1 line-clamp-2">{service.description}</div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">{service.category ?? t('Uncategorized')}</td>
                                            <td className="px-3 py-4 align-top">
                                                {service.default_duration_value && service.default_duration_unit
                                                    ? localizeDurationLabel(
                                                          locale,
                                                          `${service.default_duration_value} ${service.default_duration_unit}${service.default_duration_value === 1 ? '' : 's'}`,
                                                      )
                                                    : t('Not set')}
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={service.active ? 'default' : 'secondary'}>
                                                        {service.active ? t('Active') : t('Inactive')}
                                                    </Badge>
                                                    <span className="text-muted-foreground text-xs">
                                                        {service.subscriptions_count ?? 0} {t('subscriptions')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('services.edit', service.id)}>{t('Edit')}</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => destroyService(service)}>
                                                        {t('Delete')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-sm">
                            {t('Showing {from}-{to} of {total} services', {
                                from: services.from ?? 0,
                                to: services.to ?? 0,
                                total: services.total,
                            })}
                        </p>
                        <Pagination links={services.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
