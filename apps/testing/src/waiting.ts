import { Effect } from "effect";

export const step = 5;

const boundMillis = 5_000;

const saying = (description: string, seen: string): string => `Timed out after ${boundMillis / 1000} seconds waiting for ${description}${seen}`;

export const deadline = (description: string, seen?: () => string): Effect.Effect<never> =>
	Effect.callback<never>((resume) => {
		const timer = setTimeout(() => resume(Effect.die(saying(description, seen?.() ?? ""))), boundMillis);
		return Effect.sync(() => clearTimeout(timer));
	});
