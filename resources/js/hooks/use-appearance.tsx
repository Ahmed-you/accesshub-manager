import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

export function initializeTheme() {
    const savedAppearance = (localStorage.getItem('appearance') as Appearance) || 'system';

    applyTheme(savedAppearance);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(() => (localStorage.getItem('appearance') as Appearance | null) ?? 'system');

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        applyTheme(mode);
    };

    useEffect(() => {
        const savedAppearance = localStorage.getItem('appearance') as Appearance | null;
        const initialAppearance = savedAppearance || 'system';

        setAppearance(initialAppearance);
        applyTheme(initialAppearance);

        const handleSystemThemeChange = () => {
            const currentAppearance = (localStorage.getItem('appearance') as Appearance | null) ?? 'system';
            applyTheme(currentAppearance);
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    return { appearance, updateAppearance };
}
