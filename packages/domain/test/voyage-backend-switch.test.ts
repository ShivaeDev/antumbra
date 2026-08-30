import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";

it.live("uses each voyage backend for future captain and crew spawns", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const submissions = yield* Ref.make<ReadonlyArray<SpawnFields>>([]);
		const reach = {
			...fakeKernelReach,
			submitSpawn: (payload: SpawnFields) => Ref.update(submissions, (current) => [...current, payload]).pipe(Effect.as("spawn-intent")),
		};
		yield* Effect.gen(function* () {
			const voyages = yield* VoyageProcedureService;
			const voyage = yield* voyages.open({
				backend: "scripted",
				context: "the reef is uncharted",
				name: "Chart the reef",
				northStar: "every shoal is known",
			});

			yield* voyages.hail(voyage.id);
			yield* voyages.setCaptainBackend(voyage.id, "codex");
			yield* voyages.hail(voyage.id);

			const piece = yield* voyages.charterPiece({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: voyage.id,
			});
			yield* voyages.setCrewBackend(voyage.id, "codex");
			yield* voyages.workNow(piece.id);

			expect((yield* Ref.get(submissions)).map(({ backend }) => backend)).toEqual(["scripted", "codex", "codex"]);
		}).pipe(Effect.provide(domainCapabilityLayer(temporary, reach)));
	}),
);
