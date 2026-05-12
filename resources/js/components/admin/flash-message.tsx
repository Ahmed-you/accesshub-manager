import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocale } from '@/hooks/use-locale';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function FlashMessage() {
    const { flash } = usePage<SharedData>().props;
    const { t } = useLocale();

    if (!flash?.success && !flash?.error) {
        return null;
    }

    return (
        <div className="grid gap-3">
            {flash.success && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>{t('Saved')}</AlertTitle>
                    <AlertDescription>{t(flash.success)}</AlertDescription>
                </Alert>
            )}

            {flash.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('Something needs attention')}</AlertTitle>
                    <AlertDescription>{t(flash.error)}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
