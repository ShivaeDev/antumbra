import { Artifacts } from "@antumbra/artifacts";
import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import type {
	ArtifactSupersessionRequest,
	BoardWriteRequest,
	CharterPieceRequest,
	OpenVoyageRequest,
	PieceVerdictRequest,
	RewireRequest,
	VoyageAgentSettingsRequest,
	VoyageBackendRequest,
} from "@antumbra/contract";
import { Pieces } from "@antumbra/pieces";
import { Voyages } from "@antumbra/voyages";
import { Effect, Match, Option } from "effect";
import { toFailure } from "#sight-failure.ts";
import type { VoyageReads } from "#voyage-reads.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const boardScope = Match.type<BoardWriteRequest["scope"]>().pipe(
	Match.when({ kind: "piece" }, ({ pieceId }) => BoardScope.Piece({ pieceId })),
	Match.when({ kind: "voyage" }, ({ voyageId }) => BoardScope.Voyage({ voyageId })),
	Match.exhaustive,
);

export const makeVoyageActs = (reads: VoyageReads) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const pieces = yield* Pieces;
		const artifacts = yield* Artifacts;
		const procedures = yield* VoyageProcedureService;
		const voyages = yield* Voyages;
		return {
			charterPiece: (request: CharterPieceRequest) =>
				pieces.charter(request).pipe(
					Effect.map((piece) => ({ pieceId: piece.id })),
					Effect.mapError(toFailure),
				),
			hail: (voyageId: string) =>
				procedures.hail(voyageId).pipe(
					Effect.map((captain) => ({ agentId: captain.agentId })),
					Effect.mapError(toFailure),
				),
			landPieceVerdict: (request: PieceVerdictRequest) => pieces.landVerdict(request.pieceId, request.verdict).pipe(Effect.mapError(toFailure)),
			launch: (pieceId: string) => pieces.launch(pieceId).pipe(Effect.mapError(toFailure)),
			open: (request: OpenVoyageRequest) =>
				voyages.open(request).pipe(
					Effect.mapError(toFailure),
					Effect.flatMap((row) => reads.summaryOf(row.id)),
				),
			park: (pieceId: string) => pieces.park(pieceId, true).pipe(Effect.mapError(toFailure)),
			removeArtifactSupersession: (request: ArtifactSupersessionRequest) =>
				artifacts.removeSupersession({ actor: { _tag: "admiral" }, ...request }).pipe(Effect.mapError(toFailure)),
			rewire: (request: RewireRequest) => pieces.setDependencies(request.pieceId, request.dependsOn).pipe(Effect.mapError(toFailure)),
			setAgentSettings: (request: VoyageAgentSettingsRequest) =>
				voyages.setAgentSettings(request.voyageId, request.role, request).pipe(Effect.mapError(toFailure)),
			setCaptainBackend: (request: VoyageBackendRequest) =>
				voyages.setCaptainBackend(request.voyageId, request.backend).pipe(Effect.mapError(toFailure)),
			setCrewBackend: (request: VoyageBackendRequest) => voyages.setCrewBackend(request.voyageId, request.backend).pipe(Effect.mapError(toFailure)),
			setFocus: (voyageId: string, focused: boolean) => voyages.setFocus(voyageId, focused).pipe(Effect.mapError(toFailure)),
			supersedeArtifact: (request: ArtifactSupersessionRequest) =>
				artifacts.supersede({ actor: { _tag: "admiral" }, ...request }).pipe(Effect.asVoid, Effect.mapError(toFailure)),
			unpark: (pieceId: string) => pieces.park(pieceId, false).pipe(Effect.mapError(toFailure)),
			workPieceNow: (pieceId: string) =>
				procedures.workNow(pieceId).pipe(
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
