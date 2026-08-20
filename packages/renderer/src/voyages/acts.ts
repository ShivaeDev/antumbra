import type {
	PieceState,
	PieceView,
	VoyageCaptainView,
} from "@antumbra/contract";

export type PieceAct = "launch" | "park" | "rewire" | "unpark";

// why: a voyage refuses a second captain only while the first is at work, and
// the domain publishes that judgment on the view — so the window offers the
// hail exactly when the domain would accept it, never on its own reading of
// an agent's status.
export const captainAtWork = (
	captain: VoyageCaptainView | null,
): captain is VoyageCaptainView => captain?.atWork === true;

// why: a closed table rather than a chain of conditions — a piece offers the
// verbs its derived state can accept, and a state that accepts none says so by
// holding an empty row.
const ACCEPTS: Readonly<Record<PieceState, ReadonlyArray<PieceAct>>> = {
	active: [],
	blocked: ["park"],
	done: [],
	held: ["launch"],
	landing: ["park"],
	parked: ["unpark"],
	ready: ["park"],
};

// why: rewiring is always offered because position is links, not state — a
// piece may be repositioned at any point in its life.
export const actsFor = (piece: PieceView): ReadonlyArray<PieceAct> => [
	...ACCEPTS[piece.state],
	"rewire",
];
