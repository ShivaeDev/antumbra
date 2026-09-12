import { Artifacts } from "@antumbra/artifacts";
import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import type { ArtifactSupersessionRequest, BoardWriteRequest } from "@antumbra/contract";
import { Voyages } from "@antumbra/voyages";
import { Effect, Match, Option } from "effect";
import { toFailure } from "#sight-failure.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const boardScope = Match.type<BoardWriteRequest["scope"]>().pipe(
	Match.when({ kind: "piece" }, ({ pieceId }) => BoardScope.Piece({ pieceId })),
	Match.when({ kind: "voyage" }, ({ voyageId }) => BoardScope.Voyage({ voyageId })),
	Match.exhaustive,
);

export const makeVoyageActs = Effect.gen(function* () {
	const boards = yield* Boards;
	const artifacts = yield* Artifacts;
	const procedures = yield* VoyageProcedureService;
	const voyages = yield* Voyages;
	return {
		hail: (voyageId: string) =>
			procedures.hail(voyageId).pipe(
				Effect.map((captain) => ({ agentId: captain.agentId })),
				Effect.mapError(toFailure),
			),
		removeArtifactSupersession: (request: ArtifactSupersessionRequest) =>
			artifacts.removeSupersession({ actor: { _tag: "admiral" }, ...request }).pipe(Effect.mapError(toFailure)),
		setFocus: (voyageId: string, focused: boolean) => voyages.setFocus(voyageId, focused).pipe(Effect.mapError(toFailure)),
		supersedeArtifact: (request: ArtifactSupersessionRequest) =>
			artifacts.supersede({ actor: { _tag: "admiral" }, ...request }).pipe(Effect.asVoid, Effect.mapError(toFailure)),
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
