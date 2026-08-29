import type { Ruling, RulingSubject } from "@antumbra/rulings";
import { type PieceState, pieceStates } from "#piece-state.ts";
import type { VoyageWorld } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";

// why: a piece has concluded when nothing more will land against it — the same
// pair of states that stops it holding its dependents. Every other state is
// work that has not finished happening, however long ago it last moved.
const CONCLUDED: ReadonlySet<PieceState> = new Set<PieceState>([
	"abandoned",
	"done",
]);

// why: the reference variant carries every kind in one shape, so the two that
// can conclude are named here rather than extracted out of that union.
interface ConcludableSubject {
	readonly id: string;
	readonly kind: "piece" | "voyage";
}

const concludable = (subject: RulingSubject): subject is ConcludableSubject =>
	subject.kind === "piece" || subject.kind === "voyage";

const pieceConcluded = (
	states: ReadonlyMap<string, PieceState>,
	pieceId: string,
): boolean => {
	const state = states.get(pieceId);
	return state !== undefined && CONCLUDED.has(state);
};

// why: a voyage has no ending of its own to read, so it has concluded when the
// work chartered to it has: every piece settled, and at least one of them, or
// a voyage nobody has charted yet would read as finished before it began.
const voyageConcluded = (
	world: VoyageWorld,
	states: ReadonlyMap<string, PieceState>,
	voyageId: string,
): boolean => {
	const pieces = piecesOfVoyage(world, voyageId);
	return (
		pieces.length > 0 &&
		pieces.every((pieceId) => pieceConcluded(states, pieceId))
	);
};

// why: staleness is read off the subjects that can conclude at all. A piece and
// a voyage finish; a repo, an agent, or a free tag outlives any amount of work,
// so they neither age a ruling nor keep it fresh. A ruling naming none of them
// is never stale — nothing in the record says its question stopped mattering.
// This is surfaced and never acted on: a stale ruling binds every agent it
// names until an authority withdraws it.
export const rulingStaleness = (world: VoyageWorld) => {
	const states = pieceStates(world);
	const concluded = (subject: ConcludableSubject): boolean =>
		subject.kind === "piece"
			? pieceConcluded(states, subject.id)
			: voyageConcluded(world, states, subject.id);
	return (ruling: Ruling): boolean => {
		const finite = ruling.subjects.filter(concludable);
		return finite.length > 0 && finite.every(concluded);
	};
};
