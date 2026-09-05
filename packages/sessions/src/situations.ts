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

export const situationsByAgent = (links: ChangeLinks, agentIds: ReadonlyArray<string>): ReadonlyMap<string, ReadonlyArray<SessionSituation>> => {
	const open = addressableChanges(links.changes);
	const produced = Map.groupBy(
		links.pieceChanges.filter((link) => link.purpose === "produces"),
		(link) => link.pieceId,
	);
	const situations = new Map<string, Array<SessionSituation>>(agentIds.map((agentId) => [agentId, []]));
	for (const assignment of links.assignments) {
		const assigned = situations.get(assignment.agentId);
		if (assigned === undefined) {
			continue;
		}
		for (const link of produced.get(assignment.pieceId) ?? []) {
			const change = open.get(link.changeId);
			if (change !== undefined) {
				assigned.push(...situationsOf(change).map((situation) => ({ changeId: change.id, reference: `#${change.externalId}`, situation })));
			}
		}
	}
	return situations;
};
