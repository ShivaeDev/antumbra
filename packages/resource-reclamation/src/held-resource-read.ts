import type { WriteExecutors } from "@antumbra/persistence";
import type { Effect } from "effect";

export interface HeldResource {
	readonly branch: string;
	readonly id: string;
	readonly source: string;
}

export interface HeldResourceRead<E> {
	readonly held: (
		resources: ReadonlyArray<HeldResource>,
	) => Effect.Effect<ReadonlyMap<string, string>, E, WriteExecutors>;
}
