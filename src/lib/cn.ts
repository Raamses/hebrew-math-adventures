import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge.
 * This ensures that conditional classes are handled correctly and 
 * that Tailwind class conflicts are resolved (last one wins).
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}