import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './i18n/locales/en.json';
import he from './i18n/locales/he.json';

// Translation resources
const resources = {
    en: {
        translation: en
    },
    he: {
        translation: he
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;

// Set document direction based on language — ensures portals (document.body children)
// also inherit RTL/LTR correctly without needing dir on every component root.
i18n.on('languageChanged', (lng) => {
    if (typeof document !== 'undefined') {
        document.documentElement.dir = i18n.dir(lng);
        document.documentElement.lang = lng;
    }
});

// Set initial direction
if (typeof document !== 'undefined') {
    document.documentElement.dir = i18n.dir(i18n.language);
    document.documentElement.lang = i18n.language;
}
