import type { PieceState, VoyageState } from "@antumbra/contract";

export type Tone = "info" | "outline" | "secondary" | "success" | "warning";

export const pieceTone: Readonly<Record<PieceState, Tone>> = {
	abandoned: "outline",
	active: "success",
	blocked: "warning",
	done: "outline",
	held: "outline",
	landing: "info",
	parked: "secondary",
	ready: "info",
};

export const voyageTone: Readonly<Record<VoyageState, Tone>> = {
	quiet: "outline",
	underWay: "success",
};
