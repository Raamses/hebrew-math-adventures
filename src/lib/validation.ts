export const isValidProfileName = (name: string): boolean => {
    if (!name.trim()) return false;
    // Allows 1-30 characters consisting of English letters, Hebrew letters, digits, and spaces
    const profileNameRegex = /^[\u0590-\u05FFa-zA-Z0-9 ]{1,30}$/;
    return profileNameRegex.test(name);
};
