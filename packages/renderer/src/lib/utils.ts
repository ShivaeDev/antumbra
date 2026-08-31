import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: readonly ClassValue[]): string => twMerge(clsx(inputs));
