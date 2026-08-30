import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// why: a component's own classes and a caller's override often name the same
// Tailwind property, and the later one in the string does not reliably win.
// Merging by property lets a caller override a single utility without having
// to know which ones the component already set.
export const cn = (...inputs: readonly ClassValue[]): string => twMerge(clsx(inputs));
