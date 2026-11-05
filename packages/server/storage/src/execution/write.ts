import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { transact } from "@shivaedev/sql/transact.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import type { StampedEvent } from "#execution/definition.ts";
import { refresh } from "#execution/project.ts";
import { ExecutionStore } from "#execution/state.ts";

export const locked = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	transact(
		Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			yield* sql`select pg_advisory_xact_lock(162738495)`;
			return yield* effect;
		}),
		{ onSqlError: (error) => error },
	);

export const append = Effect.fn("ExecutionHistory.append")(function* (requestId: Request, events: readonly StampedEvent[]) {
	return yield* locked(
		Effect.gen(function* () {
			const state = yield* ExecutionStore;
			const current = yield* state.store.read("execution");
			const version = yield* state.store.append({ stream: "execution", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events });
			return version;
		}),
	).pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
});
export const read = Effect.fn("ExecutionHistory.read")(function* () {
	const state = yield* ExecutionStore;
	return yield* state.store.read("execution");
});
export const rebuild = Effect.fn("ExecutionHistory.rebuild")(function* () {
	yield* locked(
		Effect.gen(function* () {
			const state = yield* ExecutionStore;
			yield* state.store.rebuild;
			yield* refresh();
		}),
	);
});
export const cursor = Effect.fn("ExecutionHistory.cursor")(function* (logId: string) {
	return yield* Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		const found = yield* sql`select cursor from antumbra.runner_cursor where log_id = ${logId}`.pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ cursor: Schema.Number })))),
		);
		return found[0]?.cursor ?? -1;
	});
});
