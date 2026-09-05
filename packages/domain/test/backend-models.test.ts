import { SightSource } from "@antumbra/contract";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { it } from "#test/runtime-harness.ts";

it.effectApp("the fleet answers which models a backend offers and refuses a backend it does not run", function* () {
	const sight = yield* SightSource;
	expect(yield* sight.backendModels("scripted")).toEqual([
		{ efforts: ["low", "high"], id: "haiku", isDefault: true, name: "Haiku" },
		{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
	]);
	const refused = yield* Effect.flip(sight.backendModels("bottled-ship"));
	expect(refused.message).toContain("bottled-ship");
});
