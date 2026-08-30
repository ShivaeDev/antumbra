import { ChangesLive } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ensureFlagship } from "#flagship.ts";
import { summarySeen } from "#voyage-projection.ts";
import { voyageSummaries } from "#voyage-view.ts";
import { VoyageWorldSource, VoyageWorldSourceLive } from "#voyage-world.ts";

const it = persistenceIt();

const WorldLive = VoyageWorldSourceLive.pipe(
	Layer.provideMerge(
		ChangesLive(new Map(), new Map()).pipe(Layer.provideMerge(PiecesLive), Layer.provideMerge(RulingsLive), Layer.provideMerge(DomainFeedsLive)),
	),
);

const boot = Effect.provide(ensureFlagship, DomainFeedsLive);

const readWorld = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	return yield* source.read;
}).pipe(Effect.provide(WorldLive));

const readWorldFailure = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	return yield* Effect.flip(source.read);
}).pipe(Effect.provide(WorldLive));

it.effectDB("the fleet is born sailing under a flagship", function* (db) {
	yield* boot;

	const flagships = yield* db.Voyage.where({ kind: "flagship" }).all();
	expect(flagships.length).toBe(1);
	expect(flagships[0]?.name).toBe("Flagship");
	expect(flagships[0]?.northStar).toBe("The fleet sails well.");
	expect(flagships[0]?.captainBackend).toBe("claude");
	expect(flagships[0]?.crewBackend).toBe("claude");
});

it.effectDB("a later boot leaves the standing flagship alone", function* (db) {
	yield* boot;
	const first = yield* db.Voyage.where({ kind: "flagship" }).all();

	yield* boot;
	yield* boot;

	const standing = yield* db.Voyage.where({ kind: "flagship" }).all();
	expect(standing.length).toBe(1);
	expect(standing[0]?.id).toBe(first[0]?.id);
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
		captainBackend: "scripted",
		context: "the reef is uncharted",
		crewBackend: "scripted",
		focusedAt: null,
		id: "voyage-reef",
		kind: "voyage",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});

	const world = yield* readWorld;
	const kinds = new Map(world.voyages.map((voyage) => [voyage.name, voyage.kind] as const));
	expect(kinds.get("Flagship")).toBe("flagship");
	expect(kinds.get("Chart the reef")).toBe("voyage");
});

it.effectDB("the flagship reaches a window as what it is", function* () {
	yield* boot;

	const summaries = voyageSummaries(yield* readWorld).map(summarySeen);
	expect(summaries.map((summary) => summary.kind)).toEqual(["flagship"]);
});

it.effectDB("a stored kind nothing knows is refused", function* (db) {
	yield* db.Voyage.create({
		captainBackend: "scripted",
		context: "written by a later release",
		crewBackend: "scripted",
		focusedAt: null,
		id: "voyage-tender",
		kind: "tender",
		name: "Tend the fleet",
		northStar: "the fleet is supplied",
	});

	expect(yield* readWorldFailure).toMatchObject({
		_tag: "StoredVoyageKindInvalid",
		value: "tender",
		voyageId: "voyage-tender",
	});
});
