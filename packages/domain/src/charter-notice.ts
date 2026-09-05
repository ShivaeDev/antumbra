import { type CharterInput, type PieceRow, Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { ExecutionSource } from "#execution/service.ts";
import { paceWords, plural, type VoyagePace } from "#voyage-pace.ts";

export interface CharteredPiece {
	readonly notice: ReadonlyArray<string>;
	readonly piece: PieceRow;
}

const noticeOf = (blocking: ReadonlyArray<string>, pace: VoyagePace): ReadonlyArray<string> => {
	return [
		...(blocking.length === 0
			? []
			: [`this voyage has ${blocking.length} open blocking question${plural(blocking.length)}: ruling ${blocking.join(", ruling ")}`]),
		...(pace.unlaunched === 0 ? [] : [`this voyage has ${pace.unlaunched} other chartered piece${plural(pace.unlaunched)} not yet launched`]),
		...(pace.running + pace.waiting === 0 ? [] : [paceWords(pace)]),
	];
};

export const withNotice = (chartered: CharteredPiece, lead: string): string => [lead, ...chartered.notice].join("\n");

export const makeReportingCharter = Effect.fnUntraced(function* () {
	const pieces = yield* Pieces;
	const rulings = yield* Rulings;
	const execution = yield* ExecutionSource;
	return Effect.fn("Domain.charterWithNotice")(function* (input: CharterInput) {
		const blocking = (yield* rulings.frontier(input.voyageId)).filter((ruling) => ruling.urgency === "blocking").map((ruling) => ruling.id);
		const notice = noticeOf(blocking, yield* execution.voyagePace(input.voyageId));
		return { notice, piece: yield* pieces.charter(input) } satisfies CharteredPiece;
	});
});
