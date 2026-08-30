import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Repos, ReposLive, repoName, repoSlug } from "@antumbra/repos";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, PubSub } from "effect";

const persistence = persistenceIt();
const layer = ReposLive.pipe(Layer.provideMerge(DomainFeedsLive));
const OBSERVED = new Date("2026-08-17T00:00:00.000Z");

const seedChangeGraph = (repoId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Change.create({
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
			originSessionId: null,
			preparedHeadRef: null,
			preparedHeadSha: null,
			proposalFrozenAt: null,
			raw: null,
			repoId,
			review: "none",
			stage: "open",
			submissionKey: null,
			title: "change-1",
			url: null,
			withdrawnAt: null,
			workingDiff: null,
			workingTreeStatus: null,
			worktreePath: null,
		});
		yield* db.ChangeTransition.create({
			activityAt: OBSERVED,
			changeId: "change-1",
			fromStage: "prepared",
			id: "transition-1",
			observedAt: OBSERVED,
			toStage: "open",
		});
		yield* db.PieceChange.create({
			changeId: "change-1",
			pieceId: "piece-1",
		});
	});

it("derives the existing registration name from local and remote sources", () => {
	expect(repoName("/somewhere/reef.git/")).toBe("reef");
	expect(repoName("git@example.invalid:shoals.git")).toBe("shoals");
	expect(repoName("/")).toBe("repo");
});

it("lowers the same name into the one spelling a folder and a ref carry", () => {
	expect(repoSlug("/somewhere/Reef-Charts.git/")).toBe("reef-charts");
	expect(repoSlug("git@example.invalid:Deep Shoals.git")).toBe("deep-shoals");
	expect(repoSlug("/")).toBe("repo");
});

persistence.effectDB("updates repeat registration and publishes registry changes", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const repos = yield* Repos;
			const notices = yield* feeds.subscribeFleetRefresh();
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
});

persistence.effectDB("refuses a second source that would berth in the first source's folder", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const repos = yield* Repos;
			yield* repos.register({
				defaultRef: "main",
				source: "/reefs/Reef-Charts",
			});
			const refusal = yield* Effect.flip(
				repos.register({
					defaultRef: "main",
					source: "git@example.invalid:crew/reef-charts.git",
				}),
			);
			expect(refusal.message).toContain("/reefs/Reef-Charts");
			expect(refusal.message).toContain("reef-charts");
			expect(yield* db.Repo.all()).toHaveLength(1);
		}),
	).pipe(Effect.provide(layer));
});

persistence.effectDB("forgets the complete change graph before publishing its two projections", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const repos = yield* Repos;
			const fleetNotices = yield* feeds.subscribeFleetRefresh();
			const voyageNotices = yield* feeds.subscribeVoyageRefresh();
			const repo = yield* repos.register({
				defaultRef: "main",
				source: "/reefs/one",
			});
			yield* PubSub.take(fleetNotices);
			yield* seedChangeGraph(repo.id);

			yield* repos.forget(repo.id);

			expect(yield* PubSub.take(fleetNotices)).toBeUndefined();
			expect(yield* PubSub.take(voyageNotices)).toBeUndefined();
			expect(yield* db.Repo.all()).toEqual([]);
			expect(yield* db.Change.all()).toEqual([]);
			expect(yield* db.ChangeTransition.all()).toEqual([]);
			expect(yield* db.PieceChange.all()).toEqual([]);
		}),
	).pipe(Effect.provide(layer));
});
