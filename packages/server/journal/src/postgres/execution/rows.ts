import type { WriteHandles } from "@antumbra/platform-feature/handles.ts";
import { type RowShape, row } from "@antumbra/platform-feature/row.ts";
import { Effect } from "effect";
import type { Registry } from "#app.ts";
import type { State } from "#postgres/execution/state.ts";
import { tables } from "#postgres/execution/tables.ts";
import { rowsOf } from "#postgres/rows.ts";

export const rows = Effect.fn("ExecutionHistory.makeRows")(function* (registry: Registry) {
	const handles: Record<string, unknown> = {};
	for (const source of registry.rows) {
		const table = tables[source.name];
		if (table === undefined) continue;
		const definition =
			source.scope === undefined
				? row(source.name, source.fields, { key: source.key })
				: row(source.name, source.fields, { key: source.key, scope: source.scope });
		handles[source.name] = yield* rowsOf(definition, table[0], table[1]);
	}
	return handles;
});
export function handlesFor(state: State): <const Rows extends readonly RowShape[]>(rows: Rows) => Effect.Effect<WriteHandles<Rows>>;
export function handlesFor(state: State): unknown {
	return (definitions: readonly RowShape[]) =>
		Effect.succeed(Object.fromEntries(definitions.map((definition) => [definition.name, state.rows[definition.name]])));
}
