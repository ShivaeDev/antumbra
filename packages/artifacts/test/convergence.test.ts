import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { applyMigrations, Database } from "@antumbra/persistence";
import { acquireTemporaryPersistence, packagedMigrationsDirectory, persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Result } from "effect";

const persistence = persistenceIt();

const root = mkdtempSync(join(tmpdir(), "antumbra-convergence-"));
const moorage = join(root, "moorage");
const published = join(root, "published");
mkdirSync(moorage);
mkdirSync(published);
persistence.afterAll(() => rmSync(root, { force: true, recursive: true }));

const layer = ArtifactsLive(published).pipe(Layer.provideMerge(DomainFeedsLive), Layer.provide(NodeServices.layer));

const land = (artifacts: Artifacts["Service"], title: string) =>
	Effect.sync(() => writeFileSync(join(moorage, `${title}.md`), `# ${title}\n`)).pipe(
		Effect.andThen(
			artifacts.land({
				authorAgentId: "agent-chart",
				path: `${title}.md`,
				pieceId: "piece-chart",
				title,
			}),
		),
	);

const seed = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Piece.create({
		charter: "draw the reef",
		expectation: "a chart lands",
		id: "piece-chart",
		launchedAt: null,
		parkedAt: null,
		role: "cartographer",
		title: "Chart",
	});
	yield* db.Agent.create({
		charter: "draw the reef",
		id: "agent-chart",
		role: "cartographer",
		status: "alive",
	});
	yield* db.Moorage.create({
		agentId: "agent-chart",
		reclaimState: null,
		root: moorage,
		runner: "local",
		status: "ready",
	});
});

persistence.effectDB("refuses two predecessors for one successor", function* (db) {
	yield* seed;
	const artifacts = yield* Artifacts.pipe(Effect.provide(layer));
	const first = yield* land(artifacts, "first");
	const second = yield* land(artifacts, "second");
	const successor = yield* land(artifacts, "successor");
	const actor = { _tag: "agent", agentId: "agent-chart" } as const;
	yield* artifacts.supersede({
		actor,
		successorArtifactId: successor.artifact.id,
		supersededArtifactId: first.artifact.id,
	});
	const failure = yield* Effect.flip(
		artifacts.supersede({
			actor,
			successorArtifactId: successor.artifact.id,
			supersededArtifactId: second.artifact.id,
		}),
	);

	expect(failure).toMatchObject({
		_tag: "ArtifactLineageConflict",
		conflict: "successor_artifact_already_has_predecessor",
	});
	expect(yield* db.Artifact.where({ id: second.artifact.id }).first()).toMatchObject({
		value: { supersededByArtifactId: null },
	});
});

const reciprocalSupersession = Effect.gen(function* () {
	const temporary = yield* acquireTemporaryPersistence;
	yield* applyMigrations({
		database: temporary.database,
		migrationsDirectory: packagedMigrationsDirectory,
	});
	const firstUpdateReached = Promise.withResolvers<void>();
	const releaseFirstUpdate = Promise.withResolvers<void>();
	let updateCalls = 0;
	const databaseLayer = Database.layer({
		path: temporary.database,
		middleware: [
			{
				name: "hold-first-artifact-lineage-update",
				beforeExecute(plan) {
					if (plan.ast.kind !== "update" || plan.ast.table.name !== "artifact" || !("supersededByArtifactId" in plan.ast.set)) {
						return;
					}
					updateCalls += 1;
					if (updateCalls === 1) {
						firstUpdateReached.resolve();
						return releaseFirstUpdate.promise;
					}
				},
			},
		],
	});
	yield* Effect.gen(function* () {
		const db = yield* Database;
		const artifacts = yield* Artifacts;
		yield* seed;
		const first = yield* land(artifacts, "first");
		const second = yield* land(artifacts, "second");
		const actor = { _tag: "agent", agentId: "agent-chart" } as const;
		yield* Effect.gen(function* () {
			const firstAct = yield* Effect.forkScoped(
				artifacts.supersede({
					actor,
					successorArtifactId: second.artifact.id,
					supersededArtifactId: first.artifact.id,
				}),
			);
			yield* Effect.promise(() => firstUpdateReached.promise);
			const secondStarted = yield* Deferred.make<void>();
			const reverseAct = artifacts.supersede({
				actor,
				successorArtifactId: first.artifact.id,
				supersededArtifactId: second.artifact.id,
			});
			const secondAct = yield* Effect.forkScoped(Deferred.succeed(secondStarted, undefined).pipe(Effect.andThen(Effect.result(reverseAct))));
			yield* Deferred.await(secondStarted);
			yield* Effect.promise(() => new Promise<void>((resolve) => setImmediate(resolve)));
			expect(updateCalls).toBe(1);
			releaseFirstUpdate.resolve();
			yield* Fiber.join(firstAct);
			const secondResult = yield* Fiber.join(secondAct);
			expect(Result.isFailure(secondResult)).toBe(true);
			if (Result.isFailure(secondResult)) {
				expect(secondResult.failure).toMatchObject({
					_tag: "ArtifactLineageConflict",
					conflict: "cycle",
				});
			}
			expect((yield* db.Artifact.all()).filter((artifact) => artifact.supersededByArtifactId !== null)).toHaveLength(1);
		}).pipe(Effect.ensuring(Effect.sync(() => releaseFirstUpdate.resolve())));
	}).pipe(Effect.provide(layer.pipe(Layer.provideMerge(databaseLayer))));
});

it.live("serializes reciprocal supersession acts so only one edge can land", () => reciprocalSupersession);
