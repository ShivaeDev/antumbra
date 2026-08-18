import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";

const it = persistenceIt();

const piece = {
	charter: "draw the reef",
	expectation: "a chart lands",
	id: "piece-chart",
	launchedAt: null,
	parkedAt: null,
	role: "cartographer",
	title: "Chart",
};

const otherPiece = { ...piece, id: "piece-log", title: "Log" };

const layer = ArtifactsLive("/unused-for-external-artifacts").pipe(
	Layer.provideMerge(DomainFeedsLive),
	Layer.provide(NodeServices.layer),
);

const land = (pieceId: string, title: string, authorAgentId = "agent-chart") =>
	Artifacts.pipe(
		Effect.flatMap((artifacts) =>
			artifacts.land({
				authorAgentId,
				pieceId,
				title,
				uri: `https://example.test/${title}.svg`,
			}),
		),
	);

const useArtifacts = <A, E>(
	use: (artifacts: Artifacts["Service"]) => Effect.Effect<A, E>,
) => Artifacts.pipe(Effect.flatMap(use), Effect.provide(layer));

it.effectDB(
	"lands an explicit revision and keeps immutable lineage",
	function* (db) {
		yield* db.Piece.create(piece);
		const first = yield* land(piece.id, "first").pipe(Effect.provide(layer));
		const second = yield* Artifacts.pipe(
			Effect.flatMap((artifacts) =>
				artifacts.land({
					authorAgentId: "agent-chart",
					pieceId: piece.id,
					supersedesArtifactId: first.artifact.id,
					title: "second",
					uri: "https://example.test/second.svg",
				}),
			),
			Effect.provide(layer),
		);

		expect(first).toMatchObject({
			_tag: "landed",
			otherCurrentArtifacts: [],
		});
		expect(second).toMatchObject({
			_tag: "superseded",
			supersededArtifactId: first.artifact.id,
		});
		expect(yield* db.Artifact.all()).toEqual([
			expect.objectContaining({
				id: first.artifact.id,
				supersededByArtifactId: second.artifact.id,
			}),
			expect.objectContaining({
				id: second.artifact.id,
				supersededByArtifactId: null,
			}),
		]);
	},
);

it.effectDB(
	"returns every other current Artifact when landing does not infer supersession",
	function* (db) {
		yield* db.Piece.create(piece);
		const first = yield* land(piece.id, "first").pipe(Effect.provide(layer));
		const second = yield* land(piece.id, "second").pipe(Effect.provide(layer));

		expect(second).toMatchObject({
			_tag: "landed",
			otherCurrentArtifacts: [first.artifact],
		});
	},
);

it.effectDB(
	"refuses branching and cycles without changing existing topology",
	function* (db) {
		yield* db.Piece.create(piece);
		const first = yield* land(piece.id, "first").pipe(Effect.provide(layer));
		const second = yield* land(piece.id, "second").pipe(Effect.provide(layer));
		const third = yield* land(piece.id, "third").pipe(Effect.provide(layer));
		const actor = { _tag: "agent", agentId: "agent-chart" } as const;
		yield* useArtifacts((artifacts) =>
			artifacts.supersede({
				actor,
				successorArtifactId: second.artifact.id,
				supersededArtifactId: first.artifact.id,
			}),
		);
		const before = yield* db.Artifact.all();
		const branch = yield* Effect.flip(
			useArtifacts((artifacts) =>
				artifacts.supersede({
					actor,
					successorArtifactId: third.artifact.id,
					supersededArtifactId: first.artifact.id,
				}),
			),
		);
		const cycle = yield* Effect.flip(
			useArtifacts((artifacts) =>
				artifacts.supersede({
					actor,
					successorArtifactId: first.artifact.id,
					supersededArtifactId: second.artifact.id,
				}),
			),
		);

		expect(branch).toMatchObject({
			_tag: "ArtifactLineageConflict",
			conflict: "superseded_artifact_already_has_successor",
		});
		expect(cycle).toMatchObject({
			_tag: "ArtifactLineageConflict",
			conflict: "cycle",
		});
		expect(yield* db.Artifact.all()).toEqual(before);
	},
);

