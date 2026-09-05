import { type CharterInput, type PieceRow, Pieces } from "@antumbra/pieces";
import { Effect } from "effect";
import { frontierOf } from "#frontier.ts";
import { pieceStates } from "#piece-state.ts";
import type { VoyageWorld } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export interface CharteredPiece {
	readonly notice: ReadonlyArray<string>;
	readonly piece: PieceRow;
}

const plural = (count: number): string => (count === 1 ? "" : "s");

const blockingOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<string> =>
	frontierOf(world, voyageId)
		.filter((ruling) => ruling.urgency === "blocking")
		.map((ruling) => ruling.id);

const unlaunchedOf = (world: VoyageWorld, voyageId: string): number => {
	const states = pieceStates(world);
	return piecesOfVoyage(world, voyageId).filter((pieceId) => states.get(pieceId) === "held").length;
};

const noticeOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<string> => {
	const blocking = blockingOf(world, voyageId);
	const unlaunched = unlaunchedOf(world, voyageId);
	return [
		...(blocking.length === 0
			? []
			: [`this voyage has ${blocking.length} open blocking question${plural(blocking.length)}: ruling ${blocking.join(", ruling ")}`]),
		...(unlaunched === 0 ? [] : [`this voyage has ${unlaunched} other chartered piece${plural(unlaunched)} not yet launched`]),
	];
};

export const withNotice = (chartered: CharteredPiece, lead: string): string => [lead, ...chartered.notice].join("\n");

export const makeReportingCharter = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const world = yield* VoyageWorldSource;
	return (input: CharterInput) =>
		Effect.gen(function* () {
			const notice = noticeOf(yield* world.read(), input.voyageId);
			return { notice, piece: yield* pieces.charter(input) } satisfies CharteredPiece;
		});
});
