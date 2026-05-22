/**
 * Validates a profile name.
 * Allows Hebrew characters, English characters, digits, and spaces.
 * Length must be between 1 and 30 characters.
 */
export function isValidProfileName(name: string): boolean {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 30) {
        return false;
    }
    // Hebrew range: \u0590-\u05FF
    // English: a-zA-Z
    // Digits: 0-9
    // Spaces: \s
    const nameRegex = /^[\u0590-\u05FFa-zA-Z0-9\s]+$/;
    return nameRegex.test(trimmed);
}
