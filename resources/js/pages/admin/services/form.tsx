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
import { FormEventHandler, useEffect, useState } from 'react';

export interface ServiceFormData {
    name: string;
    category: string;
    description: string;
    default_duration_value: string;
    default_duration_unit: string;
    active: boolean;
    image: File | null;
    remove_image: boolean;
}

interface ServiceFormProps {
    data: ServiceFormData;
    setData: <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => void;
    errors: Partial<Record<keyof ServiceFormData, string>>;
    processing: boolean;
    durationUnits: SelectOption[];
    existingImageUrl?: string | null;
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export default function ServiceForm({
    data,
    setData,
    errors,
    processing,
    durationUnits,
    existingImageUrl = null,
    onSubmit,
    submitLabel,
}: ServiceFormProps) {
    const { t } = useLocale();
    const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl);

    useEffect(() => {
        if (data.remove_image) {
            setPreviewUrl(null);
            return;
        }

        if (data.image) {
            const objectUrl = URL.createObjectURL(data.image);
            setPreviewUrl(objectUrl);

            return () => URL.revokeObjectURL(objectUrl);
        }

        setPreviewUrl(existingImageUrl);
    }, [data.image, data.remove_image, existingImageUrl]);

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="border-sidebar-border/70 grid gap-6 rounded-lg border p-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="grid gap-2">
                        <Label htmlFor="image">{t('Service image')}</Label>
                        <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                                setData('image', event.target.files?.[0] ?? null);
                                setData('remove_image', false);
                            }}
                        />
                        <p className="text-muted-foreground text-sm">{t('Optional image used in the service catalog and subscription forms.')}</p>
                        <InputError message={errors.image} />

                        {existingImageUrl ? (
                            <label className="mt-2 flex items-start gap-3 rounded-lg border p-3">
                                <Checkbox checked={data.remove_image} onCheckedChange={(checked) => setData('remove_image', checked === true)} />
                                <div className="space-y-1">
                                    <div className="text-sm font-medium">{t('Remove current image')}</div>
                                    <div className="text-muted-foreground text-sm">
                                        {t('Use this if the service should go back to a text-only card.')}
                                    </div>
                                </div>
                            </label>
                        ) : null}
                        <InputError message={errors.remove_image} />
                    </div>

                    <div className="border-sidebar-border/70 flex min-h-48 items-center justify-center rounded-lg border bg-black/5 p-4 dark:bg-white/5">
                        {previewUrl ? (
                            <img src={previewUrl} alt={data.name || 'Service preview'} className="max-h-40 rounded-md object-contain" />
                        ) : (
                            <div className="text-muted-foreground text-center text-sm">{t('Image preview will appear here')}</div>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('Service name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            placeholder="Netflix, Canva, VPN..."
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category">{t('Category')}</Label>
                        <Input
                            id="category"
                            value={data.category}
                            onChange={(event) => setData('category', event.target.value)}
                            placeholder={t('Streaming, AI tools, productivity')}
                        />
                        <InputError message={errors.category} />
                    </div>

                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="description">{t('Description')}</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(event) => setData('description', event.target.value)}
                            placeholder={t('Short internal description for admins')}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="default_duration_value">{t('Default duration')}</Label>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                            <Input
                                id="default_duration_value"
                                type="number"
                                min="1"
                                value={data.default_duration_value}
                                onChange={(event) => setData('default_duration_value', event.target.value)}
                                placeholder="30"
                            />
                            <Select value={data.default_duration_unit} onValueChange={(value) => setData('default_duration_unit', value)}>
                                <SelectTrigger id="default_duration_unit">
                                    <SelectValue placeholder={t('Select duration unit')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {durationUnits.map((durationUnit) => (
                                        <SelectItem key={durationUnit.value} value={durationUnit.value}>
                                            {t(durationUnit.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-muted-foreground text-sm">{t('Use months for long subscriptions like 12 or 30 months.')}</p>
                        <InputError message={errors.default_duration_value || errors.default_duration_unit} />
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox id="active" checked={data.active} onCheckedChange={(checked) => setData('active', checked === true)} />
                    <div className="space-y-1">
                        <Label htmlFor="active">{t('Service is active')}</Label>
                        <p className="text-muted-foreground text-sm">
                            {t('Inactive services remain available in history but can be kept out of new orders.')}
                        </p>
                    </div>
                </div>
                <InputError message={errors.active} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" variant="outline" asChild>
                    <Link href={route('services.index')}>{t('Cancel')}</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    {t(submitLabel)}
                </Button>
            </div>
        </form>
    );
}
