import {
	type AwaitingRulingView,
	type BoardEntryView,
	type BoardSummaryView,
	type PieceState,
	type PieceView,
	SUMMARY_LEVELS,
	type SummaryLevel,
	type VoyageCaptainView,
	type VoyageState,
	type VoyageSummary,
} from "@antumbra/contract";
import type { PieceAct } from "#voyages/acts.ts";
import { type BoardNode, coveredEntryCount, coveredSummaries } from "#voyages/board-tree.ts";

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

export const boardEntryKindLabel: Readonly<Record<Exclude<BoardEntryView["kind"], "summary">, string>> = {
	mail: "Mail",
	note: "Note",
};

const summaryWords: Readonly<Record<SummaryLevel, { readonly heading: string; readonly many: string; readonly one: string }>> = {
	day: { heading: "Day summary", many: "days", one: "day" },
	piece: { heading: "Piece summary", many: "pieces", one: "piece" },
};

const counted = (count: number, words: { readonly many: string; readonly one: string }): string => `${count} ${count === 1 ? words.one : words.many}`;

export const summaryHeadingLabel = (summary: BoardSummaryView, covered: ReadonlyArray<BoardNode>, boardName: string): string => {
	const words = summaryWords[summary.level];
	const range = summary.level === "piece" ? boardName : (covered.at(-1)?.entry ?? summary).createdAt.slice(0, 10);
	return `${words.heading} · ${range}`;
};

export const summaryCoveredLabel = (covered: ReadonlyArray<BoardNode>): string => {
	const levels = coveredSummaries(covered).map((summary) => summary.level);
	const grouped = SUMMARY_LEVELS.filter((level) => levels.includes(level)).map((level) =>
		counted(levels.filter((each) => each === level).length, summaryWords[level]),
	);
	return [...grouped, counted(coveredEntryCount(covered), { many: "entries", one: "entry" })].join(" · ");
};

export const captainCallLabel = (captain: VoyageCaptainView | null): string => (captain?.status === "alive" ? "Wake the captain" : "Hail a captain");

export const dependsOnLabel = (piece: PieceView, pieces: ReadonlyArray<PieceView>): string => {
	const titles = piece.dependsOn.map((id) => pieces.find((other) => other.id === id)?.title ?? id);
	return titles.length === 0 ? "" : `Depends on: ${titles.join(", ")}`;
};

export const awaitingRulingLabel = (ruling: AwaitingRulingView): string => `Awaiting ruling ${ruling.rulingId}: ${ruling.question}`;

export const authorLabel = (authorAgentId: string | null): string => (authorAgentId === null ? "you" : authorAgentId.slice(0, 8));

export const whenLabel = (stamp: string): string => stamp.slice(0, 16).replace("T", " ");
