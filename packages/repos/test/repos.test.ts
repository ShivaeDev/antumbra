import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/persistence/testing";
import { Repos, ReposLive, repoSlug } from "@antumbra/repos";
import { expect } from "@effect/vitest";
import { Effect, Layer, PubSub } from "effect";
import { repoName } from "#repo-name.ts";

const layer = ReposLive.pipe(Layer.provideMerge(DomainFeedsLive));
const OBSERVED = new Date("2026-08-17T00:00:00.000Z");

const seedChangeGraph = (repoId: string, changeId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Change.create({
			activityAt: OBSERVED,
			baseRef: "main",
			body: "",
			checks: "none",
			draftAt: null,
			externalId: changeId,
			headRef: "work/reef",
			headSha: null,
			host: "scripted",
			id: changeId,
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
			title: changeId,
			url: null,
			withdrawnAt: null,
			workingDiff: null,
			workingTreeStatus: null,
			worktreePath: null,
		});
		yield* db.ChangeTransition.create({
			activityAt: OBSERVED,
			changeId,
			fromStage: "prepared",
			id: `${changeId}-transition`,
			observedAt: OBSERVED,
			toStage: "open",
		});
		yield* db.PieceChange.create({
			changeId,
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

it.effectDB("updates repeat registration and publishes registry changes", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const repos = yield* Repos;
			const notices = yield* feeds.subscribeFleetRefresh();
			const first = yield* repos.register({
				defaultRef: "main",
				source: "/reefs/one",
			});
			yield* PubSub.take(notices);
			const refreshed = yield* repos.register({
				defaultRef: "trunk",
				source: "/reefs/one",
			});
			yield* PubSub.take(notices);

			expect(refreshed).toEqual({
				defaultRef: "trunk",
				id: first.id,
				name: "one",
				source: "/reefs/one",
			});
			expect(yield* db.Repo.all()).toMatchObject([
				{
					defaultRef: "trunk",
					id: first.id,
					name: "one",
					source: "/reefs/one",
				},
			]);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("refuses a second source that would berth in the first source's folder", function* (db) {
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

it.effectDB("forgets the complete change graph before publishing its two projections", function* (db) {
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
			const retained = yield* repos.register({ defaultRef: "main", source: "/repos/retained" });
			yield* PubSub.take(fleetNotices);
			yield* seedChangeGraph(repo.id, "removed-one");
			yield* seedChangeGraph(repo.id, "removed-two");
			yield* seedChangeGraph(retained.id, "retained");

			yield* repos.forget(repo.id);

			yield* PubSub.take(fleetNotices);
			yield* PubSub.take(voyageNotices);
			expect(yield* db.Repo.all()).toMatchObject([retained]);
			expect(yield* db.Change.select("id").all()).toEqual([{ id: "retained" }]);
			expect(yield* db.ChangeTransition.select("changeId").all()).toEqual([{ changeId: "retained" }]);
			expect(yield* db.PieceChange.select("changeId").all()).toEqual([{ changeId: "retained" }]);
		}),
	).pipe(Effect.provide(layer));
});
