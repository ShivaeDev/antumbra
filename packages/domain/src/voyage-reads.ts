import { BoardScope, Boards } from "@antumbra/boards";
import { SightFailure, type VoyageSummary, type VoyageView } from "@antumbra/contract";
import { Effect, Option } from "effect";
import { type CrewRuntime, crewRest } from "#crew-rest.ts";
import { toFailure } from "#sight-failure.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { VoyageSummaries } from "#voyage/summaries/service.ts";
import { summarySeen, voyageSeen } from "#voyage-projection.ts";
import { type VoyageView as DerivedVoyage, voyageView } from "#voyage-view.ts";

export interface VoyageReads {
	readonly summaryOf: (voyageId: string) => Effect.Effect<VoyageSummary, SightFailure>;
	readonly voyage: (voyageId: string) => Effect.Effect<VoyageView, SightFailure>;
	readonly voyages: Effect.Effect<ReadonlyArray<VoyageSummary>, SightFailure>;
}

const absent = (voyageId: string) => new SightFailure({ message: `no such voyage: ${voyageId}` });

export const makeVoyageReads = (runtime: Effect.Effect<CrewRuntime>) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const summaries = yield* VoyageSummaries;
		const details = yield* VoyageDetails;
		const detailOf = Effect.fnUntraced(function* (voyageId: string) {
			const detail = yield* details.read(voyageId).pipe(Effect.mapError(toFailure));
			if (Option.isNone(detail)) return yield* absent(voyageId);
			return detail.value;
		});
		const boardOf = (voyageId: string) => boards.read(BoardScope.Voyage({ voyageId })).pipe(Effect.mapError(toFailure));
		const pieceBoardsOf = (pieceIds: ReadonlyArray<string>) =>
			Effect.forEach(pieceIds, (pieceId) =>
				boards.read(BoardScope.Piece({ pieceId })).pipe(Effect.map((entries) => [pieceId, entries] as const)),
			).pipe(
				Effect.map((entries) => new Map(entries)),
				Effect.mapError(toFailure),
			);
		const seenVoyage = (voyageId: string, view: DerivedVoyage, resting: ReadonlyMap<string, ReadonlyArray<string>>) =>
			Effect.all({
				board: boardOf(voyageId),
				pieceBoards: pieceBoardsOf(view.pieces.map((piece) => piece.id)),
			}).pipe(Effect.map(({ board, pieceBoards }) => voyageSeen(view, board, pieceBoards, resting)));
		const readVoyage = Effect.fn("VoyageReads.voyage")(function* (voyageId: string) {
			const { rows, voyage } = yield* detailOf(voyageId);
			const { resting } = crewRest(rows, yield* runtime);
			return yield* seenVoyage(voyageId, voyageView(rows, voyage), resting);
		});
		const summaryOf = Effect.fn("VoyageReads.summaryOf")(function* (voyageId: string) {
			const { rows, voyage } = yield* detailOf(voyageId);
			return summarySeen(voyageView(rows, voyage));
		});
		const voyages = summaries.read().pipe(
			Effect.map((rows) => rows.map(summarySeen)),
			Effect.mapError(toFailure),
		);
		return {
			summaryOf,
			voyage: readVoyage,
			voyages,
		} satisfies VoyageReads;
	});
