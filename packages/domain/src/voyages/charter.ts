import { type CharterInput, Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { type CharteredPiece, noticeOf } from "#charter-notice.ts";
import { ExecutionSource } from "#execution/service.ts";

export const charterWithNotice = Effect.fn("VoyageProcedures.charterWithNotice")(function* (input: CharterInput) {
	const pieces = yield* Pieces;
	const rulings = yield* Rulings;
	const execution = yield* ExecutionSource;
	const blocking = (yield* rulings.frontier(input.voyageId)).filter((ruling) => ruling.urgency === "blocking").map((ruling) => ruling.id);
	const notice = noticeOf(blocking, yield* execution.voyagePace(input.voyageId));
	return { notice, piece: yield* pieces.charter(input) } satisfies CharteredPiece;
});
