import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm shadow-black/5 ring-offset-background transition-colors placeholder:text-muted-foreground hover:border-ring/45 focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
