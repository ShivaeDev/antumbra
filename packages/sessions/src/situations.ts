import type { ChangeRow, PieceChangeRow } from "@antumbra/changes";
import type { ChangeSituation, SessionSituation } from "@antumbra/contract";

export interface ChangeLinks {
	readonly assignments: ReadonlyArray<{
		readonly agentId: string;
		readonly pieceId: string;
	}>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
}

const situationsOf = (change: ChangeRow): ReadonlyArray<ChangeSituation> => [
	...(change.mergeable === "conflict" ? (["merge_conflicts"] as const) : []),
	...(change.checks === "red" ? (["checks_failed"] as const) : []),
	...(change.review === "changes_requested" ? (["unresolved_reviews"] as const) : []),
];

const addressableChanges = (changes: ReadonlyArray<ChangeRow>): ReadonlyMap<string, ChangeRow> =>
	new Map(changes.filter((change) => change.stage === "open" && change.externalId !== null).map((change) => [change.id, change]));

const producedChangeIds = (pieceChanges: ReadonlyArray<PieceChangeRow>, pieceId: string): ReadonlyArray<string> =>
	pieceChanges.filter((link) => link.pieceId === pieceId && link.purpose === "produces").map((link) => link.changeId);

const situationsForAgent = (links: ChangeLinks, open: ReadonlyMap<string, ChangeRow>, agentId: string): ReadonlyArray<SessionSituation> =>
	links.assignments
		.filter((assignment) => assignment.agentId === agentId)
		.flatMap((assignment) => producedChangeIds(links.pieceChanges, assignment.pieceId))
		.flatMap((changeId) => {
			const change = open.get(changeId);
			return change === undefined
				? []
				: situationsOf(change).map((situation) => ({
						changeId,
						reference: `#${change.externalId}`,
						situation,
					}));
		});

export const situationsByAgent = (links: ChangeLinks, agentIds: ReadonlyArray<string>): ReadonlyMap<string, ReadonlyArray<SessionSituation>> => {
	const open = addressableChanges(links.changes);
	return new Map(agentIds.map((agentId) => [agentId, situationsForAgent(links, open, agentId)]));
};
