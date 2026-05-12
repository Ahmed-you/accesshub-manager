import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    const { t } = useLocale();

    return message ? (
        <p {...props} className={cn('text-sm text-red-600 dark:text-red-400', className)}>
            {t(message)}
        </p>
    ) : null;
}
