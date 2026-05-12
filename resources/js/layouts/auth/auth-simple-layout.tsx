import AppLogoIcon from '@/components/app-logo-icon';
import PreferencesControls from '@/components/preferences-controls';
import { useLocale } from '@/hooks/use-locale';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const { t } = useLocale();

    return (
        <div className="bg-background relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
            <div className="absolute end-4 top-4 z-10">
                <PreferencesControls compact={true} />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-lime-500/8 via-transparent to-cyan-500/10" />
            <div className="w-full max-w-sm">
                <div className="relative flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                            <div className="ring-primary/15 mb-2 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-transparent shadow-lg ring-1">
                                <AppLogoIcon className="size-full rounded-full object-cover" />
                            </div>
                            <span className="sr-only">{t(title ?? '')}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <div className="space-y-1">
                                <div className="text-2xl font-semibold tracking-normal">
                                    <span className="text-foreground">Access</span>
                                    <span className="text-lime-500">Hub</span>
                                </div>
                                <p className="text-muted-foreground text-xs font-medium tracking-[0.25em] uppercase">Manager</p>
                            </div>
                            <p className="text-muted-foreground text-center text-sm">{t(description ?? 'Your Gateway to Digital Services')}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
