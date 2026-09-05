import { changesLayer } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { RulingsLive } from "@antumbra/rulings";
import { RoleSettings } from "@antumbra/settings";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { FlagshipLive } from "#flagship.ts";
import { VoyageSummaries } from "#voyage/summaries/service.ts";
import { summarySeen } from "#voyage-projection.ts";

const summaryLayer = VoyageSummaries.layer.pipe(
	Layer.provideMerge(
		changesLayer(new Map(), new Map()).pipe(
			Layer.provideMerge(PiecesLive),
			Layer.provideMerge(Voyages.layer),
			Layer.provideMerge(ReposLive),
			Layer.provideMerge(RulingsLive),
			Layer.provideMerge(RoleSettings.layer),
			Layer.provideMerge(DomainFeedsLive),
		),
	),
);

const boot = Effect.void.pipe(Effect.provide(FlagshipLive), Effect.provide(Voyages.layer), Effect.provide(DomainFeedsLive));

const readSummaries = Effect.gen(function* () {
	const source = yield* VoyageSummaries;
	return yield* source.read();
}).pipe(Effect.provide(summaryLayer));

const readSummaryFailure = Effect.gen(function* () {
	const source = yield* VoyageSummaries;
	return yield* Effect.flip(source.read());
}).pipe(Effect.provide(summaryLayer));

it.effectDB("the fleet is born sailing under a flagship", function* (db) {
	yield* boot;

	const flagships = yield* db.Voyage.where({ kind: "flagship" }).all();
	expect(flagships.length).toBe(1);
	expect(flagships[0]?.name).toBe("Flagship");
	expect(flagships[0]?.northStar).toBe("The fleet sails well.");
});

it.effectDB("boot writes the row and spawns no captain", function* (db) {
	yield* boot;

	expect((yield* db.Agent.all()).length).toBe(0);
	expect((yield* db.AgentSession.all()).length).toBe(0);
	expect((yield* db.VoyageAgent.all()).length).toBe(0);
});

it.effectDB("a voyage carries its kind out of the record", function* (db) {
	yield* boot;
	yield* db.Voyage.create({
		context: "the reef is uncharted",
		focusedAt: null,
		id: "voyage-reef",
		kind: "voyage",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});

	const summaries = yield* readSummaries;
	const kinds = new Map(summaries.map((voyage) => [voyage.name, voyage.kind] as const));
	expect(kinds.get("Flagship")).toBe("flagship");
	expect(kinds.get("Chart the reef")).toBe("voyage");
});

it.effectDB("the flagship reaches a window as what it is", function* () {
	yield* boot;

	const summaries = (yield* readSummaries).map(summarySeen);
	expect(summaries.map((summary) => summary.kind)).toEqual(["flagship"]);
});

it.effectDB("a stored kind nothing knows is refused", function* (db) {
	yield* db.Voyage.create({
		context: "written by a later release",
		focusedAt: null,
		id: "voyage-tender",
		kind: "tender",
		name: "Tend the fleet",
		northStar: "the fleet is supplied",
	});

	expect(yield* readSummaryFailure).toMatchObject({
		_tag: "StoredVoyageKindInvalid",
		value: "tender",
		voyageId: "voyage-tender",
	});
});
