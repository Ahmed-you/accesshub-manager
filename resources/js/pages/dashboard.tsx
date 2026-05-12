import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { localizeCountdownLabel } from '@/lib/translations';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface DashboardProps {
    stats: Array<{ label: string; value: string }>;
    modules: Array<{ name: string; status: string; href: string | null }>;
    expiringSoon: Array<{
        id: number;
        customer_id: number;
        internal_order_number: string;
        customer_name: string | null;
        service_name: string | null;
        end_date: string | null;
        countdown_status: string;
        countdown_label: string;
    }>;
    recentPayments: Array<{
        id: number;
        customer_id: number;
        customer_name: string | null;
        subscription_label: string | null;
        service_name: string | null;
        amount_original: string;
        currency: string;
        amount_usd: string;
        paid_at: string | null;
    }>;
}

export default function Dashboard({ stats, modules, expiringSoon, recentPayments }: DashboardProps) {
    const { t, locale } = useLocale();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AccessHub Manager" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-normal">{t('AccessHub Manager')}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">{t('USD-based subscription operations dashboard')}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    {stats.map((stat) => (
                        <div key={stat.label} className="border-sidebar-border/70 rounded-lg border p-4">
                            <div className="text-muted-foreground text-sm">{t(stat.label)}</div>
                            <div className="mt-2 text-2xl font-semibold">{stat.value}</div>
                        </div>
                    ))}
                </div>

                <div className="border-sidebar-border/70 rounded-lg border">
                    <div className="border-sidebar-border/70 border-b px-4 py-3">
                        <h2 className="font-medium">{t('Current modules')}</h2>
                    </div>
                    <div className="grid gap-0 md:grid-cols-2">
                        {modules.map((module) => (
                            <div
                                key={module.name}
                                className="border-sidebar-border/70 flex items-center justify-between border-b px-4 py-3 last:border-b-0 md:odd:border-r"
                            >
                                {module.href ? (
                                    <Link href={module.href} className="text-sm font-medium hover:underline">
                                        {t(module.name)}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-medium">{t(module.name)}</span>
                                )}
                                <span className="text-muted-foreground text-sm">{t(module.status)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className="border-sidebar-border/70 rounded-lg border">
                        <div className="border-sidebar-border/70 flex items-center justify-between border-b px-4 py-3">
                            <div>
                                <h2 className="font-medium">{t('Expiring soon subscriptions')}</h2>
                                <p className="text-muted-foreground mt-1 text-sm">{t('Review the next subscriptions that will need renewal or outreach.')}</p>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href="/reminders">{t('Reminders')}</Link>
                            </Button>
                        </div>

                        {expiringSoon.length === 0 ? (
                            <div className="text-muted-foreground px-4 py-8 text-sm">{t('No subscriptions are nearing expiry right now.')}</div>
                        ) : (
                            <div className="divide-sidebar-border/70 divide-y">
                                {expiringSoon.map((subscription) => (
                                    <div key={subscription.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                        <div className="min-w-0">
                                            <div className="font-medium">{subscription.internal_order_number}</div>
                                            <div className="text-muted-foreground mt-1 text-sm">
                                                {subscription.customer_name} - {subscription.service_name}
                                            </div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div>{localizeCountdownLabel(locale, subscription.countdown_label)}</div>
                                            <div className="text-muted-foreground mt-1">{subscription.end_date}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-sidebar-border/70 rounded-lg border">
                        <div className="border-sidebar-border/70 border-b px-4 py-3">
                            <h2 className="font-medium">{t('Recent payments')}</h2>
                            <p className="text-muted-foreground mt-1 text-sm">{t('Latest payments received across all customers and services.')}</p>
                        </div>

                        {recentPayments.length === 0 ? (
                            <div className="text-muted-foreground px-4 py-8 text-sm">{t('No payments recorded yet.')}</div>
                        ) : (
                            <div className="divide-sidebar-border/70 divide-y">
                                {recentPayments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                        <div className="min-w-0">
                                            <div className="font-medium">{payment.customer_name}</div>
                                            <div className="text-muted-foreground mt-1 text-sm">
                                                {payment.subscription_label} - {payment.service_name}
                                            </div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div>
                                                {payment.amount_original} {payment.currency}
                                            </div>
                                            <div className="text-muted-foreground mt-1">{payment.amount_usd} USD</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
