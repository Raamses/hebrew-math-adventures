// import the original type declarations
import 'i18next';
// import all namespaces (for the default language, only)
import en from '../i18n/locales/en.json';


declare module 'i18next' {
    // Extend CustomTypeOptions
    interface CustomTypeOptions {
        // custom namespace type, if you changed it
        defaultNS: 'translation';
        // custom resources type
        resources: {
            translation: typeof en;
        };
        // other
        returnNull: false;
    }
}
