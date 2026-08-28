import { ChangesLive } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import {
	corruptTestArtifactPiece,
	persistenceIt,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { VoyageWorldSource, VoyageWorldSourceLive } from "#voyage-world.ts";

const it = persistenceIt();
const corrupted = temporaryPersistence();

const WorldLive = VoyageWorldSourceLive.pipe(
	Layer.provideMerge(
		ChangesLive(new Map(), new Map()).pipe(
			Layer.provideMerge(PiecesLive),
			Layer.provideMerge(RulingsLive),
			Layer.provideMerge(DomainFeedsLive),
		),
	),
);

it.afterAll(corrupted.remove);

const piece = (id: string) => ({
	charter: "draw the reef",
	expectation: "a chart lands",
	id,
	launchedAt: null,
	parkedAt: null,
	role: "cartographer",
	title: id,
});

const artifact = (id: string) => ({
	authorAgentId: "agent-chart",
	basename: `${id}.md`,
	byteSize: id.length,
	digest: "0".repeat(64),
	id,
	supersededByArtifactId: null,
	title: id,
});

const readWorldFailure = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	return yield* Effect.flip(source.read);
}).pipe(Effect.provide(WorldLive));

it.effectDB(
	"owns the aggregate read and preserves voyage birth order",
	function* (db) {
		yield* db.Voyage.create({
			backend: "scripted",
			context: "charted second",
			createdAt: new Date("2026-08-17T02:00:00.000Z"),
			focusedAt: null,
			id: "newer-voyage",
			name: "Newer",
			northStar: "second",
		});
		yield* db.Voyage.create({
			backend: "scripted",
			context: "charted first",
			createdAt: new Date("2026-08-17T01:00:00.000Z"),
			focusedAt: null,
			id: "older-voyage",
			name: "Older",
			northStar: "first",
		});

		yield* Effect.gen(function* () {
			const source = yield* VoyageWorldSource;
			const world = yield* source.read;
			expect(world.voyages.map((voyage) => voyage.id)).toEqual([
				"older-voyage",
				"newer-voyage",
			]);
		}).pipe(Effect.provide(WorldLive));
	},
);

it.effectDB(
	"names the question of each open ruling on its gate",
	function* (db) {
		yield* db.Agent.create({
			charter: "ask what the chart cannot answer",
			id: "agent-asker",
			role: "hand",
			status: "dormant",
		});
		yield* db.Piece.create(piece("piece-one"));

		yield* Effect.gen(function* () {
			const rulings = yield* Rulings;
			const asked = yield* rulings.request({
				choices: [],
				context: "the chart and the soundings disagree",
				gates: [],
				question: "which reading do we plot against?",
				radius: "piece",
				requesterAgentId: "agent-asker",
				subjects: [],
				urgency: "pressing",
			});
			yield* rulings.gate({ pieceIds: ["piece-one"], rulingId: asked.id });

			const source = yield* VoyageWorldSource;
			const world = yield* source.read;
			expect(world.rulingGates).toEqual([
				{
					pieceId: "piece-one",
					question: "which reading do we plot against?",
					rulingId: asked.id,
				},
			]);
		}).pipe(Effect.provide(WorldLive));
	},
);

it.effectDB(
	"refuses stored Artifact lineage that crosses producing Pieces",
	function* (db) {
		yield* db.Piece.create(piece("piece-one"));
		yield* db.Piece.create(piece("piece-two"));
		yield* db.Artifact.create({
			...artifact("artifact-one"),
			pieceId: "piece-one",
		});
		yield* db.Artifact.create({
			...artifact("artifact-two"),
			pieceId: "piece-two",
		});
		yield* db.Artifact.where({ id: "artifact-one" }).update({
			supersededByArtifactId: "artifact-two",
		});

		const failure = yield* readWorldFailure;
		expect(failure).toMatchObject({
			_tag: "StoredArtifactLineageInvalid",
			reason: "cross_piece",
		});
	},
);

it.effectDB("refuses stored cyclic Artifact lineage", function* (db) {
	yield* db.Piece.create(piece("piece-one"));
	for (const id of ["artifact-one", "artifact-two"]) {
		yield* db.Artifact.create({
			...artifact(id),
			pieceId: "piece-one",
		});
	}
	yield* db.Artifact.where({ id: "artifact-one" }).update({
		supersededByArtifactId: "artifact-two",
	});
	yield* db.Artifact.where({ id: "artifact-two" }).update({
		supersededByArtifactId: "artifact-one",
	});

	const failure = yield* readWorldFailure;
	expect(failure).toMatchObject({
		_tag: "StoredArtifactLineageInvalid",
		reason: "cycle",
	});
});

it.effect("refuses stored Artifact provenance without a Piece", () =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Piece.create(piece("piece-one"));
		yield* db.Artifact.create({
			...artifact("artifact-orphan"),
			pieceId: "piece-one",
		});
		yield* Effect.sync(() =>
			corruptTestArtifactPiece(
				corrupted.database,
				"artifact-orphan",
				"piece-missing",
			),
		);

		const failure = yield* readWorldFailure;
		expect(failure).toMatchObject({
			_tag: "StoredArtifactLineageInvalid",
			reason: "provenance",
		});
	}).pipe(Effect.provide(corrupted.layer)),
);
