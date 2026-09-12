import { Pieces } from "@antumbra/pieces";
import { RoleSettings } from "@antumbra/settings";
import { Voyages } from "@antumbra/voyages";
import { Effect, Option } from "effect";
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
	const pieces = yield* Pieces;
	const sailing = yield* Voyages;
	const found = yield* pieces.byId(pieceId);
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
	const berthed = yield* sailing.byId(piece.voyageId);
	if (Option.isNone(berthed)) {
		return yield* new PieceNotOnVoyage({ pieceId });
	}
	const voyage = berthed.value;
	const agentId = crypto.randomUUID();
	const settings = yield* (yield* RoleSettings).resolve(voyage.id, "crew");
	const intentId = yield* reach.submitSpawn({
		agentId,
		...settings,
		charter: yield* charterFor(piece, voyage, agentId),
		pieceId,
		role: piece.role,
		runner: "local",
		sessionId: crypto.randomUUID(),
		voyageId: voyage.id,
	});
	return { agentId, intentId };
});

export type WorkRefused = Effect.Error<ReturnType<typeof workPieceNow>>;
