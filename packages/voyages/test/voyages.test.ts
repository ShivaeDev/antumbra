import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, PubSub } from "effect";

const layer = Voyages.layer.pipe(Layer.provideMerge(DomainFeedsLive));
const reef = { backend: "scripted", context: "the reef is uncharted", name: "Chart the reef", northStar: "every shoal is known" };

it.effectDB("opens a voyage with durable direction and publishes its changes", function* (db) {
	yield* Effect.gen(function* () {
		const voyages = yield* Voyages;
		const feeds = yield* DomainFeeds;
		const notices = yield* feeds.subscribeVoyageRefresh();
		const voyage = yield* voyages.open(reef);
		expect(voyage).toMatchObject({ captainBackend: "scripted", crewBackend: "scripted", focusedAt: null, kind: "voyage", name: reef.name });
		expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first())).toEqual(voyage);
		expect(yield* PubSub.take(notices)).toBeUndefined();
		yield* voyages.verifyExists(voyage.id);
		yield* voyages.setFocus(voyage.id, true);
		expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first()).focusedAt).toBeInstanceOf(Date);
		expect(yield* PubSub.take(notices)).toBeUndefined();
		yield* voyages.setFocus(voyage.id, false);
		expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first()).focusedAt).toBeNull();
		expect(yield* PubSub.take(notices)).toBeUndefined();
	}).pipe(Effect.provide(layer), Effect.scoped);
});

it.effectDB("switches each backend without changing the other", function* (db) {
	yield* Effect.gen(function* () {
		const voyages = yield* Voyages;
		const voyage = yield* voyages.open(reef);
		yield* voyages.setCaptainBackend(voyage.id, "codex");
		expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first())).toMatchObject({ captainBackend: "codex", crewBackend: "scripted" });
		yield* voyages.setCrewBackend(voyage.id, "claude");
		expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first())).toMatchObject({ captainBackend: "codex", crewBackend: "claude" });
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses direction changes to an absent voyage", function* () {
	yield* Effect.gen(function* () {
		const voyages = yield* Voyages;
		expect(yield* Effect.flip(voyages.setCaptainBackend("missing", "codex"))).toMatchObject({ _tag: "VoyageNotFound" });
		expect(yield* Effect.flip(voyages.setCrewBackend("missing", "codex"))).toMatchObject({ _tag: "VoyageNotFound" });
		expect(yield* Effect.flip(voyages.setFocus("missing", true))).toMatchObject({ _tag: "VoyageNotFound" });
	}).pipe(Effect.provide(layer));
});

it.effectDB("later boot leaves the standing flagship alone", function* (db) {
	yield* Effect.gen(function* () {
		const voyages = yield* Voyages;
		yield* voyages.ensureFlagship(reef);
		const first = Option.getOrThrow(yield* db.Voyage.where({ kind: "flagship" }).first());
		expect(first).toMatchObject({ name: reef.name, captainBackend: "scripted", crewBackend: "scripted", focusedAt: null });
		yield* voyages.setCaptainBackend(first.id, "codex");
		yield* voyages.ensureFlagship(reef);
		const standing = yield* db.Voyage.where({ kind: "flagship" }).all();
		expect(standing).toHaveLength(1);
		expect(standing[0]).toMatchObject({ id: first.id, captainBackend: "codex" });
	}).pipe(Effect.provide(layer));
});
