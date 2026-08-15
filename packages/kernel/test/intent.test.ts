import { expect, it } from "@effect/vitest";
import { Effect, Ref, Result, Schema } from "effect";
import { WorkflowEngine } from "effect/unstable/workflow";
import { defineIntent } from "#intent.ts";

const GreetPayload = Schema.Struct({ name: Schema.String });

it.effect("round-trips a payload through the JSON column", () =>
	Effect.gen(function* () {
		const seen = yield* Ref.make<ReadonlyArray<string>>([]);
		const kind = defineIntent({
			execute: (payload) =>
				Ref.update(seen, (names) => [...names, payload.name]),
			payload: GreetPayload,
			tag: "test/greet",
		});
		const encoded = yield* kind.encode({ name: "umbra" });
		expect(JSON.parse(encoded)).toEqual({ name: "umbra" });
		yield* kind.registerWorkflow;
		yield* kind.run("intent-greet", encoded);
		expect(yield* Ref.get(seen)).toEqual(["umbra"]);
	}).pipe(Effect.provide(WorkflowEngine.layerMemory)),
);

it.effect("fails run when the stored payload does not decode", () =>
	Effect.gen(function* () {
		const kind = defineIntent({
			execute: () => Effect.void,
			payload: GreetPayload,
			tag: "test/strict",
		});
		yield* kind.registerWorkflow;
		const outcome = yield* Effect.result(kind.run("intent-strict", "not json"));
		expect(Result.isFailure(outcome)).toBe(true);
	}).pipe(Effect.provide(WorkflowEngine.layerMemory)),
);

it("defaults reclaim to requeue and honors an explicit abandon", () => {
	const options = {
		execute: () => Effect.void,
		payload: GreetPayload,
		tag: "test/policy",
	};
	expect(defineIntent(options).reclaim).toBe("requeue");
	expect(defineIntent({ ...options, reclaim: "abandon" }).reclaim).toBe(
		"abandon",
	);
});
