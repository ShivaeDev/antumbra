import { SightSource } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import { sightLayer } from "#test/sight-fixture.ts";

it.live("the fleet answers which models a backend offers and refuses a backend it does not run", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			expect(yield* sight.backendModels("scripted")).toEqual([
				{ efforts: ["low", "high"], id: "haiku", isDefault: true, name: "Haiku" },
				{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
			]);
			const refused = yield* Effect.flip(sight.backendModels("bottled-ship"));
			expect(refused.message).toContain("bottled-ship");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
