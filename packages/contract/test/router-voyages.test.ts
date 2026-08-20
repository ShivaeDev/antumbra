import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { makeRuntime, reefSummary, reefView } from "#fixtures.ts";
import { makeAppRouter } from "#index.ts";

const callerOf = () =>
	makeAppRouter(makeRuntime()).createCaller({ windowId: "console" });

describe("makeAppRouter, on voyages", () => {
	it.effect("reads verified Artifact Markdown on demand", () =>
		Effect.gen(function* () {
			const artifact = yield* Effect.promise(() =>
				callerOf().artifactMarkdown({ artifactId: "artifact-chart" }),
			);
			expect(artifact.markdown).toBe("# The chart\n");
		}),
	);

	it.effect("reads a landed report body on demand", () =>
		Effect.gen(function* () {
			const report = yield* Effect.promise(() =>
				callerOf().reportMarkdown({ reportId: "report-soundings" }),
			);
			expect(report.authorAgentId).toBe("agent-sounder");
			expect(report.markdown).toContain(
				"The eastern shoal is steeper than charted.",
			);
		}),
	);

	it.effect(
		"a report nobody landed surfaces as an error, not an empty body",
		() =>
			Effect.gen(function* () {
				const outcome = yield* Effect.tryPromise(() =>
					callerOf().reportMarkdown({ reportId: "ghost" }),
				).pipe(Effect.flip);
				expect(String(outcome.cause)).toContain("no such report: ghost");
			}),
	);

	it.effect("lists the voyages with their derived state and captain", () =>
		Effect.gen(function* () {
			const listed = yield* Effect.promise(() => callerOf().voyages());
			expect(listed).toEqual([reefSummary]);
		}),
	);

	it.effect("reads a voyage whole — pieces, crew and board", () =>
		Effect.gen(function* () {
			const read = yield* Effect.promise(() =>
				callerOf().voyage({ voyageId: "voyage-1" }),
			);
			expect(read).toEqual(reefView);
		}),
	);

	it.effect(
		"a voyage nobody opened surfaces as an error, not an empty view",
		() =>
			Effect.gen(function* () {
				const outcome = yield* Effect.tryPromise(() =>
					callerOf().voyage({ voyageId: "ghost" }),
				).pipe(Effect.flip);
				expect(String(outcome.cause)).toContain("no such voyage: ghost");
			}),
	);

	it.effect("chartering a piece answers with the piece it made", () =>
		Effect.gen(function* () {
			const receipt = yield* Effect.promise(() =>
				callerOf().charterPiece({
					charter: "sound the northern shoals",
					dependsOn: [],
					expectation: "the depths are recorded",
					role: "hand",
					title: "soundings",
					voyageId: "voyage-1",
				}),
			);
			expect(receipt).toEqual({ pieceId: "piece-for-soundings" });
		}),
	);

	it.effect("the voyage feed carries the view to a watching window", () =>
		Effect.gen(function* () {
			const iterable = yield* Effect.promise(() =>
				callerOf().voyageFeed({ voyageId: "voyage-1" }),
			);
			const collected = yield* Stream.fromAsyncIterable(
				iterable,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected.map((view) => view.name)).toEqual([reefView.name]);
		}),
	);
});
