import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { LiveDelegations, LiveDelegationsLive } from "#session-tree-live.ts";

describe("LiveDelegations", () => {
	it.effect("shares one registry and removes only settled roots", () =>
		Effect.gen(function* () {
			const writer = yield* LiveDelegations;
			const reader = yield* LiveDelegations;

			yield* writer.began("root", "first");
			yield* writer.began("root", "second");
			yield* writer.began("other", "node");
			expect(yield* reader.delegating()).toEqual(new Set(["root", "other"]));

			yield* reader.ended("root", "first");
			expect(yield* writer.delegating()).toEqual(new Set(["root", "other"]));

			yield* reader.ended("root", "second");
			expect(yield* writer.delegating()).toEqual(new Set(["other"]));

			yield* writer.released("other");
			expect(yield* reader.delegating()).toEqual(new Set());
		}).pipe(Effect.provide(LiveDelegationsLive, { local: true })),
	);
});
