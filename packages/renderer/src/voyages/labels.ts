import type { AwaitingRulingView, BoardEntryView, PieceState, PieceView, VoyageCaptainView, VoyageState, VoyageSummary } from "@antumbra/contract";
import type { PieceAct } from "#voyages/acts.ts";

export const voyageStateLabel: Readonly<Record<VoyageState, string>> = {
	quiet: "Quiet",
	underWay: "Under way",
};

export const voyageKindMark: Readonly<Record<VoyageSummary["kind"], string | null>> = {
	flagship: "Flagship",
	voyage: null,
};

export const pieceStateLabel: Readonly<Record<PieceState, string>> = {
	abandoned: "Abandoned",
	active: "Active",
	blocked: "Blocked",
	done: "Landed",
	held: "Held",
	landing: "Landing",
	parked: "Parked",
	ready: "Ready",
};

export const pieceActLabel: Readonly<Record<PieceAct, string>> = {
	launch: "Launch",
	park: "Park",
	rewire: "Rewire",
	unpark: "Unpark",
	workNow: "Work now",
};

export const boardRegisterLabel: Readonly<Record<BoardEntryView["register"], string>> = {
	rough: "Rough log",
	smooth: "Smooth log",
};

export const captainCallLabel = (captain: VoyageCaptainView | null): string => (captain?.status === "alive" ? "Wake the captain" : "Hail a captain");

export const dependsOnLabel = (piece: PieceView, pieces: ReadonlyArray<PieceView>): string => {
	const titles = piece.dependsOn.map((id) => pieces.find((other) => other.id === id)?.title ?? id);
	return titles.length === 0 ? "" : `Depends on: ${titles.join(", ")}`;
};

export const awaitingRulingLabel = (ruling: AwaitingRulingView): string => `Awaiting ruling ${ruling.rulingId}: ${ruling.question}`;

export const authorLabel = (authorAgentId: string | null): string => (authorAgentId === null ? "you" : authorAgentId.slice(0, 8));

export const whenLabel = (stamp: string): string => stamp.slice(0, 16).replace("T", " ");
