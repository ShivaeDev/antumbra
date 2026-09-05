import { DomainFeeds } from "@antumbra/domain-feeds";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";

const reef = { context: "the reef is uncharted", name: "Chart the reef", northStar: "every shoal is known" };

it.effectApp("opens a voyage with durable direction and publishes its changes", function* ({ db }) {
	const voyages = yield* Voyages;
	const feeds = yield* DomainFeeds;
	const notices = yield* feeds.subscribeVoyageRefresh();
	const voyage = yield* voyages.open(reef);
	expect(voyage).toMatchObject({ focusedAt: null, kind: "voyage", name: reef.name });
	expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first())).toEqual(voyage);
	expect(yield* PubSub.take(notices)).toBeUndefined();
	yield* voyages.verifyExists(voyage.id);
	yield* voyages.setFocus(voyage.id, true);
	expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first()).focusedAt).toBeInstanceOf(Date);
	expect(yield* PubSub.take(notices)).toBeUndefined();
	yield* voyages.setFocus(voyage.id, false);
	expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first()).focusedAt).toBeNull();
	expect(yield* PubSub.take(notices)).toBeUndefined();
});

it.effectApp("refuses direction changes to an absent voyage", function* () {
	const voyages = yield* Voyages;
	expect(yield* Effect.flip(voyages.setFocus("missing", true))).toMatchObject({ _tag: "VoyageNotFound" });
});

it.effectApp("later boot leaves the standing flagship alone", function* ({ db }) {
	const voyages = yield* Voyages;
	const first = Option.getOrThrow(yield* db.Voyage.where({ kind: "flagship" }).first());
	expect(first).toMatchObject({ name: "Flagship", focusedAt: null });
	yield* voyages.ensureFlagship(reef);
	const standing = yield* db.Voyage.where({ kind: "flagship" }).all();
	expect(standing).toHaveLength(1);
	expect(standing[0]).toMatchObject({ id: first.id });
});
