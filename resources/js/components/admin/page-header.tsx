import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    description: string;
    actions?: React.ReactNode;
    className?: string;
}

export default function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    const { t } = useLocale();

    return (
        <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-normal">{t(title)}</h1>
                <p className="text-muted-foreground max-w-2xl text-sm">{t(description)}</p>
            </div>

            {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div> : null}
        </div>
    );
}
