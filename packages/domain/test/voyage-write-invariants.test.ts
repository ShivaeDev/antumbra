import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Result } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";
import { aliveAgent, eventually } from "#test/voyage-fixtures.ts";
import type { VoyageProcedures } from "#voyages.ts";

const withDomain = <A, E, R>(
	body: (voyages: VoyageProcedures) => Effect.Effect<A, E, R>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* body(domain.voyages);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
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

it.live(
	"a switched backend retargets the voyage and no session already open",
	() =>
		withDomain((voyages) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const voyage = yield* openVoyage(voyages);
				const hailed = yield* voyages.hail(voyage.id);
				yield* eventually(aliveAgent(hailed.agentId));

				yield* voyages.setBackend(voyage.id, "codex");

				const stored = yield* db.Voyage.where({ id: voyage.id }).first();
				expect(Option.getOrThrow(stored).backend).toBe("codex");
				expect(
					(yield* db.AgentSession.all()).map((session) => session.backend),
				).toEqual(["scripted"]);
			}),
		),
);

it.live("switching the backend of an absent voyage is a tagged refusal", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const failure = yield* Effect.flip(
				voyages.setBackend("missing", "codex"),
			);
			expect(failure).toMatchObject({ _tag: "VoyageNotFound" });
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
