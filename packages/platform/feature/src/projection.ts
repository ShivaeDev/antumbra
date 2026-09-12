import type { Effect } from "effect";
import type { ReadHandles, WriteHandles } from "#handles.ts";
import type { RowShape } from "#row.ts";

export interface ProjectionShape {
	readonly name: string;
	readonly reads: readonly RowShape[];
	readonly writes: readonly RowShape[];
	readonly run: (reads: never, writes: never) => Effect.Effect<void>;
}

export interface ProjectionDefinition<Reads extends readonly RowShape[], Writes extends readonly RowShape[]> extends ProjectionShape {
	readonly reads: Reads;
	readonly writes: Writes;
	readonly run: (reads: ReadHandles<Reads>, writes: WriteHandles<Writes>) => Effect.Effect<void>;
}

export const projection = <const Reads extends readonly RowShape[], const Writes extends readonly RowShape[]>(
	name: string,
	declaration: {
		readonly reads: Reads;
		readonly writes: Writes;
		readonly run: (reads: ReadHandles<Reads>, writes: WriteHandles<Writes>) => Effect.Effect<void>;
	},
): ProjectionDefinition<Reads, Writes> => ({ name, ...declaration });
