import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { makeRuntime, quayView } from "#fixtures.ts";
import { makeAppRouter } from "#index.ts";

const callerOf = () => makeAppRouter(makeRuntime()).createCaller({ windowId: "console" });

describe("makeAppRouter, on the quay", () => {
	it.effect("reads every open change with the hosts' capability", () =>
		Effect.gen(function* () {
			const read = yield* Effect.promise(() => callerOf().quay());
			expect(read).toEqual(quayView);
		}),
	);

	it.effect("the quay feed carries the view to a watching window", () =>
		Effect.gen(function* () {
			const iterable = yield* Effect.promise(() => callerOf().quayFeed());
			const collected = yield* Stream.fromAsyncIterable(iterable, (cause) => cause).pipe(Stream.runCollect);
			expect(collected.map((view) => view.rows.length)).toEqual([1]);
		}),
	);

	it.effect("adopting a change answers with the change it linked", () =>
		Effect.gen(function* () {
			const adopted = yield* Effect.promise(() =>
				callerOf().adoptChange({
					pieceId: "piece-1",
					repoName: "shoals",
					url: "https://github.test/shoals/pull/41",
				}),
			);
			expect(adopted.url).toBe("https://github.test/shoals/pull/41");
		}),
	);

	it.effect("a host that cannot act says so in its own words", () =>
		Effect.gen(function* () {
			const outcome = yield* Effect.tryPromise(() =>
				callerOf().adoptChange({
					pieceId: "piece-1",
					repoName: "shoals",
					url: "",
				}),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("github refused");
		}),
	);
});
