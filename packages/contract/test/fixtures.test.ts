import { describe, expect, it } from "@effect/vitest";
import { type Duration, Effect, Stream } from "effect";
import {
	makeRuntime,
	makeScriptedFeeds,
	reefView,
	staticFeeds,
} from "#fixtures.ts";
import { makeAppRouter } from "#index.ts";

const feeds = (beat: Duration.Input) =>
	makeAppRouter(makeRuntime(makeScriptedFeeds(beat)));

describe("the shipped fixtures", () => {
	it.effect("keeps the static feeds at a single snapshot", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime(staticFeeds);
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			const opened = yield* Effect.promise(() => caller.fleetFeed());
			const collected = yield* Stream.fromAsyncIterable(
				opened,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected).toHaveLength(1);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("scripts the fleet as a snapshot and two later updates", () =>
		Effect.gen(function* () {
			const caller = feeds("5 millis").createCaller({ windowId: "console" });
			const opened = yield* Effect.promise(() => caller.fleetFeed());
			const collected = yield* Stream.fromAsyncIterable(
				opened,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected.map((seen) => seen.agents.length)).toEqual([1, 2, 2]);
			expect(collected.map((seen) => seen.repos.length)).toEqual([1, 1, 2]);
		}),
	);

	it.effect(
		"scripts rulings that gain an urgent one and lose a ruled one",
		() =>
			Effect.gen(function* () {
				const caller = feeds("5 millis").createCaller({ windowId: "console" });
				const opened = yield* Effect.promise(() => caller.openRulingsFeed());
				const collected = yield* Stream.fromAsyncIterable(
					opened,
					(cause) => cause,
				).pipe(Stream.runCollect);
				expect(collected.map((seen) => seen.rulings.length)).toEqual([2, 3, 2]);
				expect(collected.at(-1)?.rulings.map((seen) => seen.id)).toEqual([
					"ruling-3",
					"ruling-2",
				]);
			}),
	);

	it.effect(
		"scripts a voyage that gains a board entry and a launched piece",
		() =>
			Effect.gen(function* () {
				const caller = feeds("5 millis").createCaller({ windowId: "console" });
				const opened = yield* Effect.promise(() =>
					caller.voyageFeed({ voyageId: reefView.id }),
				);
				const collected = yield* Stream.fromAsyncIterable(
					opened,
					(cause) => cause,
				).pipe(Stream.runCollect);
				expect(collected.map((seen) => seen.board.length)).toEqual([1, 2, 2]);
				expect(collected.at(-1)?.pieces.map((piece) => piece.state)).toEqual([
					"active",
					"active",
				]);
			}),
	);
});
