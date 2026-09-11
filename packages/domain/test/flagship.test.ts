import { changesLayer } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { RulingsLive } from "@antumbra/rulings";
import { scriptedRoleSettings, scriptedVoyages } from "@antumbra/testing-runtime";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { FlagshipLive } from "#flagship.ts";
import { VoyageSummaries } from "#voyage/summaries/service.ts";
import { summarySeen } from "#voyage-projection.ts";

const layer = FlagshipLive.pipe(
	Layer.provideMerge(VoyageSummaries.layer),
	Layer.provideMerge(changesLayer(new Map(), new Map())),
	Layer.provideMerge(PiecesLive),
	Layer.provideMerge(ReposLive),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(scriptedVoyages),
	Layer.provideMerge(scriptedRoleSettings),
	Layer.provideMerge(DomainFeedsLive),
);

const readSummaries = Effect.flatMap(VoyageSummaries, (source) => source.read());

const voyage = (id: string) => ({ context: id, id, name: id, northStar: id });

it.effectDB("the fleet is born sailing under a flagship", function* () {
	yield* Effect.gen(function* () {
		const sailing = yield* Voyages;
		const flagships = [];
		for (const opened of yield* sailing.list()) {
			if (opened.kind === "flagship") {
				flagships.push(opened);
			}
		}
		expect(flagships.length).toBe(1);
		expect(flagships[0]?.name).toBe("Flagship");
		expect(flagships[0]?.northStar).toBe("The fleet sails well.");
	}).pipe(Effect.provide(layer));
});

it.effectDB("boot opens the voyage and spawns no captain", function* (db) {
	yield* Effect.gen(function* () {
		expect((yield* db.Agent.all()).length).toBe(0);
		expect((yield* db.AgentSession.all()).length).toBe(0);
		expect((yield* db.VoyageAgent.all()).length).toBe(0);
	}).pipe(Effect.provide(layer));
});

it.effectDB("a voyage carries its kind out of the record", function* () {
	yield* Effect.gen(function* () {
		const sailing = yield* Voyages;
		yield* sailing.open(voyage("Chart the reef"));

		const summaries = yield* readSummaries;
		const kinds = new Map(summaries.map((opened) => [opened.name, opened.kind] as const));
		expect(kinds.get("Flagship")).toBe("flagship");
		expect(kinds.get("Chart the reef")).toBe("voyage");
	}).pipe(Effect.provide(layer));
});

it.effectDB("the flagship reaches a window as what it is", function* () {
	yield* Effect.gen(function* () {
		const summaries = (yield* readSummaries).map(summarySeen);
		expect(summaries.map((summary) => summary.kind)).toEqual(["flagship"]);
	}).pipe(Effect.provide(layer));
});
