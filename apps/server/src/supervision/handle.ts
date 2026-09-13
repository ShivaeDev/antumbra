import type { Effect } from "effect";

export interface Loops {
	readonly refresh: Effect.Effect<void>;
	readonly running: (name: string) => boolean;
	readonly start: (name: string) => Effect.Effect<void>;
}
