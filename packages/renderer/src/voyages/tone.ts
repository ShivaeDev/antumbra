import type { PieceState, VoyageState } from "@antumbra/contract";

export type Tone = "info" | "outline" | "secondary" | "success" | "warning";

// why: seven piece states but four tiers of attention — what is moving, what
// waits on something outside itself, what is stuck, and what is at rest. The
// tone says which tier a row belongs to and the word beside it says exactly
// which state earned that tier, so colour never has to carry seven meanings.
export const pieceTone: Readonly<Record<PieceState, Tone>> = {
	active: "success",
	blocked: "warning",
	done: "outline",
	held: "outline",
	landing: "info",
	parked: "secondary",
	ready: "info",
};

// why: a voyage is under way because work is happening on it, so it wears the
// same tone a moving piece does.
export const voyageTone: Readonly<Record<VoyageState, Tone>> = {
	quiet: "outline",
	underWay: "success",
};
