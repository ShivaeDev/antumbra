import type { BoardEntryRow } from "@antumbra/boards";
import type { BoardEntryView, ChangeView, PieceCounts, PieceView, VoyageSummary, VoyageView } from "@antumbra/contract";
import { Option } from "effect";
import type { ChangeView as DerivedChange } from "#change-view.ts";
import { crewReleasable } from "#crew-rest.ts";
import type { PieceView as DerivedPiece } from "#piece-view.ts";
import type { PieceCounts as DerivedCounts, VoyageSummary as DerivedSummary, VoyageView as DerivedVoyage } from "#voyage-view.ts";

const stamp = (at: Date | null): string | null => (at === null ? null : at.toISOString());

export const changeSeen = (change: DerivedChange): ChangeView => ({
	...change,
	activityAt: change.activityAt.toISOString(),
	observedAt: change.observedAt.toISOString(),
});

const pieceSeen = (piece: DerivedPiece, board: ReadonlyArray<BoardEntryRow>, resting: ReadonlyMap<string, ReadonlyArray<string>>): PieceView => ({
	agents: piece.agents,
	artifactHistory: piece.artifactHistory.map((artifact) => ({
		authorAgentId: artifact.authorAgentId,
		byteSize: artifact.byteSize,
		digest: artifact.digest,
		id: artifact.id,
		successorArtifactId: artifact.successorArtifactId,
		title: artifact.title,
	})),
	artifacts: piece.artifacts.map((artifact) => ({
		authorAgentId: artifact.authorAgentId,
		byteSize: artifact.byteSize,
		digest: artifact.digest,
		id: artifact.id,
		title: artifact.title,
	})),
	awaitingRulings: piece.awaitingRulings,
	board: board.map(entrySeen),
	canRetireCrew: crewReleasable(piece, resting),
	changes: piece.changes.map(changeSeen),
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

const entrySeen = (entry: BoardEntryRow): BoardEntryView => ({
	authorAgentId: entry.authorAgentId,
	body: entry.body,
	createdAt: entry.createdAt.toISOString(),
	id: entry.id,
	register: entry.register,
});

const countsSeen = (counts: DerivedCounts): PieceCounts => ({
	active: counts.active,
	done: counts.done,
	pieces: Object.values(counts).reduce((total, count) => total + count, 0),
	ready: counts.ready,
});

export const summarySeen = (summary: DerivedSummary): VoyageSummary => ({
	captain: Option.getOrNull(summary.captain),
	captainBackend: summary.captainBackend,
	captainEffort: summary.captainEffort,
	captainModel: summary.captainModel,
	counts: countsSeen(summary.counts),
	crewBackend: summary.crewBackend,
	crewEffort: summary.crewEffort,
	crewModel: summary.crewModel,
	focusedAt: stamp(summary.focusedAt),
	id: summary.id,
	kind: summary.kind,
	name: summary.name,
	northStar: summary.northStar,
	state: summary.state,
});

export const voyageSeen = (
	view: DerivedVoyage,
	board: ReadonlyArray<BoardEntryRow>,
	pieceBoards: ReadonlyMap<string, ReadonlyArray<BoardEntryRow>>,
	resting: ReadonlyMap<string, ReadonlyArray<string>>,
): VoyageView => ({
	...summarySeen(view),
	board: board.map(entrySeen),
	context: view.context,
	crew: view.crew,
	pieces: view.pieces.map((piece) => pieceSeen(piece, pieceBoards.get(piece.id) ?? [], resting)),
});
