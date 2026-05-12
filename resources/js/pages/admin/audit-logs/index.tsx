import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type AuditLog, type BreadcrumbItem, type PaginatedData, type SelectOption } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Audit log', href: '/audit-logs' }];

interface AuditLogFilters {
    search: string;
    event: string;
    auditable_type: string;
}

interface AuditLogsIndexProps {
    auditLogs: PaginatedData<AuditLog>;
    filters: AuditLogFilters;
    events: SelectOption[];
    auditableTypes: SelectOption[];
}

export default function AuditLogsIndex({ auditLogs, filters, events, auditableTypes }: AuditLogsIndexProps) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const [event, setEvent] = useState(filters.event || 'all');
    const [auditableType, setAuditableType] = useState(filters.auditable_type || 'all');

    const submitFilters: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();

        router.get(
            route('audit-logs.index'),
            {
                search,
                event: event === 'all' ? '' : event,
                auditable_type: auditableType === 'all' ? '' : auditableType,
            },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        router.get(route('audit-logs.index'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Audit log')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Audit log"
                    description="Review admin changes across customers, services, subscriptions, payments, and financial records."
                />

                <div className="border-sidebar-border/70 space-y-4 rounded-lg border p-4">
                    <form onSubmit={submitFilters} className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto] lg:items-end">
                        <Input
                            value={search}
                            onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                            placeholder={t('Search by admin, event, model, or record ID')}
                        />

                        <Select value={event} onValueChange={setEvent}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('All events')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All events')}</SelectItem>
                                {events.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {t(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={auditableType} onValueChange={setAuditableType}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('All records')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All records')}</SelectItem>
                                {auditableTypes.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {t(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="outline">
                                {t('Search')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={resetFilters}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-sidebar-border/70 border-b">
                                    <th className="px-3 py-3 font-medium">{t('Time')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Admin')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Event')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Record')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Changed fields')}</th>
                                    <th className="px-3 py-3 font-medium">{t('Details')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground px-3 py-10 text-center">
                                            {t('No audit logs found.')}
                                        </td>
                                    </tr>
                                ) : (
                                    auditLogs.data.map((log) => (
                                        <tr key={log.id} className="border-sidebar-border/70 border-b last:border-b-0">
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{formatDateTime(log.created_at)}</div>
                                                <div className="text-muted-foreground mt-1">{log.ip_address ?? t('No IP')}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{log.user_name ?? t('System')}</div>
                                                <div className="text-muted-foreground mt-1">{log.user_username ? `@${log.user_username}` : t('No username')}</div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <AuditEventBadge event={log.event} label={t(log.event_label)} />
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="font-medium">{t(log.auditable_label)}</div>
                                                <div className="text-muted-foreground mt-1">
                                                    {t('Record ID')} #{log.auditable_id ?? '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <div className="flex max-w-md flex-wrap gap-1.5">
                                                    {log.changed_fields.length === 0 ? (
                                                        <span className="text-muted-foreground">{t('No field details')}</span>
                                                    ) : (
                                                        log.changed_fields.slice(0, 8).map((field) => (
                                                            <Badge key={field} variant="outline">
                                                                {field}
                                                            </Badge>
                                                        ))
                                                    )}
                                                    {log.changed_fields.length > 8 ? <Badge variant="secondary">+{log.changed_fields.length - 8}</Badge> : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 align-top">
                                                <AuditDetails log={log} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-sm">
                            {t('Showing {from}-{to} of {total} audit logs', {
                                from: auditLogs.from ?? 0,
                                to: auditLogs.to ?? 0,
                                total: auditLogs.total,
                            })}
                        </p>
                        <Pagination links={auditLogs.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function AuditEventBadge({ event, label }: { event: string; label: string }) {
    const variant = event === 'deleted' ? 'destructive' : event === 'updated' ? 'secondary' : 'outline';

    return <Badge variant={variant}>{label}</Badge>;
}

function AuditDetails({ log }: { log: AuditLog }) {
    const { t } = useLocale();

    return (
        <details className="group max-w-lg">
            <summary className="text-primary cursor-pointer font-medium">{t('View changes')}</summary>
            <div className="border-sidebar-border/70 mt-3 grid gap-3 rounded-lg border p-3">
                <AuditValueBlock title={t('Old values')} values={log.old_values} />
                <AuditValueBlock title={t('New values')} values={log.new_values} />
            </div>
        </details>
    );
}

function AuditValueBlock({ title, values }: { title: string; values: Record<string, unknown> }) {
    const { t } = useLocale();
    const entries = Object.entries(values);

    return (
        <div>
            <div className="text-muted-foreground text-xs font-medium uppercase">{title}</div>
            {entries.length === 0 ? (
                <div className="text-muted-foreground mt-1 text-sm">{t('No values recorded')}</div>
            ) : (
                <dl className="mt-2 grid gap-2">
                    {entries.map(([key, value]) => (
                        <div key={key} className="grid gap-1">
                            <dt className="text-muted-foreground text-xs">{key}</dt>
                            <dd className="bg-muted/40 overflow-x-auto rounded-md px-2 py-1 font-mono text-xs">{formatAuditValue(value)}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}

function formatAuditValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '-';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return '-';
    }

    return value.replace('T', ' ').slice(0, 19);
}
