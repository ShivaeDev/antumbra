import { BoardScope, Boards } from "@antumbra/boards";
import {
	SightFailure,
	type VoyageSummary,
	type VoyageView,
} from "@antumbra/contract";
import { Effect, Option } from "effect";
import { toFailure } from "#sight-failure.ts";
import { summarySeen, voyageSeen } from "#voyage-projection.ts";
import { readVoyageView } from "#voyage-read.ts";
import {
	type VoyageView as DerivedVoyage,
	voyageSummaries,
} from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export interface VoyageReads {
	readonly summaryOf: (
		voyageId: string,
	) => Effect.Effect<VoyageSummary, SightFailure>;
	readonly voyage: (
		voyageId: string,
	) => Effect.Effect<VoyageView, SightFailure>;
	readonly voyages: Effect.Effect<ReadonlyArray<VoyageSummary>, SightFailure>;
}

const absent = (voyageId: string) =>
	new SightFailure({ message: `no such voyage: ${voyageId}` });

const listed = (all: ReadonlyArray<VoyageSummary>, voyageId: string) => {
	const opened = all.find((row) => row.id === voyageId);
	return opened === undefined ? absent(voyageId) : Effect.succeed(opened);
};

export const makeVoyageReads = Effect.gen(function* () {
	const boards = yield* Boards;
	const world = yield* VoyageWorldSource;
	const boardOf = (voyageId: string) =>
		boards
			.read(BoardScope.Voyage({ voyageId }))
			.pipe(Effect.mapError(toFailure));
	const pieceBoardsOf = (pieceIds: ReadonlyArray<string>) =>
		Effect.forEach(pieceIds, (pieceId) =>
			boards
				.read(BoardScope.Piece({ pieceId }))
				.pipe(Effect.map((entries) => [pieceId, entries] as const)),
		).pipe(
			Effect.map((entries) => new Map(entries)),
			Effect.mapError(toFailure),
		);
	const seenVoyage = (voyageId: string, view: DerivedVoyage) =>
		Effect.all({
			board: boardOf(voyageId),
			pieceBoards: pieceBoardsOf(view.pieces.map((piece) => piece.id)),
		}).pipe(
			Effect.map(({ board, pieceBoards }) =>
				voyageSeen(view, board, pieceBoards),
			),
		);
	const readVoyage = (voyageId: string) =>
		readVoyageView(voyageId).pipe(
			Effect.provideService(VoyageWorldSource, world),
			Effect.mapError(toFailure),
			Effect.flatMap(
				Option.match({
					onNone: () => absent(voyageId),
					onSome: (view) => seenVoyage(voyageId, view),
				}),
			),
		);
	const voyages = world.read.pipe(
		Effect.map((rows) => voyageSummaries(rows).map(summarySeen)),
		Effect.mapError(toFailure),
	);
	return {
		// why: a voyage the window just opened is read back rather than assembled
		// from the row that opened it — state, counts and captain are all derived,
		// and a window must never be handed a second opinion on them.
		summaryOf: (voyageId) =>
			voyages.pipe(Effect.flatMap((all) => listed(all, voyageId))),
		voyage: readVoyage,
		voyages,
	} satisfies VoyageReads;
});
