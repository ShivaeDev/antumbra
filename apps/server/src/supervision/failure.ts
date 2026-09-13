import { Cause } from "effect";

const CAP = 64 * 1024;
const CUT = "\n… truncated.";

const bounded = (text: string): string => (text.length <= CAP ? text : text.slice(0, CAP - CUT.length) + CUT);

const spoken = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const failureOf = (cause: Cause.Cause<unknown>): { readonly message: string; readonly trace: string } => ({
	message: bounded(spoken(Cause.squash(cause))),
	trace: bounded(Cause.pretty(cause)),
});
