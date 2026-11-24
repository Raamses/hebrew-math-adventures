/** An LRI…PDI run (ltr() in engine/arithmeticExplain.ts): one equation inside a Hebrew sentence. */
const ISOLATE_RUN = /(\u2066[^\u2069]*\u2069)/;

/**
 * Hebrew text with each LTR-isolated equation in its own LTR inline box. Without it, a narrow screen wraps
 * mid-equation inside the RTL paragraph ("15 + 8 + 12" ends one line, "= 35" starts the next). The box
 * moves to the next line whole when it fits there; only an equation wider than the line (the longest is
 * 43 characters, a repeated-addition explanation) breaks inside the box, still reading left to right.
 * The isolate characters stay inside, so the text content is unchanged.
 */
export function BidiText({ text }: { readonly text?: string }) {
    if (!text) return null;
    return (
        <>
            {text.split(ISOLATE_RUN).map((part, i) =>
                i % 2 === 1
                    ? <span key={i} dir="ltr" className="inline-block max-w-full" data-testid="prep-ltr-run">{part}</span>
                    : part,
            )}
        </>
    );
}
