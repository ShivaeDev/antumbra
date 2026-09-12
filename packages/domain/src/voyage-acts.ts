import { Artifacts } from "@antumbra/artifacts";
import type { ArtifactSupersessionRequest } from "@antumbra/contract";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { toFailure } from "#sight-failure.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

export const makeVoyageActs = Effect.gen(function* () {
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
	};
});
