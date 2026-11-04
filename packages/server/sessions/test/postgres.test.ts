import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const id = SessionId.make("session:postgres");
const started: LogEntry = {
	logId: "execution-story",
	cursor: 0,
	at: 100,
	event: {
		type: "SessionStarted",
		sessionId: id,
		requestId: "start",
		agentId: "hand",
		backend: "claude",
		cwd: "/berth",
		nativeRef: "provider-root",
		runnerId: "runner",
		toolSetVersion: "v1",
	},
};

postgresApp.it(
	"replays session evidence and accepts commands after seeding",
	[],
	function* ({ journal, replayJournal, api, executionHistory, rebuild }) {
		const legacy = yield* journal();
		const runner = yield* legacy.runner({ runnerId: "runner", logId: started.logId, backends: ["claude"], imageInputBackends: [] });
		yield* runner.append([started]);
		yield* replayJournal(legacy);
		expect(yield* api["sessions.reading"]({ id })).toMatchObject({ id, status: "open", attached: true });
		yield* api["sessions.request"]({
			requestId: Request.make("sleep"),
			sessionId: id,
			kind: "sleep",
			inputId: null,
			reason: "rest",
			requestedAt: new Date(100).toISOString(),
		});
		const operations = yield* api["sessions.operations"]({ sessionId: id });
		expect(operations).toHaveLength(1);
		yield* rebuild();
		expect(yield* api["sessions.operations"]({ sessionId: id })).toEqual(operations);
		const before = yield* executionHistory.read();
		expect(
			yield* Effect.flip(
				api["sessions.request"]({
					requestId: Request.make("repeat-sleep"),
					sessionId: id,
					kind: "sleep",
					inputId: null,
					reason: "rest",
					requestedAt: new Date(100).toISOString(),
				}),
			),
		).toMatchObject({ _tag: "Busy" });
		expect(yield* executionHistory.read()).toEqual(before);
	},
);

postgresApp.it(
	"publishes session changes after commit and discards rollback",
	[],
	function* ({ api, appendRunner, executionHistory, transaction, rollback, published, clearPublished }) {
		yield* clearPublished();
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* appendRunner(started.logId, [started]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["sessions.reading"]({ id })).toBeNull();
		expect(yield* executionHistory.cursor(started.logId)).toBe(-1);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["sessions.reading"]({ id })).toMatchObject({ status: "open" });
		expect(yield* published()).toEqual(expect.arrayContaining(["session", "session:hand", "sessionStartResult"]));
		yield* clearPublished();
		yield* rollback(
			api["sessions.stop"]({ requestId: Request.make("stop"), sessionId: id, reason: "hold", requestedAt: new Date(200).toISOString() }),
		);
		expect(yield* api["sessions.reading"]({ id })).toMatchObject({ stoppedAt: null });
		expect(yield* published()).toEqual([]);
	},
);
