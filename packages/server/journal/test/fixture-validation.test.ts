import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Effect } from "effect";
import { expect } from "vitest";

postgresApp.it("rejects an unknown captured fact instead of dropping it", [], function* ({ validateFixtureFacts }) {
	expect(yield* Effect.flip(validateFixtureFacts([{ name: "UnknownFeatureFact", payload: "{}" }]))).toMatchObject({
		_tag: "FixtureFactInvalid",
		name: "UnknownFeatureFact",
		seq: 1,
	});
});

postgresApp.it("rejects a captured fact whose payload does not match its declared version", [], function* ({ validateFixtureFacts }) {
	expect(yield* Effect.flip(validateFixtureFacts([{ name: "CountSet", payload: '{"key":"maxParallelSessions","count":"twelve"}' }]))).toMatchObject({
		_tag: "FixtureFactInvalid",
		name: "CountSet",
		seq: 1,
	});
});
