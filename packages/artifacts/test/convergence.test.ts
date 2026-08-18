import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";

const it = persistenceIt();

const layer = ArtifactsLive("/unused-for-external-artifacts").pipe(
	Layer.provideMerge(DomainFeedsLive),
	Layer.provide(NodeServices.layer),
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
	const artifacts = yield* Artifacts.pipe(Effect.provide(layer));
	const land = (title: string) =>
		artifacts.land({
			authorAgentId: "agent-chart",
			pieceId: "piece-chart",
			title,
			uri: `https://example.test/${title}.svg`,
		});
	const first = yield* land("first");
	const second = yield* land("second");
	const successor = yield* land("successor");
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
