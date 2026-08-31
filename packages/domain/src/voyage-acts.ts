import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import type {
	ArtifactSupersessionRequest,
	BoardWriteRequest,
	CharterPieceRequest,
	OpenVoyageRequest,
	PieceVerdictRequest,
	RewireRequest,
	VoyageBackendRequest,
} from "@antumbra/contract";
import { Effect, Match, Option } from "effect";
import { toFailure } from "#sight-failure.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";
import type { VoyageReads } from "#voyage-reads.ts";

const boardScope = Match.type<BoardWriteRequest["scope"]>().pipe(
	Match.when({ kind: "piece" }, ({ pieceId }) => BoardScope.Piece({ pieceId })),
	Match.when({ kind: "voyage" }, ({ voyageId }) => BoardScope.Voyage({ voyageId })),
	Match.exhaustive,
);

export const makeVoyageActs = (reads: VoyageReads) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const voyages = yield* VoyageProcedureService;
		return {
			charterPiece: (request: CharterPieceRequest) =>
				voyages.charterPiece(request).pipe(
					Effect.map((piece) => ({ pieceId: piece.id })),
					Effect.mapError(toFailure),
				),
			hail: (voyageId: string) =>
				voyages.hail(voyageId).pipe(
					Effect.map((captain) => ({ agentId: captain.agentId })),
					Effect.mapError(toFailure),
				),
			landPieceVerdict: (request: PieceVerdictRequest) => voyages.landPieceVerdict(request.pieceId, request.verdict).pipe(Effect.mapError(toFailure)),
			launch: (pieceId: string) => voyages.launch(pieceId).pipe(Effect.mapError(toFailure)),
			open: (request: OpenVoyageRequest) =>
				voyages.open(request).pipe(
					Effect.mapError(toFailure),
					Effect.flatMap((row) => reads.summaryOf(row.id)),
				),
			park: (pieceId: string) => voyages.park(pieceId).pipe(Effect.mapError(toFailure)),
			removeArtifactSupersession: (request: ArtifactSupersessionRequest) =>
				voyages.removeArtifactSupersession(request).pipe(Effect.mapError(toFailure)),
			rewire: (request: RewireRequest) => voyages.rewire(request.pieceId, request.dependsOn).pipe(Effect.mapError(toFailure)),
			setCaptainBackend: (request: VoyageBackendRequest) =>
				voyages.setCaptainBackend(request.voyageId, request.backend).pipe(Effect.mapError(toFailure)),
			setCrewBackend: (request: VoyageBackendRequest) => voyages.setCrewBackend(request.voyageId, request.backend).pipe(Effect.mapError(toFailure)),
			setFocus: (voyageId: string, focused: boolean) => voyages.setFocus(voyageId, focused).pipe(Effect.mapError(toFailure)),
			supersedeArtifact: (request: ArtifactSupersessionRequest) => voyages.supersedeArtifact(request).pipe(Effect.asVoid, Effect.mapError(toFailure)),
			unpark: (pieceId: string) => voyages.unpark(pieceId).pipe(Effect.mapError(toFailure)),
			workPieceNow: (pieceId: string) =>
				voyages.workNow(pieceId).pipe(
					Effect.map((crewed) => ({ agentId: crewed.agentId })),
					Effect.mapError(toFailure),
				),
			writeBoard: (request: BoardWriteRequest) =>
				boards
					.write(
						boardScope(request.scope),
						EntryInput.Note({
							authorAgentId: Option.none(),
							body: request.body,
							register: request.register,
						}),
					)
					.pipe(Effect.asVoid, Effect.mapError(toFailure)),
		};
	});
