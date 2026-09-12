import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { codecOf, type Registry } from "#app.ts";
import { readHandle } from "#read-handle.ts";
import { writeHandle } from "#write-handle.ts";

export const materialize = Effect.fn("journal.materialize")(function* (
	sql: SqlClient,
	registry: Registry,
	name: string,
	fact: Record<string, unknown>,
	dirty: (key: string) => void,
) {
	const source = registry.materializers.get(name);
	if (source === undefined) return yield* Effect.die(new Error(`no materializer declares the fact "${name}"`));
	const writes = (rows: typeof source.writes) => Object.fromEntries(rows.map((row) => [row.name, writeHandle(sql, codecOf(registry, row), dirty)]));
	yield* source.run(fact, writes(source.writes));
	for (const projection of registry.projections) {
		const reads = Object.fromEntries(projection.reads.map((row) => [row.name, readHandle(sql, codecOf(registry, row))]));
		yield* projection.run(reads, writes(projection.writes));
	}
});
