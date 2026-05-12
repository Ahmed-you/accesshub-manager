import FlashMessage from '@/components/admin/flash-message';
import PageHeader from '@/components/admin/page-header';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SelectOption } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { Children, FormEventHandler, useState, type ReactNode } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Telegram automation', href: '/automation/telegram' }];
const ALL_ALLOWED_TARGETS = '__all_allowed_targets__';

interface TelegramTarget {
    id: number;
    name: string;
    target_type: string;
    target_identifier: string;
    permission_status: string;
    active: boolean;
    posting_hours: string | null;
    daily_limit: number;
    last_queued_at: string | null;
    notes: string | null;
}

interface MessageTemplate {
    id: number;
    name: string;
    purpose: string;
    body: string;
    source_message_ref: string | null;
    active: boolean;
    notes: string | null;
}

interface AutomationDelivery {
    id: number;
    purpose: string;
    target_type: string;
    target_identifier: string;
    template_name: string | null;
    target_name: string | null;
    customer_name: string | null;
    subscription_label: string | null;
    service_name: string | null;
    status: string;
    scheduled_for: string | null;
    sent_at: string | null;
    error_message: string | null;
}

interface TelegramCampaign {
    id: number;
    name: string;
    message_template_id: number;
    telegram_target_id: number;
    template_name: string | null;
    target_name: string | null;
    schedule_times: string;
    daily_limit: number;
    active: boolean;
    last_queued_for: string | null;
    notes: string | null;
}

