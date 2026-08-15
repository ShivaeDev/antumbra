import type {
	BoardWriteRequest,
	CharterPieceRequest,
	OpenVoyageRequest,
	RewireRequest,
} from "@antumbra/contract";
import { Effect, Option } from "effect";
import type { AgentDomain } from "#domain.ts";
import { toFailure } from "#sight-failure.ts";
import type { VoyageReads } from "#voyage-reads.ts";

type Domain = AgentDomain["Service"];

// why: the window commands the same verbs a captain has — they edit links and
// stamps, and every one of them refuses the same way, so what a window learns
// from a refusal never depends on which verb it reached for.
export const makeVoyageActs = (domain: Domain, reads: VoyageReads) => ({
	charterPiece: (request: CharterPieceRequest) =>
		domain.voyages.charterPiece(request).pipe(
			Effect.map((piece) => ({ pieceId: piece.id })),
			Effect.mapError(toFailure),
		),
	hail: (voyageId: string) =>
		domain.voyages.hail(voyageId).pipe(
			Effect.map((captain) => ({ agentId: captain.agentId })),
			Effect.mapError(toFailure),
		),
	launch: (pieceId: string) =>
		domain.voyages.launch(pieceId).pipe(Effect.mapError(toFailure)),
	open: (request: OpenVoyageRequest) =>
		domain.voyages.open(request).pipe(
			Effect.mapError(toFailure),
			Effect.flatMap((row) => reads.summaryOf(row.id)),
		),
	park: (pieceId: string) =>
		domain.voyages.park(pieceId).pipe(Effect.mapError(toFailure)),
	rewire: (request: RewireRequest) =>
		domain.voyages
			.rewire(request.pieceId, request.dependsOn)
			.pipe(Effect.mapError(toFailure)),
	setFocus: (voyageId: string, focused: boolean) =>
		domain.voyages.setFocus(voyageId, focused).pipe(Effect.mapError(toFailure)),
	unpark: (pieceId: string) =>
		domain.voyages.unpark(pieceId).pipe(Effect.mapError(toFailure)),
	// why: an entry the window writes carries no author agent — a board records
	// which of the crew wrote it, and you are not of the crew.
	writeBoard: (request: BoardWriteRequest) =>
		domain.boards
			.write(request.scope, {
				authorAgentId: Option.none(),
				body: request.body,
				register: request.register,
			})
			.pipe(Effect.asVoid, Effect.mapError(toFailure)),
});
