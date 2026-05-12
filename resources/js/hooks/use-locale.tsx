import { translate, type Locale } from '@/lib/translations';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'locale';

interface LocaleContextValue {
    locale: Locale;
    isArabic: boolean;
    direction: 'ltr' | 'rtl';
    updateLocale: (locale: Locale) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: Locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function initializeLocale() {
    const savedLocale = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? 'en';
    applyLocale(savedLocale);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? 'en');

    useEffect(() => {
        applyLocale(locale);
        localStorage.setItem(STORAGE_KEY, locale);
    }, [locale]);

    const value = useMemo<LocaleContextValue>(
        () => ({
            locale,
            isArabic: locale === 'ar',
            direction: locale === 'ar' ? 'rtl' : 'ltr',
            updateLocale: setLocale,
            t: (key, replacements) => translate(locale, key, replacements),
        }),
        [locale],
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    const context = useContext(LocaleContext);

    if (!context) {
        throw new Error('useLocale must be used within LocaleProvider');
    }

    return context;
}
