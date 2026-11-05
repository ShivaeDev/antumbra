import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { ExecutionDefinition, type StampedEvent } from "#execution/definition.ts";
import { owned } from "#execution/tables.ts";

export const refresh = () => Effect.flatMap(ExecutionDefinition, (model) => model.refresh);
export const apply = Effect.fn("ExecutionHistory.apply")(function* (event: Event<StampedEvent>) {
	const model = yield* ExecutionDefinition;
	const value = event.value;
	if (value._tag === "ExecutionSequenceObserved") return;
	if (value._tag === "RunnerCursorAdvanced") {
		const cursor = yield* Schema.decodeUnknownEffect(Schema.Struct({ logId: Schema.String, cursor: Schema.Number }))(value).pipe(Effect.orDie);
		const sql = yield* SqlClient.SqlClient;
		yield* sql`insert into antumbra.runner_cursor (log_id,cursor) values (${cursor.logId},${cursor.cursor}) on conflict (log_id) do update set cursor = excluded.cursor`;
		return;
	}
	yield* model.project(event);
	if (value._tag !== "SessionProviderEvent") yield* model.refresh;
});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	for (const table of owned) {
		yield* sql`delete from ${sql(table)}`;
	}
	yield* sql`delete from antumbra.runner_cursor`;
	yield* invalidateOnCommit([...owned, "pieceRulingGate", "repoReference"]);
});
