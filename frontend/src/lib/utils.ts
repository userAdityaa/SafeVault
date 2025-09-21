import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with proper conflict resolution.
 * 
 * Combines clsx for conditional class names with tailwind-merge to handle
 * Tailwind CSS class conflicts intelligently.
 * 
 * @param inputs - Array of class values (strings, objects, arrays, etc.)
 * @returns Merged and deduplicated class string
 * 
 * @example
 * ```typescript
 * // Basic usage
 * cn("px-2 py-1", "bg-blue-500") // "px-2 py-1 bg-blue-500"
 * 
 * // With conflicts (later classes override)
 * cn("px-2", "px-4") // "px-4"
 * 
 * // With conditionals
 * cn("text-base", { "text-lg": isLarge, "text-red-500": hasError })
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a file size in bytes to a human-readable string.
 * 
 * Converts bytes to the most appropriate unit (Bytes, KB, MB, GB, TB)
 * with proper decimal precision.
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string with appropriate unit
 * 
 * @example
 * ```typescript
 * formatFileSize(0)        // "0 Bytes"
 * formatFileSize(1024)     // "1 KB"
 * formatFileSize(1536)     // "1.5 KB"
 * formatFileSize(2097152)  // "2 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a date string to a relative, human-readable format.
 * 
 * Converts ISO date strings to relative time descriptions like "today",
 * "yesterday", "X days ago", or falls back to locale date string for older dates.
 * 
 * @param dateString - ISO date string to format
 * @returns Human-readable relative date string
 * 
 * @example
 * ```typescript
 * // For dates
 * formatDate("2023-12-01T10:00:00Z") // "today" (if today is Dec 1, 2023)
 * formatDate("2023-11-30T10:00:00Z") // "yesterday"
 * formatDate("2023-11-28T10:00:00Z") // "3 days ago"
 * formatDate("2023-10-01T10:00:00Z") // "10/1/2023" (locale format)
 * ```
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'today';
  } else if (diffInDays === 1) {
    return 'yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
