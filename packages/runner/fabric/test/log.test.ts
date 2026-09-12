import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Ref, Stream } from "effect";
import { TestClock } from "effect/testing";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { LogDatabase, makeLog, RunnerLog } from "#log.ts";
import { recover } from "#recover.ts";
import { file } from "#test/database.ts";

const openFile = Effect.gen(function* () {
	const sql = yield* SqliteClient.make({ filename: ":memory:" });
	const aside = yield* Ref.make<ReadonlyArray<number>>([]);
	return { aside, sql, database: { sql, setAside: (epoch: number) => Ref.update(aside, (epochs) => [...epochs, epoch]) } };
});

it.effect("keeps one ordered log across sessions and reopens stored request evidence", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { aside, database } = yield* openFile;
			const log = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, database));
			yield* log.append({ type: "SessionSlept", requestId: "sleep-a", sessionId: "a" });
			yield* log.append({ type: "SessionSlept", requestId: "sleep-b", sessionId: "b" });
			const reopened = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, database));
			expect(reopened.logId).toBe(log.logId);
			expect(yield* Ref.get(aside)).toEqual([]);
			expect((yield* reopened.read(-1)).map(({ cursor }) => cursor)).toEqual([0, 1]);
			expect((yield* reopened.read(0)).map(({ event }) => event)).toEqual([{ type: "SessionSlept", requestId: "sleep-b", sessionId: "b" }]);
			expect((yield* reopened.request("sleep-a")).map(({ cursor }) => cursor)).toEqual([0]);
		}),
	).pipe(Effect.provide(reactivityLayer)),
);

it.effect("a log recorded under another shape is set aside and starts again under a renewed identity", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { aside, sql, database } = yield* openFile;
			yield* Effect.orDie(sql.unsafe(`CREATE TABLE runner_log (cursor INTEGER PRIMARY KEY, at REAL NOT NULL, event TEXT NOT NULL)`));
			yield* Effect.orDie(sql.unsafe(`CREATE TABLE log_shape (logId TEXT PRIMARY KEY, hash TEXT NOT NULL)`));
			yield* Effect.orDie(sql`INSERT INTO log_shape ${sql.insert({ logId: "runner-log:0", hash: "an earlier shape" })}`);
			const event = JSON.stringify({ type: "SessionSlept", requestId: "sleep-a", sessionId: "a" });
			yield* Effect.orDie(sql`INSERT INTO runner_log ${sql.insert({ cursor: 7, at: 100, event })}`);
			yield* TestClock.adjust("1 second");
			const log = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, database));
			expect(yield* Ref.get(aside)).toEqual([1000]);
			expect(log.logId).toBe("runner-log:1000");
			expect(yield* log.read(-1)).toEqual([]);
			expect((yield* log.append({ type: "SessionSlept", requestId: "sleep-b", sessionId: "b" })).cursor).toBe(0);
			const reopened = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, database));
			expect(reopened.logId).toBe("runner-log:1000");
			expect(yield* Ref.get(aside)).toEqual([1000]);
		}),
	).pipe(Effect.provide(reactivityLayer)),
);

it.effect("streams stored entries followed by new committed entries", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { database } = yield* openFile;
			const log = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, database));
			yield* log.append({ type: "SessionSlept", requestId: "first", sessionId: "a" });
			const seen = yield* Deferred.make<void>();
			const reading = yield* log.events(-1).pipe(
				Stream.tap(() => Deferred.succeed(seen, undefined)),
				Stream.take(2),
				Stream.runCollect,
				Effect.forkScoped,
			);
			yield* Deferred.await(seen);
			yield* log.append({ type: "SessionSlept", requestId: "second", sessionId: "b" });
			expect((yield* Fiber.join(reading)).map(({ cursor }) => cursor)).toEqual([0, 1]);
		}),
	).pipe(Effect.provide(reactivityLayer)),
);

it.effect("cold recovery detaches interrupted acquisitions once without ending identity", () =>
	Effect.gen(function* () {
		const log = yield* RunnerLog;
		yield* log.append({ type: "SessionWoke", requestId: "wake", sessionId: "interrupted", runnerId: "runner" });
		yield* log.append({ type: "SessionWoke", requestId: "wake-slept", sessionId: "sleeping", runnerId: "runner" });
		yield* log.append({ type: "SessionSlept", requestId: "sleep", sessionId: "sleeping" });
		yield* recover();
		yield* recover();
		expect((yield* log.read(-1)).filter(({ event }) => event.type === "SessionDetached").map(({ event }) => event)).toEqual([
			{ type: "SessionDetached", sessionId: "interrupted" },
		]);
	}).pipe(Effect.provide(file({ filename: ":memory:", seed: "log" }))),
);
