import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a credit/token value the way the reference toolbar shows it ("0.01 M"). */
export function formatCredits(n: number): string {
  return `${n.toFixed(2)} M`;
}

export function shortId(id: string, len = 8): string {
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}
