import type { EdgeRow, PieceRow } from "@antumbra/pieces";
import { atWork } from "#agent-at-work.ts";
import { pieceOutcomeTally } from "#outcome-status.ts";
import type { AwaitingRuling, DispatchWorld, RetirementWorld } from "#voyage-rows.ts";

type PieceStateRows = Omit<DispatchWorld, "memberships" | "voyages">;

export const PIECE_STATES = ["abandoned", "active", "blocked", "done", "held", "landing", "parked", "ready"] as const;
export type PieceState = (typeof PIECE_STATES)[number];

export const dependenciesOf = (edges: ReadonlyArray<EdgeRow>, pieceId: string): ReadonlyArray<string> =>
	edges.filter((edge) => edge.toPieceId === pieceId).map((edge) => edge.fromPieceId);

export const awaitingRulingsOf = (world: Pick<DispatchWorld, "rulingGates">, pieceId: string): ReadonlyArray<AwaitingRuling> =>
	world.rulingGates.filter((gate) => gate.pieceId === pieceId).map((gate) => ({ question: gate.question, rulingId: gate.rulingId }));

export const workingAssignees = (world: RetirementWorld, pieceId: string): ReadonlyArray<string> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.filter((assignment) => atWork(world, assignment.agentId))
		.map((assignment) => assignment.agentId);

interface Settled {
	readonly abandoned: ReadonlySet<string>;
	readonly done: ReadonlySet<string>;
	readonly landing: ReadonlySet<string>;
}

const pieceExecutionState = (world: RetirementWorld, settled: Settled, pieceId: string) => {
	if (settled.abandoned.has(pieceId)) {
		return "abandoned";
	}
	if (workingAssignees(world, pieceId).length > 0) {
		return "active";
	}
	return settled.done.has(pieceId) ? "done" : undefined;
};

const stateOf = (world: PieceStateRows, settled: Settled, piece: PieceRow): PieceState => {
	const execution = pieceExecutionState(world, settled, piece.id);
	if (execution !== undefined) {
		return execution;
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

const settledPieces = (world: RetirementWorld): Settled => {
	const settled = {
		abandoned: new Set<string>(),
		done: new Set<string>(),
		landing: new Set<string>(),
	};
	for (const piece of world.pieces) {
		if (world.pieceVerdicts.get(piece.id) === "abandoned") {
			settled.abandoned.add(piece.id);
		}
		const tally = pieceOutcomeTally(world, piece.id);
		if (tally.landed >= 1 && tally.pending === 0) {
			settled.done.add(piece.id);
		}
		if (tally.pending >= 1) {
			settled.landing.add(piece.id);
		}
	}
	return settled;
};

export const pieceStates = (world: PieceStateRows): ReadonlyMap<string, PieceState> => {
	const settled = settledPieces(world);
	return new Map(world.pieces.map((piece) => [piece.id, stateOf(world, settled, piece)]));
};

export const concludedPieces = (world: RetirementWorld): ReadonlyMap<string, "abandoned" | "done"> => {
	const settled = settledPieces(world);
	return new Map(
		world.pieces.flatMap((piece) => {
			const state = pieceExecutionState(world, settled, piece.id);
			return state === "abandoned" || state === "done" ? [[piece.id, state] as const] : [];
		}),
	);
};

export const heldPieceCount = (world: RetirementWorld): number => {
	const settled = settledPieces(world);
	return world.pieces.filter(
		(piece) => piece.parkedAt === null && piece.launchedAt === null && pieceExecutionState(world, settled, piece.id) === undefined,
	).length;
};
