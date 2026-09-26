import type { Line } from "#pr/lines.ts";

export const errorLimit = 600_000;

export type Failing = { readonly message: string; readonly reported: boolean; readonly since: number };

export const failingFrom = (previous: Failing | undefined, message: string | undefined, now: number): Failing | undefined => {
	if (message === undefined) return undefined;
	return previous === undefined ? { message, reported: false, since: now } : { ...previous, message };
};

export const complaint = (failing: Failing, now: number): Line => ({
	state: "gh-error",
	message: failing.message,
	minutes: Math.floor((now - failing.since) / 60_000),
});

export const noticed = (failing: Failing | undefined, now: number): { readonly failing: Failing | undefined; readonly lines: readonly Line[] } => {
	if (failing === undefined || failing.reported || now - failing.since < errorLimit) return { failing, lines: [] };
	return { failing: { ...failing, reported: true }, lines: [complaint(failing, now)] };
};
