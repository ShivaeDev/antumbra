import { Cause } from "effect";

const spoken = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const failureOf = (cause: Cause.Cause<unknown>): { readonly message: string; readonly trace: string } => ({
	message: spoken(Cause.squash(cause)),
	trace: Cause.pretty(cause),
});
