import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import LanguageToggle from '@/components/language-toggle';
import { cn } from '@/lib/utils';

export default function PreferencesControls({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <LanguageToggle compact={compact} />
            <AppearanceToggleDropdown />
        </div>
    );
}
