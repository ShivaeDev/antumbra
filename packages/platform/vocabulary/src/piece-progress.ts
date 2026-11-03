import type { Piece, PieceEdge, PieceId, PieceProgress } from "#piece.ts";
import type { PieceAssignmentWork, PieceOutcome, PieceRulingGate } from "#piece-evidence.ts";

interface Evidence {
	readonly pieces: readonly (typeof Piece.Type)[];
	readonly outcomes: readonly (typeof PieceOutcome.Type)[];
	readonly assignments: readonly (typeof PieceAssignmentWork.Type)[];
	readonly edges: readonly (typeof PieceEdge.Type)[];
	readonly gates: readonly (typeof PieceRulingGate.Type)[];
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

const stateOf = (piece: typeof Piece.Type, evidence: Evidence, settled: Settlement): (typeof PieceProgress.Type)["state"] => {
	if (settled.abandoned.has(piece.id)) return "abandoned";
	if (settled.done.has(piece.id)) return "done";
	if (piece.parkedAt !== null) return "parked";
	if (piece.launchedAt === null) return "held";
	if (evidence.gates.some((gate) => gate.pieceId === piece.id)) return "blocked";
	if (evidence.edges.some((edge) => edge.to === piece.id && !settled.done.has(edge.from) && !settled.abandoned.has(edge.from))) return "blocked";
	return settled.landing.has(piece.id) ? "landing" : "ready";
};

export const progressOf = (evidence: Evidence): readonly (typeof PieceProgress.Type)[] => {
	const settled = settlements(evidence);
	const working = new Set(evidence.assignments.filter((assignment) => assignment.working).map((assignment) => assignment.pieceId));
	return evidence.pieces.map((piece) => {
		const resting = stateOf(piece, evidence, settled);
		const state = resting !== "abandoned" && working.has(piece.id) ? "active" : resting;
		return {
			id: piece.id,
			voyageId: piece.voyageId,
			state,
			eligible: resting === "ready",
			settledDone: settled.done.has(piece.id),
			abandoned: settled.abandoned.has(piece.id),
			concluded: state === "abandoned" || state === "done",
		};
	});
};
