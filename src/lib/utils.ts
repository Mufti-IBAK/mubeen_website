import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Ensures a URL string has a protocol prefix. */
export function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
  return `https://${url}`;
}

/** Build a map of items from an array by a key. */
export function buildMap<T>(items: T[], key: keyof T): Record<string | number, T> {
  const map: Record<string | number, any> = {};
  items.forEach((item) => {
    const k = item[key] as unknown as string | number;
    map[k] = item;
  });
  return map;
}

