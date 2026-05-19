import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';
import tr from '@/locales/tr.json';
import ar from '@/locales/ar.json';

// Supported locales
export const SUPPORTED_LOCALES = ['de', 'en', 'tr', 'ar'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// Default locale is German
export const DEFAULT_LOCALE: SupportedLocale = 'de';

// Locale display names and flags
export const LOCALE_CONFIG: Record<SupportedLocale, { name: string; nativeName: string; flag: string }> = {
    de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
    tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            de: { translation: de },
            en: { translation: en },
            tr: { translation: tr },
            ar: { translation: ar },
        },
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        debug: (import.meta as any).env?.DEV,
    });

export default i18n;
