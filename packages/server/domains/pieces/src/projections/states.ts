import type { RowValue } from "@antumbra/platform-feature/row.ts";
import type { PieceId } from "#ids.ts";
import type { piece } from "#rows/piece.ts";
import type { pieceAssignmentWork } from "#rows/piece-assignment-work.ts";
import type { pieceEdge } from "#rows/piece-edge.ts";
import type { pieceOutcome } from "#rows/piece-outcome.ts";
import type { pieceProgress } from "#rows/piece-progress.ts";
import type { pieceRulingGate } from "#rows/piece-ruling-gate.ts";

type Piece = RowValue<typeof piece>;

interface Evidence {
	readonly pieces: readonly RowValue<typeof piece>[];
	readonly outcomes: readonly RowValue<typeof pieceOutcome>[];
	readonly assignments: readonly RowValue<typeof pieceAssignmentWork>[];
	readonly edges: readonly RowValue<typeof pieceEdge>[];
	readonly gates: readonly RowValue<typeof pieceRulingGate>[];
}

interface Settlement {
	readonly done: ReadonlySet<PieceId>;
	readonly abandoned: ReadonlySet<PieceId>;
	readonly landing: ReadonlySet<PieceId>;
}

const settlements = (evidence: Evidence): Settlement => {
	const outcomes = Map.groupBy(evidence.outcomes, (outcome) => outcome.pieceId);
	const done = new Set<PieceId>();
	const abandoned = new Set<PieceId>();
	const landing = new Set<PieceId>();
	for (const piece of evidence.pieces) {
		const linked = outcomes.get(piece.id) ?? [];
		const pending = linked.some((outcome) => outcome.status === "pending");
		if (pending) landing.add(piece.id);
		if (!pending && (piece.verdict !== null || linked.some((outcome) => outcome.status === "landed"))) done.add(piece.id);
		if (piece.verdict === "abandoned") abandoned.add(piece.id);
	}
	return { done, abandoned, landing };
};

const stateOf = (piece: Piece, evidence: Evidence, settled: Settlement, working: ReadonlySet<PieceId>): RowValue<typeof pieceProgress>["state"] => {
	if (settled.abandoned.has(piece.id)) return "abandoned";
	if (working.has(piece.id)) return "active";
	if (settled.done.has(piece.id)) return "done";
	if (piece.parkedAt !== null) return "parked";
	if (piece.launchedAt === null) return "held";
	if (evidence.gates.some((gate) => gate.pieceId === piece.id)) return "blocked";
	if (evidence.edges.some((edge) => edge.to === piece.id && !settled.done.has(edge.from) && !settled.abandoned.has(edge.from))) return "blocked";
	return settled.landing.has(piece.id) ? "landing" : "ready";
};

export const progressOf = (evidence: Evidence): readonly RowValue<typeof pieceProgress>[] => {
	const settled = settlements(evidence);
	const working = new Set(evidence.assignments.filter((assignment) => assignment.working).map((assignment) => assignment.pieceId));
	return evidence.pieces.map((piece) => {
		const state = stateOf(piece, evidence, settled, working);
		return {
			id: piece.id,
			voyageId: piece.voyageId,
			state,
			settledDone: settled.done.has(piece.id),
			abandoned: settled.abandoned.has(piece.id),
			concluded: state === "abandoned" || state === "done",
		};
	});
};
