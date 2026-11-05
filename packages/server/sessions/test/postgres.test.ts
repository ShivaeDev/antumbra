import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
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
		expect(yield* answered(api["sessions.reading"]({ id }), "sessions.reading")).toBeNull();
		expect(yield* executionHistory.cursor(started.logId)).toBe(-1);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["sessions.reading"]({ id }), "sessions.reading")).toMatchObject({ status: "open" });
		expect(yield* published()).toEqual(
			expect.arrayContaining([
				"session",
				...invalidationKeys([{ _tag: "Bucket", collection: "session", field: "agentId", value: "hand" }]),
				"sessionStartResult",
			]),
		);
		yield* clearPublished();
		yield* rollback(
			api["sessions.stop"]({ requestId: Request.make("stop"), sessionId: id, reason: "hold", requestedAt: new Date(200).toISOString() }),
		);
		expect(yield* answered(api["sessions.reading"]({ id }), "sessions.reading")).toMatchObject({ stoppedAt: null });
		expect(yield* published()).toEqual([]);
	},
);
