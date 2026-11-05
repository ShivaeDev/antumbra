import { transact } from "@shivaedev/sql/transact.ts";
import { waitForBlockedSessions } from "@shivaedev/test-sql/server/waitForBlockedSessions.ts";
import { Deferred, Effect, Fiber, Schema } from "effect";
import { SqlClient } from "effect/sql";

export const holdWrite = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const written = yield* Deferred.make<number>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transact(
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				const [owner] = yield* sql`select pg_backend_pid() as pid`.pipe(
					Effect.flatMap(Schema.decodeUnknownEffect(Schema.NonEmptyArray(Schema.Struct({ pid: Schema.Number })))),
				);
				const result = yield* effect;
				yield* Deferred.succeed(written, owner.pid);
				yield* Deferred.await(release);
				return result;
			}),
			{ onSqlError: (error) => error },
		).pipe(Effect.forkScoped);
		const pid = yield* Effect.raceFirst(
			Deferred.await(written),
			Fiber.join(pending).pipe(Effect.andThen(Effect.die(new Error("Held write ended before release")))),
		);
		return {
			blocked: () => waitForBlockedSessions(pid, { clock: "test" }),
			commit: () => Deferred.succeed(release, undefined).pipe(Effect.andThen(Fiber.join(pending))),
		};
	});
