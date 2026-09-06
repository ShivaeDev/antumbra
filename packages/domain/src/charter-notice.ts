import type { PieceRow } from "@antumbra/pieces";
import { paceWords, plural, type VoyagePace } from "#voyage-pace.ts";

export interface CharteredPiece {
	readonly notice: ReadonlyArray<string>;
	readonly piece: PieceRow;
}

export const noticeOf = (blocking: ReadonlyArray<string>, pace: VoyagePace): ReadonlyArray<string> => {
	return [
		...(blocking.length === 0
			? []
			: [`this voyage has ${blocking.length} open blocking question${plural(blocking.length)}: ruling ${blocking.join(", ruling ")}`]),
		...(pace.unlaunched === 0 ? [] : [`this voyage has ${pace.unlaunched} other chartered piece${plural(pace.unlaunched)} not yet launched`]),
		...(pace.running + pace.waiting === 0 ? [] : [paceWords(pace)]),
	];
};

export const withNotice = (chartered: CharteredPiece, lead: string): string => [lead, ...chartered.notice].join("\n");
