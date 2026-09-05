import { type CharterInput, type PieceRow, Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { ExecutionSource } from "#execution/service.ts";

export interface CharteredPiece {
	readonly notice: ReadonlyArray<string>;
	readonly piece: PieceRow;
}

const plural = (count: number): string => (count === 1 ? "" : "s");

const noticeOf = (blocking: ReadonlyArray<string>, unlaunched: number): ReadonlyArray<string> => {
	return [
		...(blocking.length === 0
			? []
			: [`this voyage has ${blocking.length} open blocking question${plural(blocking.length)}: ruling ${blocking.join(", ruling ")}`]),
		...(unlaunched === 0 ? [] : [`this voyage has ${unlaunched} other chartered piece${plural(unlaunched)} not yet launched`]),
	];
};

export const withNotice = (chartered: CharteredPiece, lead: string): string => [lead, ...chartered.notice].join("\n");

export const makeReportingCharter = Effect.fnUntraced(function* () {
	const pieces = yield* Pieces;
	const rulings = yield* Rulings;
	const execution = yield* ExecutionSource;
	return Effect.fn("Domain.charterWithNotice")(function* (input: CharterInput) {
		const blocking = (yield* rulings.frontier(input.voyageId)).filter((ruling) => ruling.urgency === "blocking").map((ruling) => ruling.id);
		const notice = noticeOf(blocking, yield* execution.heldPieceCount(input.voyageId));
		return { notice, piece: yield* pieces.charter(input) } satisfies CharteredPiece;
	});
});
