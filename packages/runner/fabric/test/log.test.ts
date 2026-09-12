import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Stream } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { LogDatabase, makeLog, RunnerLog } from "#log.ts";
import { recover } from "#recover.ts";
import { file } from "#test/database.ts";

it.effect("keeps one ordered log across sessions and reopens stored request evidence", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const sql = yield* SqliteClient.make({ filename: ":memory:" });
			const log = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, sql));
			yield* log.append({ type: "SessionSlept", requestId: "sleep-a", sessionId: "a" });
			yield* log.append({ type: "SessionSlept", requestId: "sleep-b", sessionId: "b" });
			const reopened = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, sql));
			expect((yield* reopened.read(-1)).map(({ cursor }) => cursor)).toEqual([0, 1]);
			expect((yield* reopened.read(0)).map(({ event }) => event)).toEqual([{ type: "SessionSlept", requestId: "sleep-b", sessionId: "b" }]);
			expect((yield* reopened.request("sleep-a")).map(({ cursor }) => cursor)).toEqual([0]);
		}),
	).pipe(Effect.provide(reactivityLayer)),
);

it.effect("streams stored entries followed by new committed entries", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const sql = yield* SqliteClient.make({ filename: ":memory:" });
			const log = yield* makeLog("runner-log").pipe(Effect.provideService(LogDatabase, sql));
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
	}).pipe(Effect.provide(file({ filename: ":memory:", logId: "log" }))),
);
