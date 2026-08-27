import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer, Result } from "effect";

const it = persistenceIt();

const root = mkdtempSync(join(tmpdir(), "antumbra-convergence-"));
const moorage = join(root, "moorage");
const published = join(root, "published");
mkdirSync(moorage);
mkdirSync(published);
it.afterAll(() => rmSync(root, { force: true, recursive: true }));

const layer = ArtifactsLive(published).pipe(
	Layer.provideMerge(DomainFeedsLive),
	Layer.provide(NodeServices.layer),
);

const land = (artifacts: Artifacts["Service"], title: string) =>
	Effect.sync(() =>
		writeFileSync(join(moorage, `${title}.md`), `# ${title}\n`),
	).pipe(
		Effect.andThen(
			artifacts.land({
				authorAgentId: "agent-chart",
				path: `${title}.md`,
				pieceId: "piece-chart",
				title,
			}),
		),
	);

it.effectDB("refuses two predecessors for one successor", function* (db) {
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
	expect(
		yield* db.Artifact.where({ id: second.artifact.id }).first(),
	).toMatchObject({
		value: { supersededByArtifactId: null },
	});
});

it.effectDB(
	"serializes reciprocal supersession acts so only one edge can land",
	function* (db) {
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
		const artifacts = yield* Artifacts.pipe(Effect.provide(layer));
		const first = yield* land(artifacts, "first");
		const second = yield* land(artifacts, "second");
		const actor = { _tag: "agent", agentId: "agent-chart" } as const;
		const results = yield* Effect.all(
			[
				Effect.result(
					artifacts.supersede({
						actor,
						successorArtifactId: second.artifact.id,
						supersededArtifactId: first.artifact.id,
					}),
				),
				Effect.result(
					artifacts.supersede({
						actor,
						successorArtifactId: first.artifact.id,
						supersededArtifactId: second.artifact.id,
					}),
				),
			],
			{ concurrency: "unbounded" },
		);

		expect(results.filter(Result.isSuccess)).toHaveLength(1);
		const failures = results.filter(Result.isFailure);
		expect(failures).toHaveLength(1);
		expect(failures[0]?.failure).toMatchObject({
			_tag: "ArtifactLineageConflict",
			conflict: "cycle",
		});
		expect(
			(yield* db.Artifact.all()).filter(
				(artifact) => artifact.supersededByArtifactId !== null,
			),
		).toHaveLength(1);
	},
);