interface Paginated<T> {
    data: T[];
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface TelegramAutomationProps {
    summary: ArrayLikeSummary;
    targets: TelegramTarget[];
    templates: MessageTemplate[];
    campaigns: TelegramCampaign[];
    deliveries: Paginated<AutomationDelivery>;
    options: {
        customers: CustomerOption[];
        targetTypes: SelectOption[];
        permissionStatuses: SelectOption[];
        templatePurposes: SelectOption[];
    };
}

interface CustomerOption extends SelectOption {
    target_identifier: string | null;
    notifications_enabled: boolean;
}

interface ArrayLikeSummary {
    linked_customers: string;
    active_targets: string;
    active_templates: string;
    active_campaigns: string;
    queued_deliveries: string;
    due_marketing_deliveries: string;
    marketing_autosend_enabled: boolean;
    marketing_send_limit: string;
}

export default function TelegramAutomationIndex({ summary, targets, templates, campaigns, deliveries, options }: TelegramAutomationProps) {
    const { t } = useLocale();
    const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{ url: string; title: string; description: string } | null>(null);
    const [scheduleStart, setScheduleStart] = useState('09:30');
    const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState('60');
    const [scheduleIntervalPattern, setScheduleIntervalPattern] = useState('15,65,40,70');
    const [scheduleCount, setScheduleCount] = useState('5');
    const marketingTemplates = templates.filter((template) => template.purpose === 'marketing' && template.active);
    const allowedTargets = targets.filter((target) => target.active && target.permission_status === 'allowed');
    const allowedTargetOptions = allowedTargets.map((target) => ({
        value: String(target.id),
        label: `${target.name} - ${target.target_identifier}`,
    }));

    const targetForm = useForm({
        name: '',
        target_type: 'group',
        target_identifier: '',
        permission_status: 'allowed',
        posting_hours: '9:00,12:00,15:00,18:00,21:00',
        daily_limit: '5',
        active: true,
        notes: '',
    });
    const templateForm = useForm({
        name: '',
        purpose: 'marketing',
        body: '',
        source_message_ref: '',
        active: true,
        notes: '',
    });
    const campaignForm = useForm({
        message_template_id: '',
        telegram_target_id: ALL_ALLOWED_TARGETS,
        schedule_mode: 'today',
        send_count: '5',
    });
    const sendQueuedForm = useForm({
        purpose: 'marketing',
        limit: '10',
    });
    const routineForm = useForm({
        name: '',
        message_template_id: '',
        telegram_target_id: '',
        schedule_times: '09:30,10:30,11:30,12:30,13:30',
        daily_limit: '5',
        active: true,
        notes: '',
    });

    const submitTarget: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                targetForm.reset();
                setEditingTargetId(null);
            },
        };

        if (editingTargetId) {
            targetForm.transform((data) => ({ ...data, _method: 'put' })).post(route('automation.telegram.targets.update', editingTargetId), options);
            return;
        }

        targetForm.post(route('automation.telegram.targets.store'), options);
    };

    const submitTemplate: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                templateForm.reset();
                setEditingTemplateId(null);
            },
        };

        if (editingTemplateId) {
            templateForm
                .transform((data) => ({ ...data, _method: 'put' }))
                .post(route('automation.telegram.templates.update', editingTemplateId), options);
            return;
        }

        templateForm.post(route('automation.telegram.templates.store'), options);
    };

    const queueCampaign: FormEventHandler = (event) => {
        event.preventDefault();
        campaignForm.transform((data) => ({
            ...data,
            telegram_target_id: data.telegram_target_id === ALL_ALLOWED_TARGETS ? '' : data.telegram_target_id,
            send_count: data.schedule_mode === 'now' ? '1' : data.send_count,
        }));
        campaignForm.post(route('automation.telegram.queue-marketing'), {
            preserveScroll: true,
            onFinish: () => campaignForm.transform((data) => data),
        });
    };

    const sendDueMarketing: FormEventHandler = (event) => {
        event.preventDefault();
        sendQueuedForm.post(route('automation.telegram.send-queued'), { preserveScroll: true });
    };

    const submitRoutine: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                routineForm.reset();
                setEditingCampaignId(null);
            },
        };

        if (editingCampaignId) {
            routineForm.transform((data) => ({ ...data, _method: 'put' })).post(route('automation.telegram.campaigns.update', editingCampaignId), options);
            return;
        }

        routineForm.post(route('automation.telegram.campaigns.store'), options);
    };

    const generateIntervalTimes = () => {
        const [startHour = '9', startMinute = '30'] = scheduleStart.split(':');
        const total = Math.max(1, Math.min(24, Number(scheduleCount) || 1));
        const intervalPattern = scheduleIntervalPattern
            .split(',')
            .map((item) => Math.max(5, Math.min(1440, Number(item.trim()) || 0)))
            .filter((item) => item > 0);
        const fixedInterval = Math.max(5, Math.min(1440, Number(scheduleIntervalMinutes) || 60));
        const start = (Number(startHour) * 60 + Number(startMinute)) % 1440;
        let cursor = start;
        const times = Array.from({ length: total }, (_, index) => {
            if (index > 0) {
                cursor = (cursor + (intervalPattern[index - 1] ?? fixedInterval)) % 1440;
            }

            const minutes = cursor;
            const hour = Math.floor(minutes / 60)
                .toString()
                .padStart(2, '0');
            const minute = (minutes % 60).toString().padStart(2, '0');

            return `${hour}:${minute}`;
        });

        routineForm.setData('schedule_times', times.join(','));
        routineForm.setData('daily_limit', String(total));
    };

    const editTarget = (target: TelegramTarget) => {
        setEditingTargetId(target.id);
        targetForm.setData({
            name: target.name,
            target_type: target.target_type,
            target_identifier: target.target_identifier,
            permission_status: target.permission_status,
            posting_hours: target.posting_hours ?? '',
            daily_limit: String(target.daily_limit),
            active: target.active,
            notes: target.notes ?? '',
        });
    };

    const editTemplate = (template: MessageTemplate) => {
        setEditingTemplateId(template.id);
        templateForm.setData({
            name: template.name,
            purpose: template.purpose,
            body: template.body,
            source_message_ref: template.source_message_ref ?? '',
            active: template.active,
            notes: template.notes ?? '',
        });
    };

    const editCampaign = (campaign: TelegramCampaign) => {
        setEditingCampaignId(campaign.id);
        routineForm.setData({
            name: campaign.name,
            message_template_id: String(campaign.message_template_id),
            telegram_target_id: String(campaign.telegram_target_id),
            schedule_times: campaign.schedule_times,
            daily_limit: String(campaign.daily_limit),
            active: campaign.active,
            notes: campaign.notes ?? '',
        });
    };

    const closeTargetEdit = () => {
        setEditingTargetId(null);
        targetForm.reset();
    };

    const closeTemplateEdit = () => {
        setEditingTemplateId(null);
        templateForm.reset();
    };

    const closeCampaignEdit = () => {
        setEditingCampaignId(null);
        routineForm.reset();
    };

    const openDeleteDialog = (url: string, title: string, description: string) => {
        setDeleteDialog({ url, title, description });
    };

    const confirmDelete = () => {
        if (!deleteDialog) {
            return;
        }

        router.delete(deleteDialog.url, {
            preserveScroll: true,
            onFinish: () => setDeleteDialog(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Telegram automation')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title={t('Telegram automation')}
                    description={t('Copy premium Telegram posts from your source channel and schedule them to allowed destinations.')}
                />

                <FlashMessage />

                <div
                    className={`rounded-lg border p-4 ${
                        summary.marketing_autosend_enabled
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    }`}
                >
                    <div className="font-medium">
                        {summary.marketing_autosend_enabled ? t('Telegram autosend is enabled') : t('Telegram autosend is paused')}
                    </div>
                    <div className="mt-1 text-sm opacity-90">
                        {summary.marketing_autosend_enabled
                            ? t('Due marketing messages can be sent by the scheduler, capped by the safety limit.')
                            : t('Scheduled marketing messages will stay queued until you click Send due now manually or enable autosend.')}
                    </div>
                    <div className="mt-2 text-sm">
                        {t('Due now')}: {summary.due_marketing_deliveries} - {t('Safety limit')}: {summary.marketing_send_limit}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label={t('Linked Telegram customers')} value={summary.linked_customers} />
                    <SummaryCard label={t('Allowed destinations')} value={summary.active_targets} />
                    <SummaryCard label={t('Saved source posts')} value={summary.active_templates} />
                    <SummaryCard label={t('Daily routines')} value={summary.active_campaigns} />
                    <SummaryCard label={t('Queued sends')} value={summary.queued_deliveries} />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                    <StepSection
                        number="1"
                        title={t('Destination')}
                        description={t('Save the Telegram group, channel, or user that can receive your ads.')}
                    >
                        <form onSubmit={submitTarget} className="grid gap-4">
                            <Field label={t('Destination name')} error={targetForm.errors.name}>
                                <Input value={targetForm.data.name} onChange={(event) => targetForm.setData('name', event.target.value)} />
                            </Field>

                            <div className="grid gap-4">
                                <Field label={t('Type')}>
                                    <Select value={targetForm.data.target_type} onValueChange={(value) => targetForm.setData('target_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.targetTypes.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {t(option.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label={t('Permission')}>
                                    <Select
                                        value={targetForm.data.permission_status}
                                        onValueChange={(value) => targetForm.setData('permission_status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.permissionStatuses.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {t(option.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>

                            <Field label={t('Telegram link, username, or chat ID')} error={targetForm.errors.target_identifier}>
                                <Input
                                    value={targetForm.data.target_identifier}
                                    onChange={(event) => targetForm.setData('target_identifier', event.target.value)}
                                    placeholder="@groupname or -1001234567890"
                                />
                            </Field>

                            <div className="grid gap-4">
                                <Field label={t('Posting times')}>
                                    <TimeChipEditor
                                        value={targetForm.data.posting_hours}
                                        onChange={(value) => targetForm.setData('posting_hours', value)}
                                        addLabel={t('Add time')}
                                        emptyText={t('No times yet.')}
                                        removeLabel={t('Remove time')}
                                        compact
                                    />
                                    <p className="text-muted-foreground text-sm">
                                        {t('Use 24-hour times. Old hour-only values like 10 still work.')}
                                    </p>
                                </Field>

                                <Field label={t('Daily safety limit')}>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="24"
                                        value={targetForm.data.daily_limit}
                                        onChange={(event) => targetForm.setData('daily_limit', event.target.value)}
                                    />
                                </Field>
                            </div>

                            <Field label={t('Notes')}>
                                <Textarea value={targetForm.data.notes} onChange={(event) => targetForm.setData('notes', event.target.value)} />
                            </Field>

                            <div className="flex justify-end gap-2">
                                <Button type="submit" disabled={targetForm.processing}>
                                    {t('Save destination')}
                                </Button>
                            </div>
                        </form>
                    </StepSection>

                    <StepSection
                        number="2"
                        title={t('Source post')}
                        description={t('Paste the exact Telegram post link that contains your premium ad content.')}
                    >
                        <form onSubmit={submitTemplate} className="grid gap-4">
                            <Field label={t('Source post name')} error={templateForm.errors.name}>
                                <Input value={templateForm.data.name} onChange={(event) => templateForm.setData('name', event.target.value)} />
                            </Field>

                            <Field label={t('Purpose')}>
                                <Select value={templateForm.data.purpose} onValueChange={(value) => templateForm.setData('purpose', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="marketing">{t('Marketing')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label={t('Telegram source message')} error={templateForm.errors.source_message_ref}>
                                <Input
                                    value={templateForm.data.source_message_ref}
                                    onChange={(event) => templateForm.setData('source_message_ref', event.target.value)}
                                    placeholder="https://t.me/c/1234567890/45"
                                />
                            </Field>

                            <Field label={t('Fallback note')} error={templateForm.errors.body}>
                                <Textarea
                                    value={templateForm.data.body}
                                    onChange={(event) => templateForm.setData('body', event.target.value)}
                                    placeholder={t('Optional note for admins. Telegram content is copied from the source post.')}
                                    className="min-h-28"
                                />
                            </Field>

                            <div className="flex justify-end gap-2">
                                <Button type="submit" disabled={templateForm.processing}>
                                    {t('Save source post')}
                                </Button>
                            </div>
                        </form>
                    </StepSection>

                    <StepSection
                        number="3"
                        title={t('Schedule')}
                        description={t('Choose the source post and destination, then queue one send or several sends today.')}
                    >
                        <form onSubmit={queueCampaign} className="grid gap-4">
                            <Field label={t('Source post')} error={campaignForm.errors.message_template_id}>
                                <Select
                                    value={campaignForm.data.message_template_id}
                                    onValueChange={(value) => campaignForm.setData('message_template_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select source post')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {marketingTemplates.map((template) => (
                                            <SelectItem key={template.id} value={String(template.id)}>
                                                {template.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label={t('Destination')} error={campaignForm.errors.telegram_target_id}>
                                <SearchableSelect
                                    value={campaignForm.data.telegram_target_id}
                                    options={[{ value: ALL_ALLOWED_TARGETS, label: t('All allowed destinations') }, ...allowedTargetOptions]}
                                    onValueChange={(value) => campaignForm.setData('telegram_target_id', value)}
                                    placeholder={t('Select destination')}
                                    searchPlaceholder={t('Search Telegram destinations')}
                                    emptyText={t('No matching Telegram destinations')}
                                />
                            </Field>

                            <div className="grid gap-4">
                                <Field label={t('Send mode')}>
                                    <Select
                                        value={campaignForm.data.schedule_mode}
                                        onValueChange={(value) => campaignForm.setData('schedule_mode', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="today">{t('Schedule today')}</SelectItem>
                                            <SelectItem value="now">{t('Send once now')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label={t('Times today')} error={campaignForm.errors.send_count}>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="10"
                                        disabled={campaignForm.data.schedule_mode === 'now'}
                                        value={campaignForm.data.schedule_mode === 'now' ? '1' : campaignForm.data.send_count}
                                        onChange={(event) => campaignForm.setData('send_count', event.target.value)}
                                    />
                                </Field>
                            </div>

                            <Button
                                type="submit"
                                disabled={campaignForm.processing || marketingTemplates.length === 0 || allowedTargetOptions.length === 0}
                            >
                                {t('Queue campaign')}
                            </Button>
                        </form>

                        <form
                            onSubmit={sendDueMarketing}
                            className="border-sidebar-border/70 mt-5 grid gap-3 border-t pt-5 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                            <Field label={t('Due sends limit')}>
                                <Input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={sendQueuedForm.data.limit}
                                    onChange={(event) => sendQueuedForm.setData('limit', event.target.value)}
                                />
                            </Field>
                            <Button type="submit" variant="outline" className="self-end" disabled={sendQueuedForm.processing}>
                                {t('Send due now manually')}
                            </Button>
                            <p className="text-muted-foreground sm:col-span-2 text-sm">
                                {t('This button sends only queued messages that are already due. The background scheduler stays paused.')}
                            </p>
                        </form>
                    </StepSection>
                </div>

                <section className="admin-surface rounded-lg border p-4">
                    <div className="mb-5">
                        <h2 className="font-medium">{t('Daily routine')}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {t('Save a recurring daily campaign. The scheduler queues future sends for the saved times every day.')}
                        </p>
                    </div>

                    <div className="admin-subsurface mb-5 grid gap-4 rounded-lg border p-4 lg:grid-cols-4">
                        <Field label={t('Start time')}>
                            <Input type="time" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
                        </Field>
                        <Field label={t('Default gap minutes')}>
                            <Input
                                type="number"
                                min="5"
                                max="1440"
                                value={scheduleIntervalMinutes}
                                onChange={(event) => setScheduleIntervalMinutes(event.target.value)}
                            />
                        </Field>
                        <Field label={t('Custom gaps')}>
                            <Input
                                value={scheduleIntervalPattern}
                                onChange={(event) => setScheduleIntervalPattern(event.target.value)}
                                placeholder="15,65,40,70"
                            />
                        </Field>
                        <Field label={t('Messages')}>
                            <Input type="number" min="1" max="24" value={scheduleCount} onChange={(event) => setScheduleCount(event.target.value)} />
                        </Field>
                        <Button type="button" variant="outline" className="lg:col-span-4" onClick={generateIntervalTimes}>
                            {t('Generate varied schedule')}
                        </Button>
                    </div>

                    <form onSubmit={submitRoutine} className="grid gap-4 lg:grid-cols-2">
                        <Field label={t('Routine name')} error={routineForm.errors.name}>
                            <Input value={routineForm.data.name} onChange={(event) => routineForm.setData('name', event.target.value)} />
                        </Field>
                        <Field label={t('Source post')} error={routineForm.errors.message_template_id}>
                            <Select
                                value={routineForm.data.message_template_id}
                                onValueChange={(value) => routineForm.setData('message_template_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select source post')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {marketingTemplates.map((template) => (
                                        <SelectItem key={template.id} value={String(template.id)}>
                                            {template.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t('Destination')} error={routineForm.errors.telegram_target_id}>
                            <SearchableSelect
                                value={routineForm.data.telegram_target_id}
                                options={allowedTargetOptions}
                                onValueChange={(value) => routineForm.setData('telegram_target_id', value)}
                                placeholder={t('Select destination')}
                                searchPlaceholder={t('Search Telegram destinations')}
                                emptyText={t('No matching Telegram destinations')}
                            />
                        </Field>
                        <Field label={t('Daily times')} error={routineForm.errors.schedule_times}>
                            <TimeChipEditor
                                value={routineForm.data.schedule_times}
                                onChange={(value) => routineForm.setData('schedule_times', value)}
                                addLabel={t('Add time')}
                                emptyText={t('No times yet.')}
                                removeLabel={t('Remove time')}
                            />
                        </Field>
                        <Field label={t('Daily limit')} error={routineForm.errors.daily_limit}>
                            <Input
                                type="number"
                                min="1"
                                max="24"
                                value={routineForm.data.daily_limit}
                                onChange={(event) => routineForm.setData('daily_limit', event.target.value)}
                            />
                        </Field>
                        <Field label={t('Notes')}>
                            <Textarea value={routineForm.data.notes} onChange={(event) => routineForm.setData('notes', event.target.value)} />
                        </Field>
                        <label className="admin-subsurface flex items-center gap-3 rounded-lg border p-3">
                            <input
                                type="checkbox"
                                checked={routineForm.data.active}
                                onChange={(event) => routineForm.setData('active', event.target.checked)}
                            />
                            <span>{t('Routine is active')}</span>
                        </label>
                        <div className="flex justify-end gap-2 lg:col-span-2">
                            <Button type="submit" disabled={routineForm.processing}>
                                {t('Save daily routine')}
                            </Button>
                        </div>
                    </form>
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                    <AutomationList title={t('Saved destinations')} emptyText={t('No Telegram destinations yet.')}>
                        {allowedTargets.map((target) => (
                            <div key={target.id} className="border-sidebar-border/70 border-b p-4 last:border-b-0">
                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <div className="min-w-0">
                                        <div className="font-medium">{target.name}</div>
                                        <div className="text-muted-foreground mt-1 text-sm break-all">{target.target_identifier}</div>
                                    </div>
                                    <div className="grid gap-3 md:min-w-72 md:justify-items-end">
                                        <TimePreview value={target.posting_hours ?? ''} emptyText={t('Auto times')} />
                                        <div className="text-muted-foreground text-sm">
                                            {t('Limit')} <span className="text-foreground font-medium">{target.daily_limit}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 md:flex">
                                            <Button type="button" variant="outline" onClick={() => editTarget(target)}>
                                                {t('Edit')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    openDeleteDialog(
                                                        route('automation.telegram.targets.destroy', target.id),
                                                        t('Delete destination'),
                                                        t('This destination will be removed from Telegram automation.'),
                                                    )
                                                }
                                            >
                                                {t('Delete')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </AutomationList>

                    <AutomationList title={t('Saved source posts')} emptyText={t('No Telegram source posts yet.')}>
                        {marketingTemplates.map((template) => (
                            <div key={template.id} className="border-sidebar-border/70 border-b p-4 last:border-b-0">
                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <div className="min-w-0">
                                        <div className="font-medium">{template.name}</div>
                                        <div className="text-muted-foreground mt-1 text-sm break-all">{template.source_message_ref || template.body}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 md:flex">
                                        <Button type="button" variant="outline" onClick={() => editTemplate(template)}>
                                            {t('Edit')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                openDeleteDialog(
                                                    route('automation.telegram.templates.destroy', template.id),
                                                    t('Delete source post'),
                                                    t('This source post will be removed from Telegram automation.'),
                                                )
                                            }
                                        >
                                            {t('Delete')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </AutomationList>
                </div>

                <AutomationList title={t('Daily routines')} emptyText={t('No daily routines yet.')}>
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="border-sidebar-border/70 border-b p-4 last:border-b-0">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="min-w-0">
                                    <div className="font-medium">{campaign.name}</div>
                                    <div className="text-muted-foreground mt-1 text-sm">
                                        {campaign.template_name} - {campaign.target_name}
                                    </div>
                                    <div className="mt-3">
                                        <TimePreview value={campaign.schedule_times} emptyText={t('No times yet.')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 lg:flex lg:self-start">
                                    <Button type="button" variant="outline" onClick={() => editCampaign(campaign)}>
                                        {t('Edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            openDeleteDialog(
                                                route('automation.telegram.campaigns.destroy', campaign.id),
                                                t('Delete daily routine'),
                                                t('This daily routine will stop creating future Telegram sends.'),
                                            )
                                        }
                                    >
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </AutomationList>

                <AutomationList title={t('Recent Telegram sends')} emptyText={t('No Telegram sends yet.')}>
                    {deliveries.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] table-fixed text-left text-sm">
                                <thead className="text-muted-foreground">
                                    <tr className="border-sidebar-border/70 border-b">
                                        <th className="w-[13%] px-4 py-3 font-medium">{t('Status')}</th>
                                        <th className="w-[20%] px-4 py-3 font-medium">{t('Destination')}</th>
                                        <th className="w-[20%] px-4 py-3 font-medium">{t('Source post')}</th>
                                        <th className="w-[17%] px-4 py-3 font-medium">{t('Scheduled for')}</th>
                                        <th className="w-[22%] px-4 py-3 font-medium">{t('Result')}</th>
                                        <th className="w-[8%] px-4 py-3 font-medium">{t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveries.data.map((delivery) => (
                                        <tr key={delivery.id} className="border-sidebar-border/70 border-b align-top last:border-b-0">
                                            <td className="px-4 py-3">
                                                <StatusBadge status={delivery.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{delivery.target_name ?? delivery.target_type}</div>
                                                <div className="text-muted-foreground mt-1 break-all">{delivery.target_identifier}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>{delivery.template_name ?? '-'}</div>
                                                <div className="text-muted-foreground mt-1">{t(delivery.purpose)}</div>
                                            </td>
                                            <td className="px-4 py-3">{delivery.scheduled_for ?? '-'}</td>
                                            <td className="px-4 py-3">
                                                {delivery.error_message ? (
                                                    <div className="text-destructive break-words">{delivery.error_message}</div>
                                                ) : delivery.sent_at ? (
                                                    <div>
                                                        {t('Sent at')} {delivery.sent_at}
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground">{t('Waiting')}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        openDeleteDialog(
                                                            route('automation.telegram.deliveries.destroy', delivery.id),
                                                            t('Delete send history'),
                                                            t('This queued or historical send row will be removed.'),
                                                        )
                                                    }
                                                >
                                                    {t('Delete')}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                    {deliveries.links.length > 3 ? (
                        <div className="flex flex-wrap gap-2 px-4 py-3">
                            {deliveries.links.map((link, index) => (
                                <Button
                                    key={`${link.label}-${index}`}
                                    type="button"
                                    variant={link.active ? 'default' : 'outline'}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    ) : null}
                </AutomationList>

                <Dialog open={editingTargetId !== null} onOpenChange={(open) => !open && closeTargetEdit()}>
                    <DialogContent className="admin-surface max-h-[90vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('Edit destination')}</DialogTitle>
                            <DialogDescription>{t('Update this Telegram destination without leaving the list.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitTarget} className="grid gap-4">
                            <Field label={t('Destination name')} error={targetForm.errors.name}>
                                <Input value={targetForm.data.name} onChange={(event) => targetForm.setData('name', event.target.value)} />
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('Type')}>
                                    <Select value={targetForm.data.target_type} onValueChange={(value) => targetForm.setData('target_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.targetTypes.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {t(option.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label={t('Permission')}>
                                    <Select
                                        value={targetForm.data.permission_status}
                                        onValueChange={(value) => targetForm.setData('permission_status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.permissionStatuses.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {t(option.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>

                            <Field label={t('Telegram link, username, or chat ID')} error={targetForm.errors.target_identifier}>
                                <Input
                                    value={targetForm.data.target_identifier}
                                    onChange={(event) => targetForm.setData('target_identifier', event.target.value)}
                                />
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('Posting times')}>
                                    <TimeChipEditor
                                        value={targetForm.data.posting_hours}
                                        onChange={(value) => targetForm.setData('posting_hours', value)}
                                        addLabel={t('Add time')}
                                        emptyText={t('No times yet.')}
                                        removeLabel={t('Remove time')}
                                    />
                                </Field>
                                <Field label={t('Daily safety limit')}>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="24"
                                        value={targetForm.data.daily_limit}
                                        onChange={(event) => targetForm.setData('daily_limit', event.target.value)}
                                    />
                                </Field>
                            </div>

                            <Field label={t('Notes')}>
                                <Textarea value={targetForm.data.notes} onChange={(event) => targetForm.setData('notes', event.target.value)} />
                            </Field>

                            <DialogFooter className="gap-2 sm:space-x-0">
                                <Button type="button" variant="outline" onClick={closeTargetEdit}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={targetForm.processing}>
                                    {t('Save destination changes')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={editingTemplateId !== null} onOpenChange={(open) => !open && closeTemplateEdit()}>
                    <DialogContent className="admin-surface max-h-[90vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('Edit source post')}</DialogTitle>
                            <DialogDescription>{t('Update the saved Telegram source post used by campaigns.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitTemplate} className="grid gap-4">
                            <Field label={t('Source post name')} error={templateForm.errors.name}>
                                <Input value={templateForm.data.name} onChange={(event) => templateForm.setData('name', event.target.value)} />
                            </Field>

                            <Field label={t('Purpose')}>
                                <Select value={templateForm.data.purpose} onValueChange={(value) => templateForm.setData('purpose', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="marketing">{t('Marketing')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label={t('Telegram source message')} error={templateForm.errors.source_message_ref}>
                                <Input
                                    value={templateForm.data.source_message_ref}
                                    onChange={(event) => templateForm.setData('source_message_ref', event.target.value)}
                                />
                            </Field>

                            <Field label={t('Fallback note')} error={templateForm.errors.body}>
                                <Textarea value={templateForm.data.body} onChange={(event) => templateForm.setData('body', event.target.value)} />
                            </Field>

                            <DialogFooter className="gap-2 sm:space-x-0">
                                <Button type="button" variant="outline" onClick={closeTemplateEdit}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={templateForm.processing}>
                                    {t('Save source post changes')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={editingCampaignId !== null} onOpenChange={(open) => !open && closeCampaignEdit()}>
                    <DialogContent className="admin-surface max-h-[90vh] max-w-3xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('Edit daily routine')}</DialogTitle>
                            <DialogDescription>{t('Change the source, destination, and saved daily send times.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitRoutine} className="grid gap-4 lg:grid-cols-2">
                            <Field label={t('Routine name')} error={routineForm.errors.name}>
                                <Input value={routineForm.data.name} onChange={(event) => routineForm.setData('name', event.target.value)} />
                            </Field>

                            <Field label={t('Source post')} error={routineForm.errors.message_template_id}>
                                <Select
                                    value={routineForm.data.message_template_id}
                                    onValueChange={(value) => routineForm.setData('message_template_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select source post')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {marketingTemplates.map((template) => (
                                            <SelectItem key={template.id} value={String(template.id)}>
                                                {template.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label={t('Destination')} error={routineForm.errors.telegram_target_id}>
                                <SearchableSelect
                                    value={routineForm.data.telegram_target_id}
                                    options={allowedTargetOptions}
                                    onValueChange={(value) => routineForm.setData('telegram_target_id', value)}
                                    placeholder={t('Select destination')}
                                    searchPlaceholder={t('Search Telegram destinations')}
                                    emptyText={t('No matching Telegram destinations')}
                                />
                            </Field>

                            <Field label={t('Daily limit')} error={routineForm.errors.daily_limit}>
                                <Input
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={routineForm.data.daily_limit}
                                    onChange={(event) => routineForm.setData('daily_limit', event.target.value)}
                                />
                            </Field>

                            <div className="lg:col-span-2">
                                <Field label={t('Daily times')} error={routineForm.errors.schedule_times}>
                                    <TimeChipEditor
                                        value={routineForm.data.schedule_times}
                                        onChange={(value) => routineForm.setData('schedule_times', value)}
                                        addLabel={t('Add time')}
                                        emptyText={t('No times yet.')}
                                        removeLabel={t('Remove time')}
                                    />
                                </Field>
                            </div>

                            <Field label={t('Notes')}>
                                <Textarea value={routineForm.data.notes} onChange={(event) => routineForm.setData('notes', event.target.value)} />
                            </Field>

                            <label className="admin-subsurface flex items-center gap-3 rounded-lg border p-3">
                                <input
                                    type="checkbox"
                                    checked={routineForm.data.active}
                                    onChange={(event) => routineForm.setData('active', event.target.checked)}
                                />
                                <span>{t('Routine is active')}</span>
                            </label>

                            <DialogFooter className="gap-2 sm:space-x-0 lg:col-span-2">
                                <Button type="button" variant="outline" onClick={closeCampaignEdit}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={routineForm.processing}>
                                    {t('Save routine changes')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteDialog !== null} onOpenChange={(open) => !open && setDeleteDialog(null)}>
                    <DialogContent className="admin-surface max-w-md">
                        <DialogHeader>
                            <DialogTitle>{deleteDialog?.title ?? t('Delete item')}</DialogTitle>
                            <DialogDescription>{deleteDialog?.description ?? t('This cannot be undone.')}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:space-x-0">
                            <Button type="button" variant="outline" onClick={() => setDeleteDialog(null)}>
                                {t('Keep item')}
                            </Button>
                            <Button type="button" variant="destructive" onClick={confirmDelete}>
                                {t('Yes, delete')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="admin-surface rounded-lg border p-4">
            <div className="text-muted-foreground text-sm">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
    );
}

function StepSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
    return (
        <section className="admin-surface rounded-lg border p-4">
            <div className="mb-5 flex gap-3">
                <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {number}
                </div>
                <div>
                    <h2 className="font-medium">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function TimeChipEditor({
    value,
    onChange,
    addLabel,
    emptyText,
    removeLabel,
    compact = false,
}: {
    value: string;
    onChange: (value: string) => void;
    addLabel: string;
    emptyText: string;
    removeLabel: string;
    compact?: boolean;
}) {
    const [draftTime, setDraftTime] = useState('09:30');
    const times = parseTimeList(value);

    const addTime = () => {
        const normalized = normalizeTimeValue(draftTime);

        if (!normalized || times.includes(normalized)) {
            return;
        }

        onChange([...times, normalized].join(','));
    };

    const removeTime = (indexToRemove: number) => {
        onChange(times.filter((_, index) => index !== indexToRemove).join(','));
    };

    return (
        <div className={compact ? 'grid gap-2' : 'admin-subsurface rounded-md border p-3'}>
            <div className={compact ? 'flex flex-nowrap gap-2 overflow-x-auto rounded-md border border-input bg-card p-2' : 'flex flex-wrap gap-2'}>
                {times.length > 0 ? (
                    times.map((time, index) => (
                        <span
                            key={`${time}-${index}`}
                            className="border-sidebar-border bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
                        >
                            {time}
                            <button
                                type="button"
                                onClick={() => removeTime(index)}
                                className="text-muted-foreground hover:text-foreground rounded-full p-0.5 transition-colors"
                                aria-label={`${removeLabel} ${time}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))
                ) : (
                    <div className="text-muted-foreground text-sm">{emptyText}</div>
                )}
            </div>

            <div className={compact ? 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]' : 'mt-3 grid gap-2 sm:grid-cols-[minmax(0,12rem)_auto]'}>
                <Input type="time" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} />
                <Button type="button" variant="outline" onClick={addTime}>
                    <Plus className="me-2 h-4 w-4" />
                    {addLabel}
                </Button>
            </div>
        </div>
    );
}

function TimePreview({ value, emptyText }: { value: string; emptyText: string }) {
    const times = parseTimeList(value);

    if (times.length === 0) {
        return <div className="text-muted-foreground text-sm">{emptyText}</div>;
    }

    return (
        <div className="flex max-w-full flex-wrap gap-1.5 md:justify-end">
            {times.map((time, index) => (
                <span
                    key={`${time}-${index}`}
                    className="border-sidebar-border bg-background/70 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                >
                    {time}
                </span>
            ))}
        </div>
    );
}

function AutomationList({ title, emptyText, children }: { title: string; emptyText: string; children: ReactNode }) {
    const isEmpty = Children.count(children) === 0;

    return (
        <section className="admin-surface rounded-lg border">
            <div className="border-sidebar-border/70 border-b px-4 py-3">
                <h2 className="font-medium">{title}</h2>
            </div>
            {isEmpty ? <div className="text-muted-foreground px-4 py-8 text-sm">{emptyText}</div> : children}
        </section>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isFailed = status === 'failed';
    const isSent = status === 'sent';
    const className = isFailed
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : isSent
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground';

    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{status}</span>;
}

function parseTimeList(value: string): string[] {
    return value
        .split(',')
        .map((time) => normalizeTimeValue(time))
        .filter((time): time is string => Boolean(time));
}

function normalizeTimeValue(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

    if (!match) {
        return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2] ?? '0');

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
