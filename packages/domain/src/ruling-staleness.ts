import type { Ruling, RulingSubject } from "@antumbra/rulings";
import { type PieceState, pieceStates } from "#piece-state.ts";
import type { VoyageWorld } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";

const CONCLUDED: ReadonlySet<PieceState> = new Set<PieceState>(["abandoned", "done"]);

interface ConcludableSubject {
	readonly id: string;
	readonly kind: "piece" | "voyage";
}

const concludable = (subject: RulingSubject): subject is ConcludableSubject => subject.kind === "piece" || subject.kind === "voyage";

const pieceConcluded = (states: ReadonlyMap<string, PieceState>, pieceId: string): boolean => {
	const state = states.get(pieceId);
	return state !== undefined && CONCLUDED.has(state);
};

const voyageConcluded = (world: VoyageWorld, states: ReadonlyMap<string, PieceState>, voyageId: string): boolean => {
	const pieces = piecesOfVoyage(world, voyageId);
	return pieces.length > 0 && pieces.every((pieceId) => pieceConcluded(states, pieceId));
};

export const rulingStaleness = (world: VoyageWorld) => {
	const states = pieceStates(world);
	const concluded = (subject: ConcludableSubject): boolean =>
		subject.kind === "piece" ? pieceConcluded(states, subject.id) : voyageConcluded(world, states, subject.id);
	return (ruling: Ruling): boolean => {
		const finite = ruling.subjects.filter(concludable);
		return finite.length > 0 && finite.every(concluded);
	};
};
