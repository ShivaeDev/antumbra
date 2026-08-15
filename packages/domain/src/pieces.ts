import type { PrismaError } from "@antumbra/persistence";
import { Clock, Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { PieceNotFound } from "#errors.ts";
import { type EdgeFailure, plannedEdges, writeEdges } from "#piece-edges.ts";
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

const requirePiece = (deps: AgentDeps, pieceId: string) =>
	provideExecutors(deps)(deps.db.Piece.where({ id: pieceId }).first()).pipe(
		Effect.flatMap((row) =>
			Option.isNone(row)
				? new PieceNotFound({ pieceId })
				: Effect.succeed(row.value),
		),
	);

export const charterPiece = (
	deps: AgentDeps,
	input: CharterInput,
): Effect.Effect<PieceRow, EdgeFailure> =>
	Effect.gen(function* () {
		const pieceId = crypto.randomUUID();
		const edges = yield* plannedEdges(deps, pieceId, input.dependsOn);
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
				deps.db.Piece.create(row).pipe(
					Effect.andThen(
						deps.db.VoyagePiece.create({ pieceId, voyageId: input.voyageId }),
					),
					Effect.andThen(writeEdges(deps, pieceId, edges)),
				),
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
		yield* requirePiece(deps, pieceId);
		const edges = yield* plannedEdges(deps, pieceId, dependsOn);
		yield* provideExecutors(deps)(
			deps.writer.write(writeEdges(deps, pieceId, edges)),
		);
		yield* announce(deps);
	});

const stamp = (
	deps: AgentDeps,
	pieceId: string,
	fields: {
		readonly launchedAt?: Date | null;
		readonly parkedAt?: Date | null;
	},
) =>
	provideExecutors(deps)(
		deps.writer.write(deps.db.Piece.where({ id: pieceId }).update(fields)),
	).pipe(Effect.andThen(announce(deps)), Effect.asVoid);

// why: launching is idempotent because launchedAt is the moment of release,
// not a toggle — a second launch must not re-date the piece and reorder the
// pool behind it.
export const launchPiece = (
	deps: AgentDeps,
	pieceId: string,
): Effect.Effect<void, PieceNotFound | PrismaError> =>
	Effect.gen(function* () {
		const piece = yield* requirePiece(deps, pieceId);
		if (piece.launchedAt !== null) {
			return;
		}
		const now = yield* Clock.currentTimeMillis;
		yield* stamp(deps, pieceId, { launchedAt: new Date(now) });
	});

export const parkPiece = (
	deps: AgentDeps,
	pieceId: string,
	parked: boolean,
): Effect.Effect<void, PieceNotFound | PrismaError> =>
	Effect.gen(function* () {
		yield* requirePiece(deps, pieceId);
		const now = yield* Clock.currentTimeMillis;
		yield* stamp(deps, pieceId, { parkedAt: parked ? new Date(now) : null });
	});
