import { Option } from "effect";
import { atWork } from "#agent-at-work.ts";
import { captainAtWork } from "#voyage-captain.ts";
import type { EdgeRow, PieceRow, VoyageWorld } from "#voyage-rows.ts";

export const PIECE_STATES = [
	"active",
	"blocked",
	"done",
	"held",
	"parked",
	"ready",
] as const;
export type PieceState = (typeof PIECE_STATES)[number];

export type VoyageState = "quiet" | "underWay";

// why: adding "from gates to" closes a loop exactly when `to` already reaches
// `from`, so the walk starts at `to` and looks for `from`. A self-edge is the
// degenerate case of the same question.
export const wouldCycle = (
	edges: ReadonlyArray<EdgeRow>,
	from: string,
	to: string,
): boolean => {
	const seen = new Set<string>();
	const frontier = [to];
	while (frontier.length > 0) {
		const at = frontier.pop();
		if (at === undefined || seen.has(at)) {
			continue;
		}
		if (at === from) {
			return true;
		}
		seen.add(at);
		for (const edge of edges) {
			if (edge.fromPieceId === at) {
				frontier.push(edge.toPieceId);
			}
		}
	}
	return false;
};

export const dependenciesOf = (
	edges: ReadonlyArray<EdgeRow>,
	pieceId: string,
): ReadonlyArray<string> =>
	edges
		.filter((edge) => edge.toPieceId === pieceId)
		.map((edge) => edge.fromPieceId);

export const donePieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set([
		...world.pieceReports.map((link) => link.pieceId),
		...world.pieceArtifacts.map((link) => link.pieceId),
	]);

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
	return blocked ? "blocked" : "ready";
};

// why: the ladder is the whole definition of a piece's state — no column
// stores it, so every reader walks these branches in this order and a piece
// can never hold two states at once.
export const pieceStates = (
	world: VoyageWorld,
): ReadonlyMap<string, PieceState> => {
	const done = donePieces(world);
	return new Map(
		world.pieces.map((piece) => [piece.id, stateOf(world, done, piece)]),
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
