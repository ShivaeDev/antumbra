import type {
	BoardEntryView,
	PieceCounts,
	PieceView,
	VoyageSummary,
	VoyageView,
} from "@antumbra/contract";
import { Option } from "effect";
import type { BoardEntryRow } from "#boards.ts";
import type { PieceView as DerivedPiece } from "#piece-view.ts";
import type {
	PieceCounts as DerivedCounts,
	VoyageSummary as DerivedSummary,
	VoyageView as DerivedVoyage,
} from "#voyage-view.ts";

// why: stamps are moments the domain holds as dates and the window shows as
// text; a missing stamp is the absence of the moment, never an empty string.
const stamp = (at: Date | null): string | null =>
	at === null ? null : at.toISOString();

const pieceSeen = (piece: DerivedPiece): PieceView => ({
	agents: piece.agents.map((agent) => ({
		agentId: agent.agentId,
		status: agent.status,
	})),
	artifacts: piece.artifacts.map((artifact) => ({
		authorAgentId: artifact.authorAgentId,
		id: artifact.id,
		title: artifact.title,
		uri: artifact.uri,
	})),
	charter: piece.charter,
	dependsOn: piece.dependsOn,
	expectation: piece.expectation,
	id: piece.id,
	launchedAt: stamp(piece.launchedAt),
	parkedAt: stamp(piece.parkedAt),
	reports: piece.reports.map((report) => ({
		authorAgentId: report.authorAgentId,
		id: report.id,
		title: report.title,
	})),
	role: piece.role,
	state: piece.state,
	title: piece.title,
});

export const entrySeen = (entry: BoardEntryRow): BoardEntryView => ({
	authorAgentId: entry.authorAgentId,
	body: entry.body,
	createdAt: entry.createdAt.toISOString(),
	id: entry.id,
	register: entry.register,
});

// why: a window asks how far a voyage has come, not for a tally per state —
// so the six derived counts reach it as the three that answer that question
// and the total they were counted from.
const countsSeen = (counts: DerivedCounts): PieceCounts => ({
	active: counts.active,
	done: counts.done,
	pieces: Object.values(counts).reduce((total, count) => total + count, 0),
	ready: counts.ready,
});

export const summarySeen = (summary: DerivedSummary): VoyageSummary => ({
	backend: summary.backend,
	captain: Option.getOrNull(summary.captain),
	counts: countsSeen(summary.counts),
	focusedAt: stamp(summary.focusedAt),
	id: summary.id,
	name: summary.name,
	northStar: summary.northStar,
	state: summary.state,
});

export const voyageSeen = (
	view: DerivedVoyage,
	board: ReadonlyArray<BoardEntryRow>,
): VoyageView => ({
	...summarySeen(view),
	board: board.map(entrySeen),
	context: view.context,
	crew: view.crew.map((member) => ({
		agentId: member.agentId,
		role: member.role,
		status: member.status,
	})),
	pieces: view.pieces.map(pieceSeen),
});
