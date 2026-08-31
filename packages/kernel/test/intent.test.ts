import { expect, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";
import { defineIntent } from "#intent.ts";

const GreetPayload = Schema.Struct({ name: Schema.String });

it.effect("round-trips a payload through the JSON column", () =>
	Effect.gen(function* () {
		const seen = yield* Ref.make<ReadonlyArray<string>>([]);
		const kind = defineIntent({
			execute: (payload) => Ref.update(seen, (names) => [...names, payload.name]),
			payload: GreetPayload,
			tag: "test/greet",
		});
		const encoded = yield* kind.encode({ name: "umbra" });
		expect(JSON.parse(encoded)).toEqual({ name: "umbra" });
		yield* kind.run("intent-greet", encoded);
		expect(yield* Ref.get(seen)).toEqual(["umbra"]);
	}),
);

it("defaults reclaim to requeue and honors an explicit abandon", () => {
	const options = {
		execute: () => Effect.void,
		payload: GreetPayload,
		tag: "test/policy",
	};
	expect(defineIntent(options).reclaim).toBe("requeue");
	expect(defineIntent({ ...options, reclaim: "abandon" }).reclaim).toBe("abandon");
});
