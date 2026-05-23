export const isValidProfileName = (name: string): boolean => {
    // Allows 1-30 characters consisting of English letters, Hebrew letters, digits, and spaces
    // Must contain at least one non-space character
    const trimmed = name.trim();
    if (!trimmed) return false;
    const profileNameRegex = /^[\u0590-\u05FFa-zA-Z0-9 ]{1,30}$/;
    return profileNameRegex.test(name);
};
