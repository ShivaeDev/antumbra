import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import type { VoyageProcedures } from "#voyages/service.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const withDomain = <A, E, R>(body: (voyages: VoyageProcedures) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const voyages = yield* VoyageProcedureService;
			yield* body(voyages);
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));
	});

const openVoyage = (voyages: VoyageProcedures) =>
	voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});

const charter = (voyageId: string, title: string, dependsOn: ReadonlyArray<string> = []) =>
	Effect.flatMap(Pieces, (owner) =>
		owner.charter({
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId,
		}),
	);

it.live("chartering refuses an absent voyage without orphan rows", () =>
	withDomain(() =>
		Effect.gen(function* () {
			const failure = yield* Effect.flip(charter("missing", "adrift"));
			const db = yield* Database;

			expect(failure).toMatchObject({ _tag: "VoyageNotFound" });
			expect(yield* db.Piece.all()).toEqual([]);
			expect(yield* db.VoyagePiece.all()).toEqual([]);
			expect(yield* db.PieceEdge.all()).toEqual([]);
		}),
	),
);

it.live("a refused charter leaves no partial piece or membership", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const failure = yield* Effect.flip(charter(voyage.id, "adrift", ["missing"]));
			const db = yield* Database;

			expect(failure).toMatchObject({ _tag: "PieceNotFound" });
			expect(yield* db.Piece.all()).toEqual([]);
			expect(yield* db.VoyagePiece.all()).toEqual([]);
			expect(yield* db.PieceEdge.all()).toEqual([]);
		}),
	),
);

it.live("a refused rewire preserves the previous dependencies", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyage = yield* openVoyage(voyages);
			const alpha = yield* charter(voyage.id, "alpha");
			const beta = yield* charter(voyage.id, "beta", [alpha.id]);
			const failure = yield* Effect.flip(pieces.setDependencies(beta.id, ["missing"]));
			const db = yield* Database;

			expect(failure).toMatchObject({ _tag: "PieceNotFound" });
			expect(yield* db.PieceEdge.where({ toPieceId: beta.id }).all()).toMatchObject([{ fromPieceId: alpha.id, toPieceId: beta.id }]);
		}),
	),
);

it.live("switching either backend of an absent voyage is a tagged refusal", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			expect(yield* Effect.flip(voyages.setCaptainBackend("missing", "codex"))).toMatchObject({ _tag: "VoyageNotFound" });
			expect(yield* Effect.flip(voyages.setCrewBackend("missing", "codex"))).toMatchObject({ _tag: "VoyageNotFound" });
		}),
	),
);

it.live("switches each backend without changing the other", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			yield* voyages.setCaptainBackend(voyage.id, "codex");
			const db = yield* Database;
			expect(Option.getOrThrow(yield* db.Voyage.where({ id: voyage.id }).first())).toMatchObject({
				captainBackend: "codex",
				crewBackend: "scripted",
			});
		}),
	),
);

it.live("focusing an absent voyage is a tagged refusal", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const failure = yield* Effect.flip(voyages.setFocus("missing", true));
			expect(failure).toMatchObject({ _tag: "VoyageNotFound" });
		}),
	),
);
