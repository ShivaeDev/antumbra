import type {
	PieceState,
	PieceView,
	VoyageCaptainView,
} from "@antumbra/contract";

export type PieceAct = "launch" | "park" | "rewire" | "unpark" | "workNow";

// why: a voyage refuses a second captain only while the first is at work, and
// the domain publishes that judgment on the view — so the window offers the
// hail exactly when the domain would accept it, never on its own reading of
// an agent's status.
export const captainAtWork = (
	captain: VoyageCaptainView | null,
): captain is VoyageCaptainView => captain?.atWork === true;

// why: a closed table rather than a chain of conditions — a piece offers the
// verbs its derived state can accept, and a state that accepts none says so by
// holding an empty row. Working a piece now is offered exactly where the pool
// will not reach it on its own: it is already finished with, still gated, or
// not released yet. A ready piece is coming up anyway and a parked one was set
// aside on purpose, so neither is asked twice; an abandoned one is refused.
const ACCEPTS: Readonly<Record<PieceState, ReadonlyArray<PieceAct>>> = {
	abandoned: [],
	active: [],
	blocked: ["park", "workNow"],
	done: ["workNow"],
	held: ["launch", "workNow"],
	landing: ["park", "workNow"],
	parked: ["unpark"],
	ready: ["park"],
};

// why: rewiring is always offered because position is links, not state — a
// piece may be repositioned at any point in its life.
export const actsFor = (piece: PieceView): ReadonlyArray<PieceAct> => [
	...ACCEPTS[piece.state],
	"rewire",
];
