import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { applyMigrations, Database } from "@antumbra/persistence";
import { acquireTemporaryPersistence, packagedMigrationsDirectory, persistenceIt } from "@antumbra/persistence/testing";
import { Repos, ReposLive, repoName, repoSlug } from "@antumbra/repos";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, PubSub, Result } from "effect";

const persistence = persistenceIt();
const layer = ReposLive.pipe(Layer.provideMerge(DomainFeedsLive));
const OBSERVED = new Date("2026-08-17T00:00:00.000Z");

const seedChangeGraph = (repoId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.transaction(
			Effect.gen(function* () {
				yield* Database;
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
			}),
		);
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

persistence.effectDB("owns repeat registration and publishes committed registry changes", function* (db) {
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

const concurrentSlugRegistration = Effect.gen(function* () {
	const temporary = yield* acquireTemporaryPersistence;
	yield* applyMigrations({
		database: temporary.database,
		migrationsDirectory: packagedMigrationsDirectory,
	});
	const firstQueryReached = Promise.withResolvers<void>();
	const releaseFirstQuery = Promise.withResolvers<void>();
	let queryCalls = 0;
	const databaseLayer = Database.layer({
		path: temporary.database,
		middleware: [
			{
				name: "hold-first-repo-registration-query",
				beforeExecute() {
					queryCalls += 1;
					if (queryCalls === 1) {
						firstQueryReached.resolve();
						return releaseFirstQuery.promise;
					}
				},
			},
		],
	});
	yield* Effect.gen(function* () {
		const db = yield* Database;
		const repos = yield* Repos;
		yield* Effect.gen(function* () {
			const first = yield* Effect.forkScoped(
				repos.register({
					defaultRef: "main",
					source: "/reefs/Concurrent-Charts",
				}),
			);
			yield* Effect.promise(() => firstQueryReached.promise);
			const secondStarted = yield* Deferred.make<void>();
			const conflictingRegistration = repos.register({
				defaultRef: "main",
				source: "git@example.invalid:crew/concurrent-charts.git",
			});
			const second = yield* Effect.forkScoped(
				Deferred.succeed(secondStarted, undefined).pipe(Effect.andThen(Effect.result(conflictingRegistration))),
			);
			yield* Deferred.await(secondStarted);
			yield* Effect.promise(() => new Promise<void>((resolve) => setImmediate(resolve)));
			expect(queryCalls).toBe(1);
			releaseFirstQuery.resolve();
			yield* Fiber.join(first);
			const secondResult = yield* Fiber.join(second);
			expect(Result.isFailure(secondResult)).toBe(true);
			if (Result.isFailure(secondResult)) {
				expect(secondResult.failure._tag).toBe("RepoSlugTaken");
			}
			expect(yield* db.Repo.all()).toHaveLength(1);
		}).pipe(Effect.ensuring(Effect.sync(() => releaseFirstQuery.resolve())));
	}).pipe(Effect.provide(layer.pipe(Layer.provideMerge(databaseLayer))));
});

it.live("admits only one of two concurrent sources with the same derived slug", () => concurrentSlugRegistration);

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
