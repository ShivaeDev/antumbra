import { LogEntry, type LogEvent } from "@antumbra/platform-runner/log.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Clock, Context, Effect, Layer, PubSub, Schema, Stream } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";

export interface Log {
	readonly append: (event: LogEvent) => Effect.Effect<LogEntry>;
	readonly read: (after: number) => Effect.Effect<ReadonlyArray<LogEntry>>;
	readonly request: (requestId: string) => Effect.Effect<ReadonlyArray<LogEntry>>;
	readonly events: (after: number) => Stream.Stream<LogEntry>;
}
export class RunnerLog extends Context.Service<RunnerLog, Log>()("@antumbra/runner-fabric/RunnerLog") {}

export class LogDatabase extends Context.Service<LogDatabase, SqlClient>()("@antumbra/runner-fabric/LogDatabase") {}

const Stored = Schema.Struct({ cursor: Schema.Int, at: Schema.Number, event: Schema.fromJsonString(LogEntry.fields.event) });
const decode = Schema.decodeUnknownEffect(Schema.Array(Stored));

export const makeLog = Effect.fn("RunnerLog.make")(function* (logId: string) {
	const sql = yield* LogDatabase;
	yield* Effect.orDie(sql`CREATE TABLE IF NOT EXISTS runner_log (cursor INTEGER PRIMARY KEY, at REAL NOT NULL, event TEXT NOT NULL)`);
	const changed = yield* PubSub.unbounded<void>();
	const entries = (rows: ReadonlyArray<unknown>) =>
		decode(rows).pipe(
			Effect.map((values) => values.map((value) => ({ ...value, logId }))),
			Effect.orDie,
		);
	const read = (after: number) =>
		sql`SELECT cursor, at, event FROM runner_log WHERE cursor > ${after} ORDER BY cursor`.pipe(Effect.orDie, Effect.flatMap(entries));
	const request = (requestId: string) =>
		sql`SELECT cursor, at, event FROM runner_log WHERE json_extract(event, '$.requestId') = ${requestId} ORDER BY cursor`.pipe(
			Effect.orDie,
			Effect.flatMap(entries),
		);
	const append = Effect.fn("RunnerLog.append")(function* (event: LogEvent) {
		const at = yield* Clock.currentTimeMillis;
		const rows = yield* Effect.orDie(
			sql`INSERT INTO runner_log (cursor, at, event) SELECT COALESCE(MAX(cursor), -1) + 1, ${at}, ${JSON.stringify(event)} FROM runner_log RETURNING cursor, at, event`,
		);
		const values = yield* entries(rows);
		const entry = values[0];
		if (entry === undefined) return yield* Effect.die("runner log append returned no row");
		yield* PubSub.publish(changed, undefined);
		return entry;
	});
	const events = (after: number) =>
		Stream.unwrap(
			Effect.gen(function* () {
				const subscription = yield* PubSub.subscribe(changed);
				let cursor = after;
				const fresh = Effect.suspend(() =>
					read(cursor).pipe(
						Effect.map((values) => {
							const latest = values.at(-1);
							if (latest !== undefined) cursor = latest.cursor;
							return values;
						}),
					),
				);
				return Stream.concat(Stream.fromEffect(fresh), Stream.fromSubscription(subscription).pipe(Stream.mapEffect(() => fresh))).pipe(
					Stream.flattenIterable,
				);
			}),
		);
	return { append, read, request, events } satisfies Log;
});

export const file = (options: { readonly filename: string; readonly logId: string }) =>
	Layer.effect(RunnerLog)(
		Effect.gen(function* () {
			const sql = yield* SqliteClient.make({ filename: options.filename });
			yield* Effect.orDie(sql`PRAGMA synchronous = NORMAL`);
			return yield* makeLog(options.logId).pipe(Effect.provideService(LogDatabase, sql));
		}),
	).pipe(Layer.provide(reactivityLayer));
