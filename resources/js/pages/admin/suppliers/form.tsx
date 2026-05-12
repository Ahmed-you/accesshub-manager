import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/hooks/use-locale';
import { Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export interface SupplierFormData {
    name: string;
    contact_name: string;
    email: string;
    phone: string;
    website: string;
    notes: string;
    active: boolean;
}

interface SupplierFormProps {
    data: SupplierFormData;
    setData: <K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) => void;
    errors: Partial<Record<keyof SupplierFormData, string>>;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export default function SupplierForm({ data, setData, errors, processing, onSubmit, submitLabel }: SupplierFormProps) {
    const { t } = useLocale();

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('Supplier name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            placeholder={t('Supplier name')}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="contact_name">{t('Contact name')}</Label>
                        <Input
                            id="contact_name"
                            value={data.contact_name}
                            onChange={(event) => setData('contact_name', event.target.value)}
                            placeholder={t('Primary contact')}
                        />
                        <InputError message={errors.contact_name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('Email')}</Label>
                        <Input id="email" type="email" value={data.email} onChange={(event) => setData('email', event.target.value)} />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t('Phone')}</Label>
                        <Input id="phone" value={data.phone} onChange={(event) => setData('phone', event.target.value)} />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="website">{t('Website')}</Label>
                        <Input
                            id="website"
                            value={data.website}
                            onChange={(event) => setData('website', event.target.value)}
                            placeholder="https://..."
                        />
                        <InputError message={errors.website} />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="notes">{t('Notes')}</Label>
                    <Textarea
                        id="notes"
                        value={data.notes}
                        onChange={(event) => setData('notes', event.target.value)}
                        placeholder={t('Supplier notes')}
                    />
                    <InputError message={errors.notes} />
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox id="active" checked={data.active} onCheckedChange={(checked) => setData('active', checked === true)} />
                    <div className="space-y-1">
                        <Label htmlFor="active">{t('Supplier is active')}</Label>
                        <p className="text-muted-foreground text-sm">
                            {t('Inactive suppliers stay in the system but are easy to filter out later.')}
                        </p>
                    </div>
                </div>
                <InputError message={errors.active} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" variant="outline" asChild>
                    <Link href={route('suppliers.index')}>{t('Cancel')}</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    {t(submitLabel)}
                </Button>
            </div>
        </form>
    );
}
