import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges Tailwind classes without conflicts.
// Use this everywhere instead of string concatenation.
// e.g. cn('px-4 py-2', isActive && 'bg-brand-500', className)
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
