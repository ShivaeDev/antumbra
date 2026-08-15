import type { DatabaseService, PrismaError } from "@antumbra/persistence";
import { Clock, Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { PieceNotFound, type VoyageNotFound } from "#errors.ts";
import { type EdgeFailure, plannedEdges, writeEdges } from "#piece-edges.ts";
import { requireVoyage } from "#voyage-record.ts";
import type { PieceRow } from "#voyage-rows.ts";

export interface CharterInput {
	readonly charter: string;
	readonly dependsOn: ReadonlyArray<string>;
	readonly expectation: string;
	readonly role: string;
	readonly title: string;
	readonly voyageId: string;
}

const announce = (deps: AgentDeps) =>
	PubSub.publish(deps.feeds.voyages, undefined);

const requirePiece = (db: DatabaseService, pieceId: string) =>
	db.Piece.where({ id: pieceId })
		.first()
		.pipe(
			Effect.flatMap((row) =>
				Option.isNone(row)
					? new PieceNotFound({ pieceId })
					: Effect.succeed(row.value),
			),
		);

export type CharterFailure = EdgeFailure | VoyageNotFound;

export const charterPiece = (
	deps: AgentDeps,
	input: CharterInput,
): Effect.Effect<PieceRow, CharterFailure> =>
	Effect.gen(function* () {
		const pieceId = crypto.randomUUID();
		const row: PieceRow = {
			charter: input.charter,
			expectation: input.expectation,
			id: pieceId,
			launchedAt: null,
			parkedAt: null,
			role: input.role,
			title: input.title,
		};
		yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					yield* requireVoyage(deps.db, input.voyageId);
					const edges = yield* plannedEdges(deps.db, pieceId, input.dependsOn);
					yield* deps.db.Piece.create(row);
					yield* deps.db.VoyagePiece.create({
						pieceId,
						voyageId: input.voyageId,
					});
					yield* writeEdges(deps.db, pieceId, edges);
				}),
			),
		);
		yield* announce(deps);
		return row;
	});

export const rewirePiece = (
	deps: AgentDeps,
	pieceId: string,
	dependsOn: ReadonlyArray<string>,
): Effect.Effect<void, EdgeFailure> =>
	Effect.gen(function* () {
		// why: graph validation and replacement share the writer transaction, so a
		// concurrent rewire is seen before the next one decides whether it cycles.
		yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					yield* requirePiece(deps.db, pieceId);
					const edges = yield* plannedEdges(deps.db, pieceId, dependsOn);
					yield* writeEdges(deps.db, pieceId, edges);
				}),
			),
		);
		yield* announce(deps);
	});
// why: launching is idempotent because launchedAt is the moment of release,
// not a toggle — a second launch must not re-date the piece and reorder the
// pool behind it.
export const launchPiece = (
	deps: AgentDeps,
	pieceId: string,
): Effect.Effect<void, PieceNotFound | PrismaError> =>
	Effect.gen(function* () {
		const launched = yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					const piece = yield* requirePiece(deps.db, pieceId);
					if (piece.launchedAt !== null) {
						return false;
					}
					const now = yield* Clock.currentTimeMillis;
					yield* deps.db.Piece.where({ id: pieceId }).update({
						launchedAt: new Date(now),
					});
					return true;
				}),
			),
		);
		if (!launched) {
			return;
		}
		yield* announce(deps);
	});

export const parkPiece = (
	deps: AgentDeps,
	pieceId: string,
	parked: boolean,
): Effect.Effect<void, PieceNotFound | PrismaError> =>
	Effect.gen(function* () {
		yield* provideExecutors(deps)(requirePiece(deps.db, pieceId));
		const now = yield* Clock.currentTimeMillis;
		yield* provideExecutors(deps)(
			deps.writer.write(
				deps.db.Piece.where({ id: pieceId }).update({
					parkedAt: parked ? new Date(now) : null,
				}),
			),
		);
		yield* announce(deps);
	});
