import type { Effect } from "effect";
import type { FactShape, FactValue } from "#fact.ts";
import type { WriteHandles } from "#handles.ts";
import type { RowShape } from "#row.ts";

export interface MaterializerShape {
	readonly fact: FactShape;
	readonly writes: readonly RowShape[];
	readonly run: (fact: never, rows: never) => Effect.Effect<unknown, unknown>;
}

export type MaterializerBody<Fact extends FactShape, Writes extends readonly RowShape[]> = (
	fact: FactValue<Fact>,
	rows: WriteHandles<Writes>,
) => Effect.Effect<void>;

export interface MaterializerDefinition<Fact extends FactShape, Writes extends readonly RowShape[]> extends MaterializerShape {
	readonly fact: Fact;
	readonly writes: Writes;
	readonly run: MaterializerBody<Fact, Writes>;
}

export function materializer<Fact extends FactShape, const Writes extends readonly RowShape[]>(
	fact: Fact,
	declaration: { readonly writes: Writes; readonly run: MaterializerBody<Fact, Writes> },
): MaterializerDefinition<Fact, Writes>;
export function materializer(
	fact: FactShape,
	declaration: { readonly writes: readonly RowShape[]; readonly run: MaterializerBody<FactShape, readonly RowShape[]> },
): MaterializerShape {
	return { fact, run: declaration.run, writes: declaration.writes };
}
