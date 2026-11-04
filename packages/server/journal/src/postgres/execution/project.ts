import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import type { Registry } from "#app.ts";
import type { StampedEvent } from "#postgres/execution/definition.ts";
import { owned } from "#postgres/execution/tables.ts";

export const refresh = (registry: Registry, rows: Record<string, unknown>) =>
	Effect.fn("ExecutionHistory.refresh")(function* () {
		for (const projection of registry.projections) yield* projection.run(rows, rows);
	});
export const apply = (registry: Registry, rows: Record<string, unknown>) =>
	Effect.fn("ExecutionHistory.apply")(function* (event: Event<StampedEvent>) {
		const value = event.value;
		if (value._tag === "ExecutionSequenceObserved") return;
		if (value._tag === "RunnerCursorAdvanced") {
			const cursor = yield* Schema.decodeUnknownEffect(Schema.Struct({ logId: Schema.String, cursor: Schema.Number }))(value).pipe(Effect.orDie);
			const sql = yield* SqlClient.SqlClient;
			yield* sql`insert into antumbra.runner_cursor (log_id, cursor) values (${cursor.logId}, ${cursor.cursor}) on conflict (log_id) do update set cursor = excluded.cursor`;
			return;
		}
		const source = registry.materializers.get(value._tag);
		if (source === undefined) return yield* Effect.die(new Error(`No execution materializer declares ${value._tag}`));
		yield* source.run({ ...value, at: value.at, seq: value.sequence, requestId: event.requestId }, rows).pipe(Effect.orDie);
		yield* refresh(registry, rows)();
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	for (const table of owned) {
		yield* sql`delete from ${sql(`antumbra.${table}`)}`;
	}
	yield* sql`delete from antumbra.runner_cursor`;
	yield* sql`delete from antumbra.piece_ruling_gates`;
	yield* sql`delete from antumbra."repoReference"`;
	yield* invalidateOnCommit([...owned, "pieceRulingGate", "repoReference"]);
});
