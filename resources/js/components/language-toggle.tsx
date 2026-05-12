import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
    const { locale, updateLocale, t } = useLocale();

    return (
        <div className={cn('border-border bg-background inline-flex items-center gap-2 rounded-lg border p-1', className)}>
            {!compact ? (
                <span className="text-muted-foreground flex items-center gap-2 px-2 text-xs font-medium">
                    <Languages className="h-4 w-4" />
                    {t('Language')}
                </span>
            ) : null}

            <div className="inline-flex items-center gap-1">
                {(['en', 'ar'] as const).map((value) => (
                    <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={locale === value ? 'default' : 'ghost'}
                        className="h-8 min-w-11 px-3"
                        onClick={() => updateLocale(value)}
                    >
                        {value.toUpperCase()}
                    </Button>
                ))}
            </div>
        </div>
    );
}
