import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Effect, Exit, Fiber } from "effect";
import { expect } from "vitest";
import { answered } from "#answers.ts";
import { postgresApp } from "#postgres.ts";
import { entry, provider, raw, started } from "#test-support/execution-data.ts";

postgresApp.it(
	"acknowledges a concurrent batch replay without duplicate effects",
	[],
	function* ({ api, appendRunner, holdWrite, executionHistory, clearPublished, published, rebuild }) {
		const log = "batch-repeat";
		const entries = [started(log, 0, "root")];
		yield* clearPublished();
		const first = yield* holdWrite(appendRunner(log, entries));
		const repeat = yield* appendRunner(log, entries).pipe(Effect.forkScoped);
		expect(yield* first.blocked()).not.toHaveLength(0);
		expect(yield* executionHistory.cursor(log)).toBe(-1);
		expect(yield* answered(api["sessions.reading"]({ id: SessionId.make("root") }), "sessions.reading")).toBeNull();
		expect(yield* published()).toEqual([]);
		yield* first.commit();
		expect(yield* Fiber.join(repeat)).toBe(0);
		const history = yield* executionHistory.read();
		yield* clearPublished();
		expect(yield* appendRunner(log, entries)).toBe(0);
		expect(yield* executionHistory.read()).toEqual(history);
		expect(yield* published()).toEqual([]);
		yield* rebuild();
		expect(yield* executionHistory.cursor(log)).toBe(0);
		expect(yield* answered(api["sessions.reading"]({ id: SessionId.make("root") }), "sessions.reading")).toMatchObject({ status: "open" });
	},
);

postgresApp.it(
	"a rejected or rolled-back batch leaves no events, rows, receipts or cursor",
	[],
	function* ({ api, appendRunner, executionHistory, rollback, published, clearPublished }) {
		const log = "rejected-batch";
		const before = yield* executionHistory.read();
		yield* clearPublished();
		const rejected = yield* Effect.exit(appendRunner(log, [started(log, 0, "same"), started(log, 1, "same", "other")]));
		expect(Exit.isFailure(rejected)).toBe(true);
		expect(yield* executionHistory.cursor(log)).toBe(-1);
		expect(yield* answered(api["sessions.reading"]({ id: SessionId.make("same") }), "sessions.reading")).toBeNull();
		expect(yield* executionHistory.read()).toEqual(before);
		expect(yield* published()).toEqual([]);
		const entries = [started(log, 0, "same"), provider(log, 1, "same", { type: "message", role: "agent", text: "Sounding", raw })];
		yield* rollback(appendRunner(log, entries));
		expect(yield* executionHistory.cursor(log)).toBe(-1);
		expect(yield* answered(api["sessions.reading"]({ id: SessionId.make("same") }), "sessions.reading")).toBeNull();
		expect(yield* executionHistory.read()).toEqual(before);
		expect(yield* published()).toEqual([]);
		expect(yield* appendRunner(log, entries)).toBe(1);
		expect(yield* answered(api["sessions.transcriptSources"]({ id: SessionId.make("same") }), "sessions.transcriptSources")).toMatchObject({
			references: [{ cursor: 1, logId: log }],
		});
	},
);

postgresApp.it(
	"repeated observations stay quiet while provider references keep their journal sequence",
	[],
	function* ({ api, appendRunner, executionHistory, clearPublished, published }) {
		const log = "quiet-observations";
		yield* appendRunner(log, [
			started(log, 0, "quiet"),
			provider(log, 1, "quiet", { type: "message", role: "agent", text: "First", raw }),
			provider(log, 2, "quiet", { type: "message", role: "agent", text: "Second", raw }),
		]);
		expect((yield* executionHistory.read()).filter((event) => event.value._tag === "SessionObserved")).toHaveLength(2);
		expect(
			(yield* answered(api["sessions.transcriptSources"]({ id: SessionId.make("quiet") }), "sessions.transcriptSources")).references.map(
				(reference) => reference.sequence,
			),
		).toEqual([3, 4]);
		yield* clearPublished();
		expect(yield* appendRunner(log, [entry(log, 3, { type: "ResourceFailed", requestId: "failed", reason: "No process" })])).toBe(3);
		expect(yield* published()).toEqual([]);
	},
);
