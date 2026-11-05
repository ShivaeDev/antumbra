import type { Effect } from "effect";
import type { Work } from "#supervision/loop.ts";

export interface Loops {
	readonly state: (name: string) => Work["status"];
	readonly refresh: Effect.Effect<void>;
	readonly running: (name: string) => boolean;
	readonly start: (name: string) => Effect.Effect<void>;
}
