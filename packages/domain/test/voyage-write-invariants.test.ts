import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Result } from "effect";
import { domainCapabilityLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";
import type { VoyageProcedures } from "#voyages.ts";

const withDomain = <A, E, R>(
	body: (voyages: VoyageProcedures) => Effect.Effect<A, E, R>,
) =>
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

const charter = (
	voyages: VoyageProcedures,
	voyageId: string,
	title: string,
	dependsOn: ReadonlyArray<string> = [],
) =>
	voyages.charterPiece({
		charter: `do ${title}`,
		dependsOn,
		expectation: `${title} is landed`,
		role: "hand",
		title,
		voyageId,
	});

it.live("concurrent rewires cannot commit a cycle", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const alpha = yield* charter(voyages, voyage.id, "alpha");
			const beta = yield* charter(voyages, voyage.id, "beta");
			const start = yield* Deferred.make<void>();
			const attempt = (pieceId: string, dependencyId: string) =>
				Effect.result(
					Deferred.await(start).pipe(
						Effect.andThen(voyages.rewire(pieceId, [dependencyId])),
					),
				).pipe(Effect.forkChild);
			const fibers = yield* Effect.all([
				attempt(alpha.id, beta.id),
				attempt(beta.id, alpha.id),
			]);
			yield* Deferred.succeed(start, undefined);
			const results = yield* Effect.all(fibers.map(Fiber.join));
			const edges = yield* Database.pipe(
				Effect.flatMap((db) => db.PieceEdge.all()),
			);

			expect(results.filter(Result.isSuccess)).toHaveLength(1);
			expect(results.filter(Result.isFailure)).toMatchObject([
				{ failure: { _tag: "EdgeWouldCycle" } },
			]);
			expect(edges).toHaveLength(1);
		}),
	),
);

it.live("chartering refuses an absent voyage without orphan rows", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const failure = yield* Effect.flip(charter(voyages, "missing", "adrift"));
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
			const failure = yield* Effect.flip(
				charter(voyages, voyage.id, "adrift", ["missing"]),
			);
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
			const voyage = yield* openVoyage(voyages);
			const alpha = yield* charter(voyages, voyage.id, "alpha");
			const beta = yield* charter(voyages, voyage.id, "beta", [alpha.id]);
			const failure = yield* Effect.flip(voyages.rewire(beta.id, ["missing"]));
			const db = yield* Database;

			expect(failure).toMatchObject({ _tag: "PieceNotFound" });
			expect(
				yield* db.PieceEdge.where({ toPieceId: beta.id }).all(),
			).toMatchObject([{ fromPieceId: alpha.id, toPieceId: beta.id }]);
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
