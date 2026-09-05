import type { PieceRow } from "@antumbra/pieces";
import { atWork } from "#agent-at-work.ts";
import { pieceOutcomeTallies } from "#outcome-status.ts";
import type { DispatchWorld, RetirementWorld } from "#voyage-rows.ts";

type PieceStateRows = Omit<DispatchWorld, "memberships" | "voyages">;

export const PIECE_STATES = ["abandoned", "active", "blocked", "done", "held", "landing", "parked", "ready"] as const;
export type PieceState = (typeof PIECE_STATES)[number];

interface Settled {
	readonly abandoned: ReadonlySet<string>;
	readonly done: ReadonlySet<string>;
	readonly landing: ReadonlySet<string>;
}

const workingPieces = (world: RetirementWorld, settled: Settled): ReadonlySet<string> => {
	const working = new Set<string>();
	const eligible = new Set(world.pieces.filter((piece) => !settled.abandoned.has(piece.id)).map((piece) => piece.id));
	if (eligible.size === 0) return working;
	const assignees = Map.groupBy(
		world.assignments.filter((assignment) => eligible.has(assignment.pieceId)),
		(assignment) => assignment.agentId,
	);
	for (const [agentId, assignments] of assignees) {
		if (atWork(world, agentId)) {
			for (const assignment of assignments) working.add(assignment.pieceId);
		}
	}
	return working;
};

const pieceExecutionState = (settled: Settled, working: ReadonlySet<string>, pieceId: string) => {
	if (settled.abandoned.has(pieceId)) {
		return "abandoned";
	}
	if (working.has(pieceId)) {
		return "active";
	}
	return settled.done.has(pieceId) ? "done" : undefined;
};

const stateOf = (world: PieceStateRows, settled: Settled, working: ReadonlySet<string>, piece: PieceRow): PieceState => {
	const execution = pieceExecutionState(settled, working, piece.id);
	if (execution !== undefined) {
		return execution;
	}
	if (piece.parkedAt !== null) {
		return "parked";
	}
	if (piece.launchedAt === null) {
		return "held";
	}
	if (world.rulingGates.some((gate) => gate.pieceId === piece.id)) {
		return "blocked";
	}
	const blocked = world.edges.some(
		(edge) => edge.toPieceId === piece.id && !settled.done.has(edge.fromPieceId) && !settled.abandoned.has(edge.fromPieceId),
	);
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
	for (const [pieceId, tally] of pieceOutcomeTallies(world)) {
		if (world.pieceVerdicts.get(pieceId) === "abandoned") {
			settled.abandoned.add(pieceId);
		}
		if (tally.landed >= 1 && tally.pending === 0) {
			settled.done.add(pieceId);
		}
		if (tally.pending >= 1) {
			settled.landing.add(pieceId);
		}
	}
	return settled;
};

export const pieceStates = (world: PieceStateRows): ReadonlyMap<string, PieceState> => {
	const settled = settledPieces(world);
	const working = workingPieces(world, settled);
	return new Map(world.pieces.map((piece) => [piece.id, stateOf(world, settled, working, piece)]));
};

export const concludedPieces = (world: RetirementWorld): ReadonlyMap<string, "abandoned" | "done"> => {
	const settled = settledPieces(world);
	const working = workingPieces(world, settled);
	return new Map(
		world.pieces.flatMap((piece) => {
			const state = pieceExecutionState(settled, working, piece.id);
			return state === "abandoned" || state === "done" ? [[piece.id, state] as const] : [];
		}),
	);
};