it.effectDB(
	"refuses cross-Piece lineage and unauthorized correction unchanged",
	function* (db) {
		yield* db.Piece.create(piece);
		yield* db.Piece.create(otherPiece);
		const first = yield* land(piece.id, "first").pipe(Effect.provide(layer));
		const foreign = yield* land(otherPiece.id, "foreign").pipe(
			Effect.provide(layer),
		);
		const crossPiece = yield* Effect.flip(
			useArtifacts((artifacts) =>
				artifacts.supersede({
					actor: { _tag: "admiral" },
					successorArtifactId: foreign.artifact.id,
					supersededArtifactId: first.artifact.id,
				}),
			),
		);
		const unauthorized = yield* Effect.flip(
			useArtifacts((artifacts) =>
				artifacts.supersede({
					actor: { _tag: "agent", agentId: "agent-other" },
					successorArtifactId: foreign.artifact.id,
					supersededArtifactId: first.artifact.id,
				}),
			),
		);

		expect(crossPiece._tag).toBe("ArtifactProvenanceConflict");
		expect(unauthorized._tag).toBe("ArtifactSupersessionUnauthorized");
		expect(yield* db.Artifact.all()).toEqual([
			expect.objectContaining({ supersededByArtifactId: null }),
			expect.objectContaining({ supersededByArtifactId: null }),
		]);
	},
);

it.effectDB(
	"an author may remove an involving edge and the admiral may correct any edge",
	function* (db) {
		yield* db.Piece.create(piece);
		const first = yield* land(piece.id, "first", "agent-first").pipe(
			Effect.provide(layer),
		);
		const second = yield* land(piece.id, "second", "agent-second").pipe(
			Effect.provide(layer),
		);
		const edge = {
			successorArtifactId: second.artifact.id,
			supersededArtifactId: first.artifact.id,
		};
		yield* useArtifacts((artifacts) =>
			artifacts.supersede({
				actor: { _tag: "agent", agentId: "agent-first" },
				...edge,
			}),
		);
		yield* useArtifacts((artifacts) =>
			artifacts.removeSupersession({
				actor: { _tag: "agent", agentId: "agent-second" },
				...edge,
			}),
		);
		yield* useArtifacts((artifacts) =>
			artifacts.supersede({ actor: { _tag: "admiral" }, ...edge }),
		);
		yield* useArtifacts((artifacts) =>
			artifacts.removeSupersession({
				actor: { _tag: "admiral" },
				...edge,
			}),
		);

		expect(
			yield* db.Artifact.where({ id: first.artifact.id }).first(),
		).toMatchObject({
			value: { supersededByArtifactId: null },
		});
	},
);

it.effectDB("replays explicit add and remove acts harmlessly", function* (db) {
	yield* db.Piece.create(piece);
	const first = yield* land(piece.id, "first").pipe(Effect.provide(layer));
	const second = yield* land(piece.id, "second").pipe(Effect.provide(layer));
	const input = {
		actor: { _tag: "agent", agentId: "agent-chart" } as const,
		successorArtifactId: second.artifact.id,
		supersededArtifactId: first.artifact.id,
	};
	const created = yield* useArtifacts((artifacts) =>
		artifacts.supersede(input),
	);
	const replayed = yield* useArtifacts((artifacts) =>
		artifacts.supersede(input),
	);
	yield* useArtifacts((artifacts) => artifacts.removeSupersession(input));
	yield* useArtifacts((artifacts) => artifacts.removeSupersession(input));

	expect(replayed).toEqual(created);
	expect(
		yield* db.Artifact.where({ id: first.artifact.id }).first(),
	).toMatchObject({
		value: { supersededByArtifactId: null },
	});
});

it.effectDB(
	"does not scan an unrelated Piece's corrupt lineage",
	function* (db) {
		yield* db.Piece.create(piece);
		yield* db.Piece.create(otherPiece);
		const foreignFirst = yield* land(otherPiece.id, "foreign-first").pipe(
			Effect.provide(layer),
		);
		const foreignSecond = yield* land(otherPiece.id, "foreign-second").pipe(
			Effect.provide(layer),
		);
		yield* db.Artifact.where({ id: foreignFirst.artifact.id }).update({
			supersededByArtifactId: foreignSecond.artifact.id,
		});
		yield* db.Artifact.where({ id: foreignSecond.artifact.id }).update({
			supersededByArtifactId: foreignFirst.artifact.id,
		});

		const landed = yield* land(piece.id, "target").pipe(Effect.provide(layer));

		expect(landed).toMatchObject({ _tag: "landed", otherCurrentArtifacts: [] });
	},
);

it.effectDB(
	"an invalid landing leaves Artifact, provenance, and topology unchanged",
	function* (db) {
		yield* db.Piece.create(piece);
		yield* db.Piece.create(otherPiece);
		const old = yield* land(otherPiece.id, "foreign").pipe(
			Effect.provide(layer),
		);
		const before = yield* db.Artifact.all();
		const failure = yield* Effect.flip(
			useArtifacts((artifacts) =>
				artifacts.land({
					authorAgentId: "agent-chart",
					pieceId: piece.id,
					supersedesArtifactId: old.artifact.id,
					title: "wrong lineage",
					uri: "https://example.test/wrong.svg",
				}),
			),
		);

		expect(failure._tag).toBe("ArtifactProvenanceConflict");
		expect(yield* db.Artifact.all()).toEqual(before);
	},
);
