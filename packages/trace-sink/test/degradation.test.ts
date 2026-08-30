import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Logger, Tracer } from "effect";
import { openTraceDatabase } from "#adapters/database.ts";
import { DevTraceLive } from "#layer.ts";
import { makeRecorder } from "#recorder.ts";
import { TRACE_DATABASE_FILE } from "#sink.ts";
import { makeRecordingTracer } from "#tracer.ts";

const temporaryDirectory = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-trace-degrade-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

const capturing = () => {
	const entries: string[] = [];
	return {
		layer: Logger.layer([
			Logger.make<unknown, void>((options) => {
				entries.push(String(options.message));
			}),
		]),
		standDowns: () => entries.filter((entry) => entry.includes("dev trace sink disabled")),
	};
};

describe("a trace sink that cannot write", () => {
	it.effect("costs an unopenable database one warning and nothing else", () =>
		Effect.gen(function* () {
			const capture = capturing();
			const absent = join(yield* temporaryDirectory, "no-such-directory");
			const answer = yield* Effect.scoped(
				Effect.provide(
					Effect.succeed("carried on").pipe(Effect.withSpan("run")),
					Layer.provide(
						DevTraceLive({
							appVersion: "0.0.0-test",
							dataDirectory: absent,
						}),
						capture.layer,
					),
				),
			);
			expect(answer).toBe("carried on");
			expect(capture.standDowns()).toHaveLength(1);
		}),
	);

	it.effect("says a refused write once and keeps the traced effect whole", () =>
		Effect.gen(function* () {
			const directory = yield* temporaryDirectory;
			const database = openTraceDatabase({
				appVersion: "0.0.0-test",
				path: join(directory, TRACE_DATABASE_FILE),
				runId: "run-under-test",
				startedAtMillis: 0,
			});
			database.close();
			const recorder = makeRecorder(database);
			const capture = capturing();
			const answer = yield* Effect.succeed("carried on").pipe(
				Effect.withSpan("run"),
				Effect.provideService(Tracer.Tracer, makeRecordingTracer(recorder)),
			);
			expect(answer).toBe("carried on");
			yield* Effect.provide(recorder.flush, capture.layer);
			yield* Effect.provide(recorder.flush, capture.layer);
			expect(capture.standDowns()).toHaveLength(1);
		}),
	);
});
