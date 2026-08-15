import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { makeAppRouter } from "#index.ts";
import { makeRuntime, reefSummary, reefView } from "#test/stub-sources.ts";

const callerOf = () =>
	makeAppRouter(makeRuntime()).createCaller({ senderId: 7 });

describe("makeAppRouter, on voyages", () => {
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
