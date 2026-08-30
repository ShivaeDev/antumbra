import type { AgentWork, PieceWork } from "@antumbra/contract";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import type { CrewRow, MembershipRow, PieceRow, VoyageRow } from "#voyage-rows.ts";

export interface WorkLinks {
	readonly assignments: ReadonlyArray<{ readonly agentId: string; readonly pieceId: string }>;
	readonly crews: ReadonlyArray<CrewRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieces: ReadonlyArray<Pick<PieceRow, "id" | "title">>;
	readonly voyages: ReadonlyArray<Pick<VoyageRow, "id" | "name">>;
}

const pieceWork = (links: WorkLinks, pieceId: string): ReadonlyArray<PieceWork> => {
	const piece = links.pieces.find((row) => row.id === pieceId);
	if (piece === undefined) {
		return [];
	}
	return links.memberships
		.filter((membership) => membership.pieceId === pieceId)
		.flatMap((membership) => {
			const voyage = links.voyages.find((row) => row.id === membership.voyageId);
			return voyage === undefined
				? []
				: [
						{
							kind: "piece" as const,
							pieceId,
							pieceTitle: piece.title,
							voyageId: voyage.id,
							voyageName: voyage.name,
						},
					];
		});
};

export const workOf = (links: WorkLinks, agentId: string): ReadonlyArray<AgentWork> => {
	const assignments = links.assignments.filter((assignment) => assignment.agentId === agentId);
	if (assignments.length > 0) {
		return assignments.flatMap((assignment) => pieceWork(links, assignment.pieceId));
	}
	const voyages = links.crews
		.filter((crew) => crew.agentId === agentId && crew.role === CAPTAIN_ROLE)
		.flatMap((crew) => {
			const voyage = links.voyages.find((row) => row.id === crew.voyageId);
			return voyage === undefined ? [] : [{ kind: "voyage" as const, voyageId: voyage.id, voyageName: voyage.name }];
		});
	return voyages;
};
