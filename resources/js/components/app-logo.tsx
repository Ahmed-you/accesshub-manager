import { useLocale } from '@/hooks/use-locale';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    const { t } = useLocale();

    return (
        <div className="flex items-center gap-3">
            <div className="ring-sidebar-border/100 flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full bg-transparent ring-1">
                <AppLogoIcon className="size-full rounded-full object-cover" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate text-[15px] font-semibold tracking-normal">
                    <span className="text-foreground">Access</span>
                    <span className="text-lime-500">Hub</span>
                    <span className="text-muted-foreground ml-1 text-xs font-medium">Manager</span>
                </span>
                <span className="text-muted-foreground truncate text-[11px]">{t('Your Gateway to Digital Services')}</span>
            </div>
        </div>
    );
}
