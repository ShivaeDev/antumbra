import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { FLAGSHIP_REQUEST } from "@antumbra/domain-voyages/ids.ts";
import { Database } from "@antumbra/persistence";
import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import { it } from "@antumbra/server/testing/entry.ts";
import { Effect, Layer, Option, PubSub } from "effect";
import { expect } from "vitest";
import { voyagesOver } from "#adapters/voyages.ts";

const reef = {
	context: "the reef is uncharted",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

const flagship = {
	context: "Fleet-level rulings and findings belong here.",
	name: "Flagship",
	northStar: "The fleet sails well.",
};

const fleetStore = Effect.map(acquireTemporaryPersistence, (temporary) => Layer.merge(DomainFeedsLive, temporary.layer));

const adapterOver = <Reach extends Parameters<typeof voyagesOver>[0]>(reach: Reach) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		return { feeds, voyages: voyagesOver(reach, yield* Database, feeds) };
	});

it.app("opens a voyage the journal keeps and tells the old list to refresh", function* (harness) {
	const layer = yield* fleetStore;
	yield* Effect.provide(
		Effect.gen(function* () {
			const { feeds, voyages: sailed } = yield* adapterOver(harness.api);
			const refreshed = yield* feeds.subscribeVoyageRefresh();
			const opened = yield* sailed.open({ ...reef, captainBackend: "claude", captainEffort: "high", captainModel: "opus" });

			expect(opened).toMatchObject({ kind: "voyage", name: "Chart the reef", northStar: "every shoal is known" });
			expect(yield* PubSub.takeUpTo(refreshed, 2)).toHaveLength(1);
			expect(yield* harness.rows.voyage.count({})).toBe(1);
			expect(Option.getOrThrow(yield* sailed.byId(opened.id)).context).toBe("the reef is uncharted");
		}),
		layer,
	);
});

it.app("opens the flagship once, under the request id the journal already answered", function* (harness) {
	const layer = yield* fleetStore;
	yield* Effect.provide(
		Effect.gen(function* () {
			const { voyages: sailed } = yield* adapterOver(harness.api);
			yield* sailed.ensureFlagship(flagship);
			yield* sailed.ensureFlagship(flagship);

			const [opened] = yield* harness.rows.voyage.where({});
			expect(opened).toMatchObject({ id: FLAGSHIP_REQUEST, kind: "flagship", name: "Flagship" });
			expect(yield* harness.rows.voyage.count({})).toBe(1);
		}),
		layer,
	);
});

it.app("refuses focus on a voyage the journal does not hold", function* (harness) {
	const layer = yield* fleetStore;
	yield* Effect.provide(
		Effect.gen(function* () {
			const { voyages: sailed } = yield* adapterOver(harness.api);
			const refused = yield* Effect.flip(sailed.setFocus("voyage-nowhere", true));

			expect(refused).toMatchObject({ _tag: "VoyageNotFound", voyageId: "voyage-nowhere" });
			yield* Effect.flip(sailed.verifyExists("voyage-nowhere"));
		}),
		layer,
	);
});
