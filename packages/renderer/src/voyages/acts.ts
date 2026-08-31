import type { PieceState, PieceView, VoyageCaptainView } from "@antumbra/contract";

export type PieceAct = "launch" | "park" | "rewire" | "unpark" | "workNow";

export const captainAtWork = (captain: VoyageCaptainView | null): captain is VoyageCaptainView => captain?.atWork === true;

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

export const actsFor = (piece: PieceView): ReadonlyArray<PieceAct> => [...ACCEPTS[piece.state], "rewire"];
