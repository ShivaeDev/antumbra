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

export const workByAgent = (links: WorkLinks): ReadonlyMap<string, ReadonlyArray<AgentWork>> => {
	const pieces = new Map(links.pieces.map((piece) => [piece.id, piece]));
	const voyages = new Map(links.voyages.map((voyage) => [voyage.id, voyage]));
	const pieceWork = new Map<string, Array<PieceWork>>();
	for (const membership of links.memberships) {
		const piece = pieces.get(membership.pieceId);
		const voyage = voyages.get(membership.voyageId);
		if (piece !== undefined && voyage !== undefined) {
			const work = pieceWork.get(piece.id) ?? [];
			work.push({ kind: "piece", pieceId: piece.id, pieceTitle: piece.title, voyageId: voyage.id, voyageName: voyage.name });
			pieceWork.set(piece.id, work);
		}
	}
	const work = new Map<string, Array<AgentWork>>();
	for (const assignment of links.assignments) {
		const assigned = work.get(assignment.agentId) ?? [];
		assigned.push(...(pieceWork.get(assignment.pieceId) ?? []));
		work.set(assignment.agentId, assigned);
	}
	const assignedAgents = new Set(work.keys());
	for (const crew of links.crews) {
		const voyage = voyages.get(crew.voyageId);
		if (crew.role === CAPTAIN_ROLE && !assignedAgents.has(crew.agentId) && voyage !== undefined) {
			const commanded = work.get(crew.agentId) ?? [];
			commanded.push({ kind: "voyage", voyageId: voyage.id, voyageName: voyage.name });
			work.set(crew.agentId, commanded);
		}
	}
	return work;
};
