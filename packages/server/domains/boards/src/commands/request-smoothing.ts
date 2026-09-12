import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Option, Schema } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";

const { voyageId, pieceId, throughToday } = smoothingRequested.payload;
export const requestSmoothing = command("requestSmoothing", {
	input: { voyageId, pieceId, throughToday },
	reads: [voyage, piece],
	emits: smoothingRequested,
	rejections: { UnknownVoyage: { id: Schema.String }, WrongPiece: { id: Schema.String } },
	run: Effect.fn("boards.requestSmoothing")(function* (input, rows, reject) {
		if (!(yield* rows.voyage.exists(input.voyageId))) return yield* reject.UnknownVoyage({ id: input.voyageId });
		if (input.pieceId !== null) {
			const held = yield* rows.piece.find(input.pieceId);
			if (Option.isNone(held) || held.value.voyageId !== input.voyageId) return yield* reject.WrongPiece({ id: input.pieceId });
		}
		return {
			id: input.requestId,
			voyageId: input.voyageId,
			pieceId: input.pieceId,
			throughToday: input.throughToday,
			requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
		};
	}),
});
