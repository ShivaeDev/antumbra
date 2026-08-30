import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { selectDevTracing } from "#adapters/tracing.ts";

const TRACE_DATABASE = "traces.db";

const composed = (isPackaged: boolean) => {
	const dataDirectory = mkdtempSync(join(tmpdir(), "antumbra-desktop-trace-"));
	const traced = Effect.succeed("worked").pipe(Effect.withSpan("desktop.startOwner"));
	const answer = Effect.runSync(
		Effect.scoped(
			Effect.provide(
				traced,
				selectDevTracing({
					appVersion: "0.0.0-test",
					dataDirectory,
					isPackaged,
				}),
			),
		),
	);
	const wrote = existsSync(join(dataDirectory, TRACE_DATABASE));
	rmSync(dataDirectory, { force: true, recursive: true });
	return { answer, wrote };
};

it("gives a packaged run no tracer and no trace database", () => {
	expect(composed(true)).toEqual({ answer: "worked", wrote: false });
});

it("gives a dev run a tracer that records into its data directory", () => {
	expect(composed(false)).toEqual({ answer: "worked", wrote: true });
});
