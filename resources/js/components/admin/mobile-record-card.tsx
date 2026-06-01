import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MobileRecordField {
    label: ReactNode;
    value: ReactNode;
}

interface MobileRecordCardProps {
    title: ReactNode;
    subtitle?: ReactNode;
    imageUrl?: string | null;
    imageAlt?: string;
    badges?: ReactNode;
    fields?: MobileRecordField[];
    actions?: ReactNode;
    className?: string;
}

export default function MobileRecordCard({ title, subtitle, imageUrl, imageAlt, badges, fields = [], actions, className }: MobileRecordCardProps) {
    return (
        <article className={cn('border-sidebar-border/70 bg-card/60 rounded-lg border p-4 shadow-sm', className)}>
            <div className="flex min-w-0 items-start gap-3">
                {imageUrl ? <img src={imageUrl} alt={imageAlt ?? ''} className="h-12 w-12 shrink-0 rounded-lg border object-cover" /> : null}

                <div className="min-w-0 flex-1">
                    <div className="font-medium break-words">{title}</div>
                    {subtitle ? <div className="text-muted-foreground mt-1 text-sm break-words">{subtitle}</div> : null}
                </div>
            </div>

            {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}

            {fields.length > 0 ? (
                <dl className="mt-4 grid gap-3">
                    {fields.map((field, index) => (
                        <div key={index} className="grid gap-1">
                            <dt className="text-muted-foreground text-xs font-medium">{field.label}</dt>
                            <dd className="text-sm break-words">{field.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            {actions ? <div className="mt-4 grid grid-cols-2 gap-2 [&>*]:w-full">{actions}</div> : null}
        </article>
    );
}
