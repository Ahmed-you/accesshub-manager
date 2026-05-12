import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Customer, type SelectOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import CustomerForm, { type CustomerFormData } from './form';

interface EditCustomerProps {
    customer: Customer;
    currencies: SelectOption[];
}

interface TelegramLookupMatch {
    name: string;
    chat_id: string;
    entity_id: string | null;
    username: string | null;
    phone: string | null;
}

export default function EditCustomer({ customer, currencies }: EditCustomerProps) {
    const { t } = useLocale();
    const pageTitle = `${t('Edit')} ${customer.name}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Customers', href: '/customers' },
        { title: customer.name, href: `/customers/${customer.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm<CustomerFormData>({
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        preferred_currency: customer.preferred_currency,
        telegram_username: customer.telegram_username ?? '',
        telegram_chat_id: customer.telegram_chat_id ?? '',
        telegram_notifications_enabled: customer.telegram_notifications_enabled ?? false,
        notes: customer.notes ?? '',
    });
    const [telegramQuery, setTelegramQuery] = useState(customer.telegram_username || customer.name);
    const [telegramMatches, setTelegramMatches] = useState<TelegramLookupMatch[]>([]);
    const [telegramSearching, setTelegramSearching] = useState(false);
    const [telegramSaving, setTelegramSaving] = useState(false);
    const [telegramSearchError, setTelegramSearchError] = useState<string | null>(null);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('customers.update', customer.id));
    };

    useEffect(() => {
        const query = telegramQuery.trim();

        if (query.length < 2) {
            setTelegramMatches([]);
            setTelegramSearchError(null);
            setTelegramSearching(false);

            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            setTelegramSearching(true);
            setTelegramSearchError(null);

            fetch(`${route('customers.telegram-search', customer.id)}?${new URLSearchParams({ telegram_lookup_query: query })}`, {
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                signal: controller.signal,
            })
                .then(async (response) => {
                    const body = await response.json();

                    if (!response.ok) {
                        throw new Error(body.message || 'Telegram search failed.');
                    }

                    setTelegramMatches(body.matches || []);
                })
                .catch((error: Error) => {
                    if (error.name !== 'AbortError') {
                        setTelegramMatches([]);
                        setTelegramSearchError(error.message);
                    }
                })
                .finally(() => {
                    if (!controller.signal.aborted) {
                        setTelegramSearching(false);
                    }
                });
        }, 700);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [customer.id, telegramQuery]);

    const saveTelegramMatch = (match: TelegramLookupMatch) => {
        setTelegramSaving(true);
        setData('telegram_chat_id', match.chat_id);

        if (match.username) {
            setData('telegram_username', match.username);
        }

        setData('telegram_notifications_enabled', true);

        router.post(
            route('customers.telegram-lookup', customer.id),
            {
                telegram_selected_chat_id: match.chat_id,
                telegram_selected_username: match.username ?? '',
                telegram_selected_name: match.name,
                telegram_enable_notifications: true,
            },
            {
                preserveScroll: true,
                onFinish: () => setTelegramSaving(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={pageTitle}
                    description="Keep customer contact and currency preferences up to date for future orders."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={route('customers.index')}>{t('Back to customers')}</Link>
                        </Button>
                    }
                />

                <FlashMessage />

                <section className="border-sidebar-border/70 rounded-lg border p-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="font-medium">{t('Find Telegram ID automatically')}</h2>
                        <p className="text-muted-foreground text-sm">
                            {t('Search your existing Telegram chats and save the Telegram user/chat ID on this customer.')}
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="telegram_lookup_query">{t('Telegram lookup text')}</Label>
                            <Input
                                id="telegram_lookup_query"
                                value={telegramQuery}
                                onChange={(event) => setTelegramQuery(event.target.value)}
                                placeholder={t('Telegram name or @username')}
                            />
                            <InputError message={telegramSearchError ?? undefined} />
                            <p className="text-muted-foreground text-xs">
                                {t('This does not reveal hidden phone numbers. It uses the Telegram user/chat ID from your existing chat history.')}
                            </p>
                        </div>

                        <div className="border-sidebar-border/70 overflow-hidden rounded-lg border">
                            {telegramSearching ? (
                                <div className="text-muted-foreground px-4 py-3 text-sm">{t('Searching Telegram chats...')}</div>
                            ) : telegramMatches.length > 0 ? (
                                telegramMatches.map((match) => (
                                    <button
                                        key={`${match.chat_id}-${match.username ?? match.name}`}
                                        type="button"
                                        onClick={() => saveTelegramMatch(match)}
                                        disabled={telegramSaving}
                                        className="hover:bg-muted/60 focus:bg-muted/60 flex w-full items-center justify-between gap-4 border-b px-4 py-3 text-left last:border-b-0 disabled:opacity-60"
                                    >
                                        <span>
                                            <span className="block font-medium">{match.name}</span>
                                            <span className="text-muted-foreground block text-sm">
                                                {match.username ? `${match.username} · ` : ''}
                                                {t('Telegram ID')}: {match.chat_id}
                                            </span>
                                        </span>
                                        <span className="text-muted-foreground text-sm">{t('Save this chat')}</span>
                                    </button>
                                ))
                            ) : telegramQuery.trim().length >= 2 ? (
                                <div className="text-muted-foreground px-4 py-3 text-sm">{t('No Telegram matches yet.')}</div>
                            ) : (
                                <div className="text-muted-foreground px-4 py-3 text-sm">{t('Type at least 2 characters to search Telegram chats.')}</div>
                            )}
                        </div>
                    </div>
                </section>

                <CustomerForm
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
