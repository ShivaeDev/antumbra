import { persistenceIt } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { VoyageWorldSource, VoyageWorldSourceLive } from "#voyage-world.ts";

const it = persistenceIt();

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
	id,
	title: id,
	uri: `https://example.test/${id}.svg`,
});

const readWorldFailure = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	return yield* Effect.flip(source.read);
}).pipe(Effect.provide(VoyageWorldSourceLive));

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
		}).pipe(Effect.provide(VoyageWorldSourceLive));
	},
);

it.effectDB(
	"refuses stored Artifact lineage that crosses producing Pieces",
	function* (db) {
		yield* db.Piece.create(piece("piece-one"));
		yield* db.Piece.create(piece("piece-two"));
		yield* db.Artifact.create({
			...artifact("artifact-one"),
			pieces: (pieces) => pieces.create({ pieceId: "piece-one" }),
		});
		yield* db.Artifact.create({
			...artifact("artifact-two"),
			pieces: (pieces) => pieces.create({ pieceId: "piece-two" }),
		});
		yield* db.ArtifactSupersession.create({
			successorArtifactId: "artifact-two",
			supersededArtifactId: "artifact-one",
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
			pieces: (pieces) => pieces.create({ pieceId: "piece-one" }),
		});
	}
	yield* db.ArtifactSupersession.create({
		successorArtifactId: "artifact-two",
		supersededArtifactId: "artifact-one",
	});
	yield* db.ArtifactSupersession.create({
		successorArtifactId: "artifact-one",
		supersededArtifactId: "artifact-two",
	});

	const failure = yield* readWorldFailure;
	expect(failure).toMatchObject({
		_tag: "StoredArtifactLineageInvalid",
		reason: "cycle",
	});
});

it.effectDB(
	"refuses an Artifact without producing-Piece provenance",
	function* (db) {
		yield* db.Artifact.create(artifact("artifact-orphan"));

		const failure = yield* readWorldFailure;
		expect(failure).toMatchObject({
			_tag: "StoredArtifactLineageInvalid",
			reason: "provenance",
		});
	},
);
