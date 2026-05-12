import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/hooks/use-locale';
import { type SelectOption } from '@/types';
import { Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export interface CustomerFormData {
    name: string;
    email: string;
    phone: string;
    preferred_currency: string;
    telegram_username: string;
    telegram_chat_id: string;
    telegram_notifications_enabled: boolean;
    notes: string;
}

interface CustomerFormProps {
    data: CustomerFormData;
    setData: <K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) => void;
    errors: Partial<Record<keyof CustomerFormData, string>>;
    processing: boolean;
    currencies: SelectOption[];
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export default function CustomerForm({ data, setData, errors, processing, currencies, onSubmit, submitLabel }: CustomerFormProps) {
    const { t } = useLocale();

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('Customer name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            placeholder={t('Customer name')}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="preferred_currency">{t('Preferred currency')}</Label>
                        <Select value={data.preferred_currency} onValueChange={(value) => setData('preferred_currency', value)}>
                            <SelectTrigger id="preferred_currency">
                                <SelectValue placeholder={t('Select a currency')} />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies.map((currency) => (
                                    <SelectItem key={currency.value} value={currency.value}>
                                        {currency.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.preferred_currency} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('Email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(event) => setData('email', event.target.value)}
                            placeholder="customer@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t('Phone')}</Label>
                        <Input id="phone" value={data.phone} onChange={(event) => setData('phone', event.target.value)} placeholder="+972 ..." />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="telegram_username">{t('Telegram username')}</Label>
                        <Input
                            id="telegram_username"
                            value={data.telegram_username}
                            onChange={(event) => setData('telegram_username', event.target.value)}
                            placeholder="@customer"
                        />
                        <InputError message={errors.telegram_username} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="telegram_chat_id">{t('Telegram user/chat ID')}</Label>
                        <Input
                            id="telegram_chat_id"
                            value={data.telegram_chat_id}
                            onChange={(event) => setData('telegram_chat_id', event.target.value)}
                            placeholder="123456789"
                        />
                        <InputError message={errors.telegram_chat_id} />
                    </div>
                </div>

                <label className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                        checked={data.telegram_notifications_enabled}
                        onCheckedChange={(checked) => setData('telegram_notifications_enabled', checked === true)}
                    />
                    <span className="space-y-1">
                        <span className="block text-sm font-medium">{t('Enable Telegram renewal notifications')}</span>
                        <span className="text-muted-foreground block text-sm">
                            {t('Only enable this after the customer agrees to receive Telegram subscription reminders.')}
                        </span>
                    </span>
                </label>

                <div className="grid gap-2">
                    <Label htmlFor="notes">{t('Notes')}</Label>
                    <Textarea
                        id="notes"
                        value={data.notes}
                        onChange={(event) => setData('notes', event.target.value)}
                        placeholder={t('Internal customer notes')}
                    />
                    <InputError message={errors.notes} />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" variant="outline" asChild>
                    <Link href={route('customers.index')}>{t('Cancel')}</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    {t(submitLabel)}
                </Button>
            </div>
        </form>
    );
}
