import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/hooks/use-locale';
import { localizeCountdownLabel } from '@/lib/translations';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ExpiryReminder, type PaginatedData, type SelectOption } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, RotateCcw, Search, TimerReset } from 'lucide-react';
import type React from 'react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reminders', href: '/reminders' }];

interface RemindersIndexProps {
    reminders: PaginatedData<ExpiryReminder>;
    filters: {
        search: string;
        status: string;
        timing: string;
    };
    statuses: SelectOption[];
    timings: SelectOption[];
    summary: {
        pending_total: number;
        overdue: number;
        due_today: number;
        next_7_days: number;
        handled: number;
        dismissed: number;
    };
}

export default function RemindersIndex({ reminders, filters, statuses, timings, summary }: RemindersIndexProps) {
    const { t, locale } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'pending');
    const [timing, setTiming] = useState(filters.timing ?? 'all');

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('reminders.index'), { search, status, timing }, { preserveState: true, replace: true });
    };

    const setQuickTiming = (nextTiming: string) => {
        setTiming(nextTiming);
        router.get(route('reminders.index'), { search, status, timing: nextTiming }, { preserveState: true, replace: true });
    };

    const patchReminder = (routeName: string, reminder: ExpiryReminder) => {
        router.patch(route(routeName, reminder.id), {}, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Reminders')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader title={t('Reminders')} description={t('Manage the reminder queue for subscriptions nearing expiry.')} />

                <FlashMessage />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <SummaryCard label={t('Pending')} value={summary.pending_total} icon={Clock3} />
                    <SummaryCard label={t('Overdue')} value={summary.overdue} icon={AlertTriangle} tone="danger" />
                    <SummaryCard label={t('Due today')} value={summary.due_today} icon={CalendarClock} tone="warning" />
                    <SummaryCard label={t('Next 7 days')} value={summary.next_7_days} icon={TimerReset} />
                    <SummaryCard label={t('Handled')} value={summary.handled} icon={CheckCircle2} tone="success" />
                    <SummaryCard label={t('Dismissed')} value={summary.dismissed} icon={RotateCcw} />
                </div>

                <div className="admin-surface space-y-4 rounded-lg border p-4">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ['needs_attention', 'Needs attention'],
                            ['overdue', 'Overdue'],
                            ['due_today', 'Due today'],
                            ['next_7', 'Next 7 days'],
                            ['all', 'All'],
                        ].map(([value, label]) => (
                            <Button
                                key={value}
                                type="button"
                                variant={timing === value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setQuickTiming(value)}
                            >
                                {t(label)}
                            </Button>
                        ))}
                    </div>

                    <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem_auto]">
                        <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                className="pl-9"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t('Search by customer, order, service, or reminder window')}
                            />
                        </div>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('All reminder statuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {t(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={timing} onValueChange={setTiming}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('All reminder windows')} />
                            </SelectTrigger>
                            <SelectContent>
                                {timings.map((option) => (
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
                            <Button type="button" variant="ghost" onClick={() => router.get(route('reminders.index'))}>
                                {t('Reset')}
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="space-y-3">
                    {reminders.data.length === 0 ? (
                        <div className="admin-surface text-muted-foreground rounded-lg border p-8 text-center">
                            {t('No reminders match the current filter.')}
                        </div>
                    ) : (
                        reminders.data.map((reminder) => (
                            <ReminderCard
                                key={reminder.id}
                                reminder={reminder}
                                locale={locale}
                                onHandle={() => patchReminder('reminders.handle', reminder)}
                                onSnooze={() => patchReminder('reminders.snooze', reminder)}
                                onDismiss={() => patchReminder('reminders.dismiss', reminder)}
                                onReopen={() => patchReminder('reminders.reopen', reminder)}
                            />
                        ))
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-sm">
                        {t('Showing {from}-{to} of {total} reminders', {
                            from: reminders.from ?? 0,
                            to: reminders.to ?? 0,
                            total: reminders.total,
                        })}
                    </p>
                    <Pagination links={reminders.links} />
                </div>
            </div>
        </AppLayout>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
    tone = 'default',
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    tone?: 'default' | 'danger' | 'warning' | 'success';
}) {
    return (
        <div className="admin-surface rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">{label}</p>
                <div
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border',
                        tone === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-400',
                        tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                        tone === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                        tone === 'default' && 'border-primary/25 bg-primary/10 text-primary',
                    )}
                >
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
        </div>
    );
}

function ReminderCard({
    reminder,
    locale,
    onHandle,
    onSnooze,
    onDismiss,
    onReopen,
}: {
    reminder: ExpiryReminder;
    locale: 'en' | 'ar';
    onHandle: () => void;
    onSnooze: () => void;
    onDismiss: () => void;
    onReopen: () => void;
}) {
    const { t } = useLocale();
    const isPending = reminder.status === 'pending';

    return (
        <article className="admin-surface rounded-lg border p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={timingVariant(reminder.timing_status)}>{t(reminder.timing_label, reminder.timing_replacements)}</Badge>
                        <Badge variant={reminder.status === 'dismissed' ? 'outline' : reminder.status === 'handled' ? 'default' : 'secondary'}>
                            {t(reminder.status_label)}
                        </Badge>
                        <Badge variant={countdownVariant(reminder.countdown_status)}>
                            {localizeCountdownLabel(locale, reminder.countdown_label)}
                        </Badge>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold">{reminder.customer_name ?? t('No customer')}</h3>
                        <p className="text-muted-foreground text-sm">
                            {reminder.service_name} · {reminder.internal_order_number}
                        </p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <Info label={t('Account')} value={reminder.account_identifier ?? '-'} />
                        <Info label={t('Reminder date')} value={reminder.reminder_date ?? '-'} />
                        <Info label={t('End date')} value={reminder.end_date ?? '-'} />
                        <Info label={t('Days before expiry')} value={String(reminder.days_before_expiry)} />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('customers.show', reminder.customer_id)}>{t('Customer')}</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('subscriptions.edit', reminder.subscription_id)}>{t('Edit subscription')}</Link>
                    </Button>
                    {isPending ? (
                        <>
                            <Button size="sm" onClick={onHandle}>
                                {t('Mark handled')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onSnooze}>
                                {t('Snooze 1 day')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onDismiss}>
                                {t('Dismiss')}
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={onReopen}>
                            {t('Reopen')}
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="admin-subsurface rounded-md border px-3 py-2">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 truncate font-medium">{value}</div>
        </div>
    );
}

function countdownVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'expired') {
        return 'destructive';
    }

    if (status === 'expiring_soon' || status === 'expiring_today') {
        return 'secondary';
    }

    return 'outline';
}

function timingVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'overdue') {
        return 'destructive';
    }

    if (status === 'due_today') {
        return 'default';
    }

    return 'outline';
}
