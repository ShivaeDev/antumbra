import type { EdgeRow, PieceRow } from "@antumbra/pieces";
import { atWork } from "#agent-at-work.ts";
import { pieceOutcomeTally } from "#outcome-status.ts";
import type { AwaitingRuling, VoyageWorld } from "#voyage-rows.ts";

export const PIECE_STATES = ["abandoned", "active", "blocked", "done", "held", "landing", "parked", "ready"] as const;
export type PieceState = (typeof PIECE_STATES)[number];

export const dependenciesOf = (edges: ReadonlyArray<EdgeRow>, pieceId: string): ReadonlyArray<string> =>
	edges.filter((edge) => edge.toPieceId === pieceId).map((edge) => edge.fromPieceId);

export const donePieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set(
		world.pieces
			.map((piece) => ({ id: piece.id, ...pieceOutcomeTally(world, piece.id) }))
			.filter((tally) => tally.landed >= 1 && tally.pending === 0)
			.map((tally) => tally.id),
	);

export const landingPieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set(world.pieces.filter((piece) => pieceOutcomeTally(world, piece.id).pending >= 1).map((piece) => piece.id));

export const abandonedPieces = (world: VoyageWorld): ReadonlySet<string> =>
	new Set(world.pieces.filter((piece) => world.pieceVerdicts.get(piece.id) === "abandoned").map((piece) => piece.id));

export const awaitingRulingsOf = (world: VoyageWorld, pieceId: string): ReadonlyArray<AwaitingRuling> =>
	world.rulingGates.filter((gate) => gate.pieceId === pieceId).map((gate) => ({ question: gate.question, rulingId: gate.rulingId }));

export const workingAssignees = (world: VoyageWorld, pieceId: string): ReadonlyArray<string> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.filter((assignment) => atWork(world, assignment.agentId))
		.map((assignment) => assignment.agentId);

interface Settled {
	readonly abandoned: ReadonlySet<string>;
	readonly done: ReadonlySet<string>;
	readonly landing: ReadonlySet<string>;
}

const stateOf = (world: VoyageWorld, settled: Settled, piece: PieceRow): PieceState => {
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
	if (awaitingRulingsOf(world, piece.id).length > 0) {
		return "blocked";
	}
	const blocked = dependenciesOf(world.edges, piece.id).some((dependency) => !settled.done.has(dependency) && !settled.abandoned.has(dependency));
	if (blocked) {
		return "blocked";
	}
	return settled.landing.has(piece.id) ? "landing" : "ready";
};

export const pieceStates = (world: VoyageWorld): ReadonlyMap<string, PieceState> => {
	const settled: Settled = {
		abandoned: abandonedPieces(world),
		done: donePieces(world),
		landing: landingPieces(world),
	};
	return new Map(world.pieces.map((piece) => [piece.id, stateOf(world, settled, piece)]));
};
