import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue, type SQLOutputValue } from "node:sqlite";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { DevTraceLive } from "#layer.ts";
import { TRACE_DATABASE_FILE } from "#sink.ts";

const temporaryDirectory = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-trace-sink-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

const readRows = (directory: string, sql: string, parameters: readonly SQLInputValue[]): readonly Record<string, SQLOutputValue>[] => {
	const database = new DatabaseSync(join(directory, TRACE_DATABASE_FILE));
	const rows = database.prepare(sql).all(...parameters);
	database.close();
	return rows;
};

// why: closing the composed Layer is what a run ending looks like, and the sink
// flushes what it still holds on the way out. Reading the file before that
// would be reading a buffer, not a trace.
const wholeRun = <A, E>(directory: string, program: Effect.Effect<A, E>) =>
	Effect.scoped(Effect.provide(program, DevTraceLive({ appVersion: "0.0.0-test", dataDirectory: directory })));

const attachment = (sessionId: string) =>
	Effect.succeed(sessionId).pipe(
		Effect.withSpan("fabric.confirmIdentity"),
		Effect.withSpan("fabric.openAttachment"),
		Effect.annotateSpans({ sessionId }),
	);

const readThroughOrm = (sessionId: string) =>
	Effect.void.pipe(
		Effect.withSpan("prisma.Intent.all", {
			attributes: { "db.system": "postgresql" },
		}),
		Effect.withSpan("fabric.openAttachment"),
		Effect.annotateSpans({ sessionId }),
	);

describe("dev trace sink", () => {
	it.effect("makes a run's spans queryable by the Session they belong to", () =>
		Effect.gen(function* () {
			const directory = yield* temporaryDirectory;
			yield* wholeRun(directory, attachment("session-a"));
			const rows = readRows(directory, "SELECT name, status, parent_span_id FROM spans WHERE session_id = ? ORDER BY name", ["session-a"]);
			expect(rows.map((row) => row.name)).toEqual(["fabric.confirmIdentity", "fabric.openAttachment"]);
			expect(rows.every((row) => row.status === "success")).toBe(true);
			expect(typeof rows[0]?.parent_span_id).toBe("string");
		}),
	);

	it.effect("keeps a log entry against the span it was written inside", () =>
		Effect.gen(function* () {
			const directory = yield* temporaryDirectory;
			yield* wholeRun(
				directory,
				Effect.logDebug("opening the attachment").pipe(Effect.withSpan("fabric.openAttachment"), Effect.annotateSpans({ sessionId: "session-c" })),
			);
			const rows = readRows(
				directory,
				`SELECT logs.level, logs.message FROM logs
				JOIN spans ON spans.span_id = logs.span_id AND spans.run_id = logs.run_id
				WHERE spans.session_id = ?`,
				["session-c"],
			);
			expect(rows[0]?.level).toBe("Debug");
			expect(rows[0]?.message).toBe("opening the attachment");
		}),
	);

	it.effect("prunes every run older than the five it retains", () =>
		Effect.gen(function* () {
			const directory = yield* temporaryDirectory;
			for (const index of [0, 1, 2, 3, 4, 5, 6]) {
				yield* wholeRun(directory, attachment(`session-${index}`));
				yield* TestClock.adjust("1 minute");
			}
			const runs = readRows(directory, "SELECT run_id FROM runs", []);
			expect(runs.length).toBe(5);
			const sessions = readRows(directory, "SELECT DISTINCT session_id FROM spans ORDER BY session_id", []);
			expect(sessions.map((row) => row.session_id)).toEqual(["session-2", "session-3", "session-4", "session-5", "session-6"]);
		}),
	);

	it.effect("records the domain's spans and not the ORM's query spans", () =>
		Effect.gen(function* () {
			const directory = yield* temporaryDirectory;
			yield* wholeRun(directory, readThroughOrm("session-d"));
			const rows = readRows(directory, "SELECT name, session_id FROM spans ORDER BY name", []);
			expect(rows.map((row) => row.name)).toEqual(["fabric.openAttachment"]);
			expect(rows[0]?.session_id).toBe("session-d");
		}),
	);
});
