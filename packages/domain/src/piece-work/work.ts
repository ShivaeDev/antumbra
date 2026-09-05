import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { decodeStoredVoyageKind } from "@antumbra/vocabulary/voyage";
import { Effect, Option } from "effect";
import { agentSettingsOf } from "#agent-settings.ts";
import { charterFor } from "#crew-charter.ts";
import { PieceNotFound } from "#errors.ts";
import { KernelReach } from "#kernel-reach/service.ts";
import { workingAssignee } from "#piece-work/working-assignee.ts";
import { PieceAbandoned, PieceAlreadyCrewed, PieceNotOnVoyage } from "#piece-work-errors.ts";

export interface CrewedPiece {
	readonly agentId: string;
	readonly intentId: string;
}

export const workPieceNow = Effect.fn("Voyages.workPieceNow")(function* (pieceId: string) {
	const reach = yield* KernelReach;
	const db = yield* Database;
	const pieces = yield* Pieces;
	const found = yield* db.Piece.where({ id: pieceId }).first();
	if (Option.isNone(found)) {
		return yield* new PieceNotFound({ pieceId });
	}
	const piece = found.value;
	if ((yield* pieces.verdicts([pieceId])).get(pieceId) === "abandoned") {
		return yield* new PieceAbandoned({ pieceId });
	}
	const working = yield* workingAssignee(pieceId);
	if (working !== undefined) {
		return yield* new PieceAlreadyCrewed({ agentId: working, pieceId });
	}
	const membership = yield* db.VoyagePiece.where({ pieceId }).first();
	if (Option.isNone(membership)) {
		return yield* new PieceNotOnVoyage({ pieceId });
	}
	const voyage = yield* db.Voyage.where({ id: membership.value.voyageId }).first();
	if (Option.isNone(voyage)) {
		return yield* new PieceNotOnVoyage({ pieceId });
	}
	const kind = yield* Effect.fromResult(decodeStoredVoyageKind(voyage.value.id, voyage.value.kind));
	const agentId = crypto.randomUUID();
	const intentId = yield* reach.submitSpawn({
		agentId,
		backend: voyage.value.crewBackend,
		...agentSettingsOf(voyage.value, "crew"),
		charter: yield* charterFor(piece, { ...voyage.value, kind }, agentId),
		pieceId,
		role: piece.role,
		runner: "local",
		sessionId: crypto.randomUUID(),
		voyageId: voyage.value.id,
	});
	return { agentId, intentId };
});

export type WorkRefused = Effect.Error<ReturnType<typeof workPieceNow>>;
