import { type CharterInput, Pieces } from "@antumbra/pieces";
import { Effect, Option } from "effect";
import { EdgeReached, FrontierBlocking } from "#charter-edge-errors.ts";
import { frontierOf } from "#frontier.ts";
import type { VoyageWorld } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

const UNLAUNCHED_LIMIT = 3;

const unlaunchedOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<string> => {
	const members = new Set(piecesOfVoyage(world, voyageId));
	return world.pieces
		.filter((piece) => members.has(piece.id) && piece.launchedAt === null && piece.parkedAt === null)
		.filter((piece) => world.pieceVerdicts.get(piece.id) !== "abandoned")
		.map((piece) => piece.id);
};

const edgeOf = (world: VoyageWorld, voyageId: string): Option.Option<EdgeReached | FrontierBlocking> => {
	const blocking = frontierOf(world, voyageId)
		.filter((ruling) => ruling.urgency === "blocking")
		.map((ruling) => ruling.id);
	if (blocking.length > 0) {
		return Option.some(new FrontierBlocking({ rulingIds: blocking }));
	}
	const unlaunched = unlaunchedOf(world, voyageId);
	return unlaunched.length < UNLAUNCHED_LIMIT ? Option.none() : Option.some(new EdgeReached({ unlaunched }));
};

export const makeEdgeCharter = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const world = yield* VoyageWorldSource;
	return (input: CharterInput) =>
		Effect.gen(function* () {
			const edge = edgeOf(yield* world.read(), input.voyageId);
			return Option.isSome(edge) ? yield* edge.value : yield* pieces.charter(input);
		});
});
