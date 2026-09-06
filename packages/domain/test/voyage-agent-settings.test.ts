import { Pieces } from "@antumbra/pieces";
import { RoleSettings } from "@antumbra/settings";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const opened = {
	captainBackend: "scripted",
	captainEffort: "high",
	captainModel: "opus",
	context: "the reef is uncharted",
	crewBackend: "scripted",
	crewEffort: "low",
	crewModel: "haiku",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

const recordingReach = (submissions: Ref.Ref<ReadonlyArray<SpawnFields>>) => ({
	...fakeKernelReach,
	submitSpawn: (payload: SpawnFields) => Ref.update(submissions, (current) => [...current, payload]).pipe(Effect.as("spawn-intent")),
});

it.live("a voyage opened with settings per role shows them as its own", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const voyages = yield* VoyageProcedureService;
			const voyage = yield* voyages.open(opened);
			expect(Option.getOrThrow(yield* voyages.read(voyage.id))).toMatchObject({
				captainSettings: { backend: "scripted", effort: "high", model: "opus" },
				crewSettings: { backend: "scripted", effort: "low", model: "haiku" },
			});
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));
	}),
);

it.live("each spawn carries the settings its role resolves to when it is spawned", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const submissions = yield* Ref.make<ReadonlyArray<SpawnFields>>([]);
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyages = yield* VoyageProcedureService;
			const roles = yield* RoleSettings;
			const voyage = yield* voyages.open(opened);

			yield* voyages.hail(voyage.id);
			yield* roles.changeForVoyage(voyage.id, "captain", { backend: "codex", effort: "max", model: "sonnet" });
			yield* voyages.hail(voyage.id);

			const piece = yield* pieces.charter({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: voyage.id,
			});
			yield* roles.changeDefault("crew", { backend: "codex", effort: "medium", model: "gpt-5" });
			yield* roles.changeForVoyage(voyage.id, "crew", { backend: null, effort: null, model: null });
			yield* voyages.workNow(piece.id);

			expect((yield* Ref.get(submissions)).map(({ backend, effort, model }) => ({ backend, effort, model }))).toEqual([
				{ backend: "scripted", effort: "high", model: "opus" },
				{ backend: "codex", effort: "max", model: "sonnet" },
				{ backend: "codex", effort: "medium", model: "gpt-5" },
			]);
		}).pipe(Effect.provide(domainCapabilityLayer(temporary, recordingReach(submissions))));
	}),
);
