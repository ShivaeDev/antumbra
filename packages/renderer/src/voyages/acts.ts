import type {
	PieceState,
	PieceView,
	VoyageCaptainView,
} from "@antumbra/contract";

export type PieceAct = "launch" | "park" | "rewire" | "unpark";

// why: a voyage refuses a second captain only while the first is at work, and
// being born counts as at work — so the window offers the hail exactly when
// this is false. A captain that has stood down is history, not an address.
const AT_WORK: ReadonlySet<string> = new Set(["alive", "spawning"]);

export const captainAtWork = (
	captain: VoyageCaptainView | null,
): captain is VoyageCaptainView =>
	captain !== null && AT_WORK.has(captain.status);

// why: a closed table rather than a chain of conditions — a piece offers the
// verbs its derived state can accept, and a state that accepts none says so by
// holding an empty row.
const ACCEPTS: Readonly<Record<PieceState, ReadonlyArray<PieceAct>>> = {
	active: [],
	blocked: ["park"],
	done: [],
	held: ["launch"],
	parked: ["unpark"],
	ready: ["park"],
};

// why: rewiring is always offered because position is links, not state — a
// piece may be repositioned at any point in its life.
export const actsFor = (piece: PieceView): ReadonlyArray<PieceAct> => [
	...ACCEPTS[piece.state],
	"rewire",
];
