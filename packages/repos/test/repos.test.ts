import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Writer } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Repos, ReposLive, repoName } from "@antumbra/repos";
import { expect } from "@effect/vitest";
import { Effect, Layer, PubSub } from "effect";
import { it } from "vitest";

const persistence = persistenceIt();
const layer = ReposLive.pipe(Layer.provideMerge(DomainFeedsLive));
const OBSERVED = new Date("2026-08-17T00:00:00.000Z");

it("derives the existing registration name from local and remote sources", () => {
	expect(repoName("/somewhere/reef.git/")).toBe("reef");
	expect(repoName("git@example.invalid:shoals.git")).toBe("shoals");
	expect(repoName("/")).toBe("repo");
});

persistence.effectDB(
	"owns repeat registration and publishes committed registry changes",
	function* (db) {
		yield* Effect.scoped(
			Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				const repos = yield* Repos;
				const notices = yield* PubSub.subscribe(feeds.fleet);
				const first = yield* repos.register({
					defaultRef: "main",
					source: "/reefs/one",
				});
				expect(yield* PubSub.take(notices)).toBeUndefined();
				const refreshed = yield* repos.register({
					defaultRef: "trunk",
					source: "/reefs/one",
				});
				expect(yield* PubSub.take(notices)).toBeUndefined();

				expect(refreshed.id).toBe(first.id);
				expect(yield* repos.list).toEqual([
					{
						defaultRef: "trunk",
						id: first.id,
						name: "one",
						source: "/reefs/one",
					},
				]);
				expect(yield* db.Repo.all()).toHaveLength(1);
			}),
		).pipe(Effect.provide(layer));
	},
);

persistence.effectDB(
	"forgets the complete change graph before publishing its two projections",
	function* (db) {
		yield* Effect.scoped(
			Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				const repos = yield* Repos;
				const writer = yield* Writer;
				const fleetNotices = yield* PubSub.subscribe(feeds.fleet);
				const voyageNotices = yield* PubSub.subscribe(feeds.voyages);
				const repo = yield* repos.register({
					defaultRef: "main",
					source: "/reefs/one",
				});
				yield* PubSub.take(fleetNotices);
				yield* writer.write(
					Effect.all([
						db.Change.create({
							activityAt: OBSERVED,
							baseRef: "main",
							body: "",
							checks: "none",
							draftAt: null,
							externalId: "1",
							headRef: "work/reef",
							headSha: null,
							host: "scripted",
							id: "change-1",
							landedAt: null,
							mergeable: "clean",
							observedAt: OBSERVED,
							openedByAgentId: null,
							preparedHeadRef: null,
							preparedHeadSha: null,
							proposalFrozenAt: null,
							raw: null,
							repoId: repo.id,
							review: "none",
							stage: "open",
							submissionKey: null,
							title: "change-1",
							url: null,
							withdrawnAt: null,
							workingDiff: null,
							workingTreeStatus: null,
							worktreePath: null,
						}),
						db.ChangeTransition.create({
							activityAt: OBSERVED,
							changeId: "change-1",
							fromStage: "prepared",
							id: "transition-1",
							observedAt: OBSERVED,
							toStage: "open",
						}),
						db.PieceChange.create({
							changeId: "change-1",
							pieceId: "piece-1",
						}),
					]),
				);

				yield* repos.forget(repo.id);

				expect(yield* PubSub.take(fleetNotices)).toBeUndefined();
				expect(yield* PubSub.take(voyageNotices)).toBeUndefined();
				expect(yield* db.Repo.all()).toEqual([]);
				expect(yield* db.Change.all()).toEqual([]);
				expect(yield* db.ChangeTransition.all()).toEqual([]);
				expect(yield* db.PieceChange.all()).toEqual([]);
			}),
		).pipe(Effect.provide(layer));
	},
);
