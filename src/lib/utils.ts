/**
 * Utility for merging Tailwind CSS classes
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
