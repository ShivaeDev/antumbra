import type { EdgeRow, PieceRow } from "@antumbra/pieces";
import { atWork } from "#agent-at-work.ts";
import { pieceOutcomeTally } from "#outcome-status.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export { wouldCycle } from "@antumbra/pieces";

export const PIECE_STATES = [
	"abandoned",
	"active",
	"blocked",
	"done",
	"held",
	"landing",
	"parked",
	"ready",
] as const;
export type PieceState = (typeof PIECE_STATES)[number];

export const dependenciesOf = (
	edges: ReadonlyArray<EdgeRow>,
	pieceId: string,
): ReadonlyArray<string> =>
	edges
		.filter((edge) => edge.toPieceId === pieceId)
		.map((edge) => edge.fromPieceId);

// why: done is at least one outcome landed and none still pending — an
// outcome that takes its time to land keeps the piece short of done however
// much else has already landed against it. This stays the tally and nothing
// else, because it is also what releases a piece's dependents: work that
// landed un-gates what waited on it whether or not the crew that landed it
// has finished saying so. Who is still at work is asked one rung up, where it
// decides what this piece reads as rather than what may sail behind it.
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

// why: abandoned is a meaning, not a decoration on done — a piece nobody will
// finish is not a piece that landed, and reading one as the other is how a
// fleet loses track of what it actually delivered. Nothing else holds behind
// it either: a dependency the admiral has written off will never land, so it
// stops gating its dependents the moment the verdict does. The verdict is read
// without asking what the crew is doing, because writing a piece off is the
// decision to stop rather than a report of having stopped.
export const abandonedPieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set(
		world.pieces
			.filter((piece) => world.pieceVerdicts.get(piece.id) === "abandoned")
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

interface Settled {
	readonly abandoned: ReadonlySet<string>;
	readonly done: ReadonlySet<string>;
	readonly landing: ReadonlySet<string>;
}

const stateOf = (
	world: VoyageWorld,
	settled: Settled,
	piece: PieceRow,
): PieceState => {
	if (settled.abandoned.has(piece.id)) {
		return "abandoned";
	}
	if (workingAssignees(world, piece.id).length > 0) {
		return "active";
	}
	if (settled.done.has(piece.id)) {
		return "done";
	}
	if (piece.parkedAt !== null) {
		return "parked";
	}
	if (piece.launchedAt === null) {
		return "held";
	}
	const blocked = dependenciesOf(world.edges, piece.id).some(
		(dependency) =>
			!settled.done.has(dependency) && !settled.abandoned.has(dependency),
	);
	if (blocked) {
		return "blocked";
	}
	return settled.landing.has(piece.id) ? "landing" : "ready";
};

// why: the ladder is the whole definition of a piece's state — no column
// stores it, so every reader walks these branches in this order and a piece
// can never hold two states at once. A verdict is read here exactly like a
// stamp is: it supplies a landed fact and this order decides what the piece
// reads as. A piece is shipped only when all of its work is done, so a crew
// still at work is asked about before the tally underneath it: asking for
// work again on a finished piece puts that piece back in progress where it
// can be seen, and it reads done again once the crew is finished and the
// outcomes stand. Abandoned outranks even that, because writing a piece off
// is a decision to stop rather than a report of having stopped. A pending
// outcome holds a piece out of the pool without a crew: nobody is working it,
// and nothing will be spawned for it until what it is waiting on lands.
export const pieceStates = (
	world: VoyageWorld,
): ReadonlyMap<string, PieceState> => {
	const settled: Settled = {
		abandoned: abandonedPieces(world),
		done: donePieces(world),
		landing: landingPieces(world),
	};
	return new Map(
		world.pieces.map((piece) => [piece.id, stateOf(world, settled, piece)]),
	);
};
