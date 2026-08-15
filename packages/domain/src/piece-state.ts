import type { EdgeRow, PieceRow } from "@antumbra/pieces";
import { Option } from "effect";
import { atWork } from "#agent-at-work.ts";
import { pieceOutcomeTally } from "#outcome-status.ts";
import { captainAtWork } from "#voyage-captain.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export { wouldCycle } from "@antumbra/pieces";

export const PIECE_STATES = [
	"active",
	"blocked",
	"done",
	"held",
	"landing",
	"parked",
	"ready",
] as const;
export type PieceState = (typeof PIECE_STATES)[number];

export type VoyageState = "quiet" | "underWay";

export const dependenciesOf = (
	edges: ReadonlyArray<EdgeRow>,
	pieceId: string,
): ReadonlyArray<string> =>
	edges
		.filter((edge) => edge.toPieceId === pieceId)
		.map((edge) => edge.fromPieceId);

// why: done is at least one outcome landed and none still pending — an
// outcome that takes its time to land keeps the piece short of done however
// much else has already landed against it.
export const donePieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set(
		world.pieces
			.map((piece) => ({ id: piece.id, ...pieceOutcomeTally(world, piece.id) }))
			.filter((tally) => tally.landed >= 1 && tally.pending === 0)
			.map((tally) => tally.id),
	);

export const landingPieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set(
		world.pieces
			.filter((piece) => pieceOutcomeTally(world, piece.id).pending >= 1)
			.map((piece) => piece.id),
	);

export const workingAssignees = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<string> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.filter((assignment) => atWork(world, assignment.agentId))
		.map((assignment) => assignment.agentId);

const stateOf = (
	world: VoyageWorld,
	done: ReadonlySet<string>,
	landing: ReadonlySet<string>,
	piece: PieceRow,
): PieceState => {
	if (done.has(piece.id)) {
		return "done";
	}
	if (workingAssignees(world, piece.id).length > 0) {
		return "active";
	}
	if (piece.parkedAt !== null) {
		return "parked";
	}
	if (piece.launchedAt === null) {
		return "held";
	}
	const blocked = dependenciesOf(world.edges, piece.id).some(
		(dependency) => !done.has(dependency),
	);
	if (blocked) {
		return "blocked";
	}
	return landing.has(piece.id) ? "landing" : "ready";
};

// why: the ladder is the whole definition of a piece's state — no column
// stores it, so every reader walks these branches in this order and a piece
// can never hold two states at once. A pending outcome holds a piece out of
// the pool without a crew: nobody is working it, and nothing will be spawned
// for it until what it is waiting on lands.
export const pieceStates = (
	world: VoyageWorld,
): ReadonlyMap<string, PieceState> => {
	const done = donePieces(world);
	const landing = landingPieces(world);
	return new Map(
		world.pieces.map((piece) => [
			piece.id,
			stateOf(world, done, landing, piece),
		]),
	);
};

export const piecesOfVoyage = (
	world: VoyageWorld,
	voyageId: string,
): ReadonlyArray<string> =>
	world.memberships
		.filter((membership) => membership.voyageId === voyageId)
		.map((membership) => membership.pieceId);

export const voyageState = (
	world: VoyageWorld,
	states: ReadonlyMap<string, PieceState>,
	voyageId: string,
): VoyageState => {
	const working = piecesOfVoyage(world, voyageId).some(
		(pieceId) => states.get(pieceId) === "active",
	);
	return working || Option.isSome(captainAtWork(world, voyageId))
		? "underWay"
		: "quiet";
};
