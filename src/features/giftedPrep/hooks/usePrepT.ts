import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type he from '@/i18n/locales/he.json';

type Resources = typeof he;
type Selector = ($: Resources) => string;

/** Record the property path a selector walks, e.g. `$ => $.prep.hub.title` gives "prep.hub.title". */
export function keyOf(selector: Selector): string {
    const parts: string[] = [];
    const recorder: object = new Proxy({}, {
        get(_target, prop) {
            parts.push(String(prop));
            return recorder;
        },
    });
    selector(recorder as Resources);
    return parts.join('.');
}

/**
 * Type-safe selector i18n (`t($ => $.prep.key)`, vault/rules/rtl-hebrew.md) scoped to this feature.
 * A global CustomTypeOptions would re-type ~500 legacy string-key calls, so the selector is typed
 * here against he.json; the locales-parity test keeps en.json in step.
 */
export function usePrepT() {
    const { t, i18n } = useTranslation();
    const pt = useCallback(
        (selector: Selector, vars?: Readonly<Record<string, string | number>>) =>
            t(keyOf(selector), { ...vars }),
        [t],
    );
    return { t: pt, i18n };
}
