import { row } from "@antumbra/platform-feature/row.ts";
import { VoyageActivity } from "@antumbra/platform-vocabulary/change-evidence.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { ExecutionDefinition } from "@antumbra/server-storage/execution/definition.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { owned, tables } from "@antumbra/server-storage/execution/tables.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { LegacyModel } from "#v1/model.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
import { validateFixture } from "#validate.ts";

export class ExecutionFixtureMismatch extends Schema.TaggedError<ExecutionFixtureMismatch>()("ExecutionFixtureMismatch", { table: Schema.String }) {
	override get message() {
		return `Execution fixture rows differ in ${this.table}`;
	}
}
export const journalExecution = Effect.fn("ExecutionFixture.readJournal")(function* (filename: string) {
	const model = yield* ExecutionDefinition;
	yield* validateFixture(filename);
	const registry = yield* LegacyModel;
	const source = yield* (yield* LegacySource).open(filename);
	const events = yield* legacyEvents(model.events, model.names).pipe(Effect.provideService(SqlClient.SqlClient, source));
	const cursors = yield* source`select "logId", cursor from runner_cursor order by "logId"`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ logId: Schema.String, cursor: Schema.Number })))),
	);
	const [watermark] = yield* source`select coalesce(max(seq), 0) as sequence from journal`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.NonEmptyArray(Schema.Struct({ sequence: Schema.Number })))),
	);
	const captured: Record<string, readonly unknown[]> = {};
	for (const name of owned) {
		const definition = registry.rows.find((candidate) => candidate.name === name);
		if (definition === undefined) return yield* Effect.die(new Error(`No fixture schema declares ${name}`));
		const values = yield* legacyRows(row(name, definition.fields, { key: definition.key })).pipe(Effect.provideService(SqlClient.SqlClient, source));
		captured[name] = name === "voyageActivity" ? values.toSorted((a, b) => String(a.id).localeCompare(String(b.id))) : values;
	}
	return { events, cursors, rows: captured, sequence: watermark.sequence };
});
export const replayExecutionFixture = Effect.fn("ExecutionFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalExecution>>) {
	const model = yield* ExecutionDefinition;
	const history = yield* ExecutionHistory;
	const batches: { requestId: Request; events: (typeof model.events.Type)[] }[] = [];
	for (const event of snapshot.events) {
		const previous = batches.at(-1);
		if (previous?.requestId === event.requestId) previous.events.push(event.value);
		else batches.push({ requestId: event.requestId, events: [event.value] });
	}
	yield* history.restore(batches);
	for (const cursor of snapshot.cursors)
		yield* history.append(Request.make(`fixture:runner-cursor:${cursor.logId}`), [
			{ _tag: "RunnerCursorAdvanced", ...cursor, at: 0, sequence: snapshot.events.at(-1)?.value.sequence ?? 0 },
		]);
	yield* history.append(Request.make("fixture:execution-sequence"), [{ _tag: "ExecutionSequenceObserved", at: 0, sequence: snapshot.sequence }]);
	yield* checkReplay(snapshot);
	return { execution: snapshot.events.length, events: snapshot.events.length };
});

const checkReplay = Effect.fn("ExecutionFixture.check")(function* (snapshot: Effect.Success<ReturnType<typeof journalExecution>>) {
	const registry = yield* LegacyModel;
	const history = yield* ExecutionHistory;
	const sql = yield* SqlClient.SqlClient;
	for (const definition of registry.rows) {
		const expected = snapshot.rows[definition.name];
		if (expected === undefined) continue;
		const table = tables[definition.name];
		if (table === undefined) return yield* Effect.die(new Error(`No execution table stores ${definition.name}`));
		const values = yield* sql`select * from ${sql(table[0])} order by ${sql(table[1])}`.pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(definition.Row))),
		);
		const actual =
			definition.name === "voyageActivity"
				? (yield* Schema.decodeUnknownEffect(Schema.Array(VoyageActivity))(values)).toSorted((a, b) => a.id.localeCompare(b.id))
				: values;
		if (!Schema.toEquivalence(Schema.Array(definition.Row))(expected, actual))
			return yield* Effect.fail(new ExecutionFixtureMismatch({ table: definition.name }));
	}
	for (const cursor of snapshot.cursors)
		if ((yield* history.cursor(cursor.logId)) !== cursor.cursor) return yield* Effect.fail(new ExecutionFixtureMismatch({ table: "runner_cursor" }));
});
