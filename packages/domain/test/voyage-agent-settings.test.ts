import { Pieces } from "@antumbra/pieces";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const opened = {
	backend: "scripted",
	captainEffort: "high",
	captainModel: "opus",
	context: "the reef is uncharted",
	crewEffort: "low",
	crewModel: "haiku",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

const recordingReach = (submissions: Ref.Ref<ReadonlyArray<SpawnFields>>) => ({
	...fakeKernelReach,
	submitSpawn: (payload: SpawnFields) => Ref.update(submissions, (current) => [...current, payload]).pipe(Effect.as("spawn-intent")),
});

it.live("a voyage opened with a model and an effort per role stores and shows both", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const voyages = yield* VoyageProcedureService;
			const voyage = yield* voyages.open(opened);
			expect(voyage).toMatchObject({
				captainEffort: "high",
				captainModel: "opus",
				crewEffort: "low",
				crewModel: "haiku",
			});
			expect(Option.getOrThrow(yield* voyages.read(voyage.id))).toMatchObject({
				captainEffort: "high",
				captainModel: "opus",
				crewEffort: "low",
				crewModel: "haiku",
			});
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));
	}),
);

it.live("changing a role's settings reaches the sessions spawned after it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const submissions = yield* Ref.make<ReadonlyArray<SpawnFields>>([]);
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyages = yield* VoyageProcedureService;
			const voyage = yield* voyages.open(opened);

			yield* voyages.hail(voyage.id);
			yield* voyages.setAgentSettings(voyage.id, "captain", { effort: "max", model: "sonnet" });
			yield* voyages.hail(voyage.id);

			const piece = yield* pieces.charter({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: voyage.id,
			});
			yield* voyages.setAgentSettings(voyage.id, "crew", { effort: null, model: null });
			yield* voyages.workNow(piece.id);

			expect((yield* Ref.get(submissions)).map(({ effort, model }) => ({ effort, model }))).toEqual([
				{ effort: "high", model: "opus" },
				{ effort: "max", model: "sonnet" },
				{},
			]);
		}).pipe(Effect.provide(domainCapabilityLayer(temporary, recordingReach(submissions))));
	}),
);
