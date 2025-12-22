import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import he from './locales/he.json';
import en from './locales/en.json';

i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
        resources: {
            he: { translation: he },
            en: { translation: en },
        },
        lng: 'he', // Default language for now
        fallbackLng: 'he',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'app-language',
        },
        debug: true,
    });

export default i18n;
