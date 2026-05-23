export const isValidProfileName = (name: string): boolean => {
    // Allows 1-30 characters consisting of English letters, Hebrew letters, digits, and spaces
    // Must not be empty or only whitespace
    if (name.trim().length === 0) return false;
    const profileNameRegex = /^[\u0590-\u05FFa-zA-Z0-9 ]{1,30}$/;
    return profileNameRegex.test(name);
};
