import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { recoveryHeld } from "#recovery/error.ts";

const oneAssignment = (kind: "Piece" | "Voyage", sessionId: string, ids: ReadonlyArray<string>) => {
	if (ids.length > 1) {
		return Effect.fail(recoveryHeld(`${sessionId} has ambiguous current ${kind} authority`));
	}
	return Effect.succeed(Option.fromUndefinedOr(ids[0]));
};
export const authority = Effect.fn("SessionRecoveryContexts.authority")(function* (agentId: string, sessionId: string) {
	const db = yield* Database;

	const pieces = yield* db.PieceAgent.where({ agentId }).all();
	const voyages = yield* db.VoyageAgent.where({ agentId }).all();
	return {
		pieceId: yield* oneAssignment(
			"Piece",
			sessionId,
			pieces.map((piece) => piece.pieceId),
		),
		voyageId: yield* oneAssignment(
			"Voyage",
			sessionId,
			voyages.map((voyage) => voyage.voyageId),
		),
	};
});
